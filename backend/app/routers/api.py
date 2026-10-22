import uuid
import io
import re
import urllib.parse
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, Header, Response, File, UploadFile
from typing import Optional, List, Dict, Any
import pypdf

from ..database import db
from ..schemas.models import (
    LoginRequest, RegisterRequest, GoogleAuthRequest,
    ProfileCreate, ProfileUpdate, AssessmentSubmission,
    JobCreate, JobApplicationCreate, ApplicationStatusUpdate,
    CandidateSkillCreate,
    IdeaAnalyzeRequest, StartupCreate, ProposalShareRequest,
    InvestorInterestRequest, MeetingRequest, MessageCreate,
    GeminiIdeaPromptRequest, ShareToHrRequest, ConvertRoleToJobRequest, ShareToInvestorRequest
)
from ..security.auth import (
    hash_password, verify_password, create_access_token, verify_access_token
)
from ..matching.engine import calculate_candidate_job_match
from ..ai.copilot import analyze_startup_idea, analyze_investor_proposal
from ..ai.gemini_architect import synthesize_startup_architecture
from ..services.pdf_generator import (
    generate_business_proposal_pdf, generate_candidate_passport_pdf,
    generate_roles_specification_pdf, generate_investor_deep_pitch_pdf
)

router = APIRouter()

def _sanitize_profile(profile: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not profile:
        return None
    safe = dict(profile)
    safe.pop("password_hash", None)
    return safe

def _init_role_profile(role: str, user_id: str, bio: str = ""):
    if role == "candidate":
        db.insert("candidate_profiles", {
            "candidate_id": user_id,
            "education": "Not specified",
            "experience_years": 1,
            "portfolio_url": "",
            "target_role": "Software Engineer",
            "summary": bio or ""
        })
    elif role == "founder":
        db.insert("founder_profiles", {
            "founder_id": user_id,
            "company_name": "New Venture",
            "industry": "Technology",
            "stage": "Idea",
            "pitch_deck_url": ""
        })
    elif role == "hr":
        db.insert("hr_profiles", {
            "hr_id": user_id,
            "company_name": "Enterprise Co",
            "position": "Recruitment Lead",
            "website": ""
        })
    elif role == "investor":
        db.insert("investor_profiles", {
            "investor_id": user_id,
            "fund_name": "Angel Syndicate",
            "preferred_stages": ["Seed"],
            "target_industries": ["AI", "SaaS"],
            "min_ticket": 50000,
            "max_ticket": 250000
        })

# -------------------------------------------------------------
# 1. AUTHENTICATION & PROFILES
# -------------------------------------------------------------
@router.post("/auth/register")
def register(payload: RegisterRequest):
    # Check username uniqueness
    if db.find_one("profiles", lambda p: p.get("username", "").lower() == payload.username.lower()):
        raise HTTPException(status_code=400, detail="Username already in use")
    # Check email uniqueness
    if db.find_one("profiles", lambda p: p.get("email", "").lower() == payload.email.lower()):
        raise HTTPException(status_code=400, detail="Email already registered")

    new_profile = {
        "id": f"{payload.role[:4]}-{str(uuid.uuid4())[:6]}",
        "username": payload.username.lower(),
        "full_name": payload.full_name,
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "avatar_url": f"https://api.dicebear.com/7.x/initials/svg?seed={payload.full_name}",
        "bio": payload.bio or "",
        "auth_provider": "local",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.insert("profiles", new_profile)
    _init_role_profile(payload.role, new_profile["id"], payload.bio or "")
    db.log_audit("Account Registered", new_profile["id"], f"User {new_profile['username']} registered as {new_profile['role']}")
    
    token = create_access_token({
        "sub": new_profile["id"],
        "username": new_profile["username"],
        "role": new_profile["role"]
    })
    return {
        "token": token,
        "user": _sanitize_profile(new_profile),
        "message": "Account created successfully"
    }

@router.post("/auth/login")
def login(payload: LoginRequest):
    user = db.find_user(payload.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = create_access_token({
        "sub": user["id"],
        "username": user.get("username", ""),
        "role": user["role"]
    })
    db.log_audit("User Login", user["id"], f"User {user.get('username', user['id'])} logged in successfully")
    return {
        "token": token,
        "user": _sanitize_profile(user),
        "message": "Login successful"
    }

@router.post("/auth/google")
def google_auth(payload: GoogleAuthRequest):
    email = (payload.email or "").strip().lower()
    full_name = payload.full_name or "Google User"
    avatar_url = payload.avatar_url or f"https://api.dicebear.com/7.x/initials/svg?seed={full_name}"
    role = payload.role or "candidate"
    
    if not email:
        raise HTTPException(status_code=400, detail="Google account email is required")

    existing = db.find_one("profiles", lambda p: p.get("email", "").lower() == email)
    if existing:
        token = create_access_token({
            "sub": existing["id"],
            "username": existing.get("username", ""),
            "role": existing["role"]
        })
        db.log_audit("Google Login", existing["id"], f"User {existing['full_name']} logged in via Google")
        return {
            "token": token,
            "user": _sanitize_profile(existing),
            "is_new_user": False,
            "message": "Google authentication successful"
        }

    # Generate new user
    base_username = email.split("@")[0].replace(".", "").lower()
    candidate_username = base_username
    counter = 1
    while db.find_one("profiles", lambda p: p.get("username", "").lower() == candidate_username):
        candidate_username = f"{base_username}{counter}"
        counter += 1

    new_profile = {
        "id": f"{role[:4]}-{str(uuid.uuid4())[:6]}",
        "username": candidate_username,
        "full_name": full_name,
        "email": email,
        "password_hash": "",
        "role": role,
        "avatar_url": avatar_url,
        "bio": "Joined via Google Authentication",
        "auth_provider": "google",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.insert("profiles", new_profile)
    _init_role_profile(role, new_profile["id"], new_profile["bio"])
    db.log_audit("Google Signup", new_profile["id"], f"New user {new_profile['full_name']} created via Google")

    token = create_access_token({
        "sub": new_profile["id"],
        "username": new_profile["username"],
        "role": new_profile["role"]
    })
    return {
        "token": token,
        "user": _sanitize_profile(new_profile),
        "is_new_user": True,
        "message": "Google account created and logged in"
    }

@router.get("/auth/me")
def get_auth_me(
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
):
    uid = None
    if authorization and authorization.lower().startswith("bearer "):
        tok = authorization.split(" ", 1)[1].strip()
        claims = verify_access_token(tok)
        if claims and "sub" in claims:
            uid = claims["sub"]
    if not uid:
        uid = user_id or x_user_id or "cand-01"

    profile = db.find_one("profiles", lambda p: p["id"] == uid)
    if not profile:
        profile = db.get_table("profiles")[0]
    
    role = profile["role"]
    role_data = {}
    if role == "candidate":
        role_data = db.find_one("candidate_profiles", lambda cp: cp["candidate_id"] == profile["id"]) or {}
    elif role == "founder":
        role_data = db.find_one("founder_profiles", lambda fp: fp["founder_id"] == profile["id"]) or {}
    elif role == "hr":
        role_data = db.find_one("hr_profiles", lambda hp: hp["hr_id"] == profile["id"]) or {}
    elif role == "investor":
        role_data = db.find_one("investor_profiles", lambda ip: ip["investor_id"] == profile["id"]) or {}

    sanitized = _sanitize_profile(profile) or {}
    return {**sanitized, "details": role_data}

@router.post("/auth/profile")
def create_profile(payload: ProfileCreate):
    existing = db.find_one("profiles", lambda p: p["email"].lower() == payload.email.lower())
    if existing:
        return _sanitize_profile(existing)
    
    username = payload.username or payload.email.split("@")[0].replace(".", "").lower()
    pw_hash = hash_password(payload.password) if payload.password else hash_password("password123")
    new_profile = {
        "id": f"{payload.role[:4]}-{str(uuid.uuid4())[:6]}",
        "username": username,
        "full_name": payload.full_name,
        "email": payload.email,
        "password_hash": pw_hash,
        "role": payload.role,
        "avatar_url": f"https://api.dicebear.com/7.x/initials/svg?seed={payload.full_name}",
        "bio": payload.bio or "",
        "auth_provider": "local",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.insert("profiles", new_profile)
    _init_role_profile(payload.role, new_profile["id"], payload.bio or "")
    db.log_audit("Profile Created", new_profile["id"], f"User {new_profile['full_name']} registered as {new_profile['role']}")
    return _sanitize_profile(new_profile)

@router.get("/profiles/me")
def get_current_user_profile(user_id: Optional[str] = Query(None)):
    return get_auth_me(user_id=user_id)

@router.patch("/profiles/me")
def update_profile(payload: ProfileUpdate, user_id: Optional[str] = Query(None)):
    uid = user_id or "cand-01"
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = db.update("profiles", lambda p: p["id"] == uid, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Profile not found")
    return _sanitize_profile(updated)

@router.get("/profiles")
def list_profiles(role: Optional[str] = Query(None)):
    if role:
        return db.find_many("profiles", lambda p: p["role"] == role)
    return db.get_table("profiles")

# -------------------------------------------------------------
# 2. SKILLS & ASSESSMENTS (Section 2.1 & 10.1)
# -------------------------------------------------------------
@router.get("/skills")
def list_skills():
    return db.get_table("skills")

@router.get("/assessments")
def list_assessments(skill_id: Optional[str] = Query(None)):
    assessments = db.get_table("assessments")
    skills = {s["id"]: s for s in db.get_table("skills")}
    results = []
    for a in assessments:
        if skill_id and a.get("skill_id") != skill_id and a.get("id") != skill_id:
            continue
        s_obj = skills.get(a["skill_id"], {})
        results.append({
            "id": a["id"],
            "title": a["title"],
            "skill_id": a["skill_id"],
            "skill_name": s_obj.get("name", "Technical Skill"),
            "skill_slug": s_obj.get("slug", ""),
            "skill_icon": s_obj.get("icon", "⚡"),
            "skill_category": s_obj.get("category", "Languages"),
            "question_count": len(a.get("questions", [])),
            "passing_score": a.get("passing_score", 75.0),
            "duration_minutes": a.get("duration_minutes", 15)
        })
    return results

ASSESSMENT_ALIASES = {
    "sk-python-fastapi": "asm-01",
    "asm-python-fastapi": "asm-01",
    "python-fastapi": "asm-01",
    "sk-postgres-design": "asm-02",
    "asm-postgres-design": "asm-02",
    "postgres-design": "asm-02",
    "postgresql-database-design": "asm-02",
    "sk-dist-sys": "asm-distributed-systems",
    "dist-sys": "asm-distributed-systems",
    "sk-docker-k8s": "asm-docker-kubernetes",
    "docker-k8s": "asm-docker-kubernetes",
    "sk-redis": "asm-redis-caching",
    "sk-cloud-arch": "asm-cloud-architecture",
    "cloud-arch": "asm-cloud-architecture",
}

def _resolve_assessment(assessment_id: str):
    aid = assessment_id.lower().strip()
    clean_aid = aid.replace("asm-", "").replace("sk-", "")

    # Direct alias lookup
    if aid in ASSESSMENT_ALIASES:
        target_id = ASSESSMENT_ALIASES[aid]
        asm = db.find_one("assessments", lambda a: a["id"] == target_id)
        if asm:
            return asm
    if clean_aid in ASSESSMENT_ALIASES:
        target_id = ASSESSMENT_ALIASES[clean_aid]
        asm = db.find_one("assessments", lambda a: a["id"] == target_id)
        if asm:
            return asm

    # 1. Exact match on id or skill_id
    asm = db.find_one("assessments", lambda a: a["id"].lower() == aid or a["skill_id"].lower() == aid)
    if asm:
        return asm

    # 2. Match without asm- / sk- prefix
    asm = db.find_one("assessments", lambda a: a["id"].lower().replace("asm-", "") == clean_aid or a["skill_id"].lower().replace("sk-", "") == clean_aid)
    if asm:
        return asm

    # 3. Match via skills table (id, slug, name)
    skill = db.find_one("skills", lambda s: (
        s["id"].lower() == aid or
        s["id"].lower().replace("sk-", "") == clean_aid or
        s.get("slug", "").lower() == aid or
        s.get("slug", "").lower() == clean_aid or
        aid in s["name"].lower() or
        s["name"].lower() in aid or
        clean_aid in s["name"].lower() or
        clean_aid.replace("-", " ") in s["name"].lower() or
        s["name"].lower() in clean_aid.replace("-", " ")
    ))
    if skill:
        asm = db.find_one("assessments", lambda a: a["skill_id"] == skill["id"] or a["skill_id"].lower().replace("sk-", "") == skill["id"].lower().replace("sk-", ""))
        if asm:
            return asm

    # 4. Partial title match on assessment
    asm = db.find_one("assessments", lambda a: clean_aid in a["title"].lower() or aid in a["title"].lower())
    return asm

@router.get("/assessments/{assessment_id}")
def get_assessment(assessment_id: str):
    asm = _resolve_assessment(assessment_id)
    if not asm:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Return questions without exposing correct_index to prevent cheating
    safe_questions = []
    for q in asm.get("questions", []):
        safe_questions.append({
            "id": q["id"],
            "text": q["text"],
            "options": q["options"]
        })
    
    return {
        "id": asm["id"],
        "title": asm["title"],
        "skill_id": asm["skill_id"],
        "duration_minutes": asm["duration_minutes"],
        "passing_score": asm["passing_score"],
        "questions": safe_questions
    }

@router.get("/assessments/skill/{skill_id}")
def get_assessment_by_skill(skill_id: str):
    return get_assessment(skill_id)

@router.post("/assessments/{assessment_id}/attempts")
def submit_assessment(assessment_id: str, payload: AssessmentSubmission):
    asm = _resolve_assessment(assessment_id)
    if not asm:
        raise HTTPException(status_code=404, detail="Assessment not found")

    questions = asm.get("questions", [])
    total_q = len(questions)
    if total_q == 0:
        raise HTTPException(status_code=400, detail="Empty assessment")

    correct_count = 0
    feedback = []

    for idx, q in enumerate(questions):
        qid = q["id"]
        chosen = None
        # Flexible answer resolution:
        # Check direct key, index key, prefixed key, or suffix key
        if qid in payload.answers:
            chosen = payload.answers[qid]
        elif str(idx) in payload.answers:
            chosen = payload.answers[str(idx)]
        elif f"q{idx+1}" in payload.answers:
            chosen = payload.answers[f"q{idx+1}"]
        elif f"pyd_q{idx+1}" in payload.answers:
            chosen = payload.answers[f"pyd_q{idx+1}"]
        elif f"pg_q{idx+1}" in payload.answers or f"pgd_q{idx+1}" in payload.answers:
            chosen = payload.answers.get(f"pg_q{idx+1}") or payload.answers.get(f"pgd_q{idx+1}")
        else:
            for ans_k, ans_v in payload.answers.items():
                if ans_k.endswith(qid) or qid.endswith(ans_k):
                    chosen = ans_v
                    break

        correct = q.get("correct_index")
        try:
            is_correct = (chosen is not None and correct is not None and chosen == int(correct))
        except (ValueError, TypeError):
            is_correct = (chosen is not None and chosen == correct)
        if is_correct:
            correct_count += 1
        feedback.append({
            "question_id": qid,
            "is_correct": is_correct,
            "correct_option": correct,
            "chosen_option": chosen,
            "explanation": q.get("explanation", "")
        })

    score = round((correct_count / total_q) * 100.0, 1)
    passed = score >= asm.get("passing_score", 75.0)

    # Record Attempt
    attempt = db.insert("assessment_attempts", {
        "id": f"att-{str(uuid.uuid4())[:8]}",
        "candidate_id": payload.candidate_id,
        "assessment_id": assessment_id,
        "score": score,
        "passed": passed,
        "flags": payload.flags or ["clean_session"],
        "completed_at": datetime.now(timezone.utc).isoformat()
    })

    # If score >= 75%, mark skill as verified!
    skill_id = asm["skill_id"]
    if passed:
        existing_skill = db.find_one("candidate_skills", lambda cs: cs["candidate_id"] == payload.candidate_id and (cs["skill_id"] == skill_id or cs["skill_id"].lower() == skill_id.lower()))
        if existing_skill:
            db.update("candidate_skills", lambda cs: cs["id"] == existing_skill["id"] if "id" in existing_skill else (cs["candidate_id"] == payload.candidate_id and cs["skill_id"] == skill_id), {
                "assessment_score": score,
                "is_verified": True,
                "verified_at": datetime.now(timezone.utc).isoformat()
            })
        else:
            db.insert("candidate_skills", {
                "candidate_id": payload.candidate_id,
                "skill_id": skill_id,
                "assessment_score": score,
                "is_verified": True,
                "verified_at": datetime.now(timezone.utc).isoformat()
            })
        db.log_audit("Skill Verified", payload.candidate_id, f"Candidate passed {asm['title']} with {score}%. Badge granted.")
    else:
        db.log_audit("Skill Assessment Failed", payload.candidate_id, f"Candidate scored {score}% on {asm['title']} (Threshold: 75%).")

    skill_obj = db.find_one("skills", lambda s: s["id"] == skill_id)
    skill_name = skill_obj["name"] if skill_obj else asm["title"].replace(" Technical Quiz", "").replace(" Assessment", "")

    return {
        "attempt_id": attempt["id"],
        "score": score,
        "passed": passed,
        "correct_count": correct_count,
        "total_count": total_q,
        "passing_threshold": asm.get("passing_score", 75.0),
        "feedback": feedback,
        "verified": passed,
        "skill_name": skill_name,
        "skill_id": skill_id
    }

# -------------------------------------------------------------
# 3. VERIFIED SKILL PASSPORT & CANDIDATE VIEW (Section 15.1)
# -------------------------------------------------------------
@router.get("/candidate/passport")
def get_verified_skill_passport(candidate_id: Optional[str] = Query(None)):
    cid = candidate_id or "cand-01"
    cand = db.find_one("profiles", lambda p: p["id"] == cid)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    cand_profile = db.find_one("candidate_profiles", lambda cp: cp["candidate_id"] == cid) or {}
    cand_skills = db.find_many("candidate_skills", lambda cs: cs["candidate_id"] == cid and cs.get("is_verified", False))
    skills_map = {s["id"]: s for s in db.get_table("skills")}

    verified_list = []
    for cs in cand_skills:
        s_info = skills_map.get(cs["skill_id"], {})
        verified_list.append({
            "skill_id": cs["skill_id"],
            "name": s_info.get("name") or cs.get("skill_name") or cs["skill_id"],
            "category": s_info.get("category", "Technical"),
            "assessment_score": cs.get("assessment_score", 0),
            "verified_at": cs.get("verified_at"),
            "badge_hash": f"SHA256-{cs['skill_id']}-{cs.get('assessment_score')}"
        })

    return {
        "candidate": cand,
        "profile": cand_profile,
        "passport_id": f"PASSPORT-{cid}-VERIFIED",
        "verified_skills": verified_list,
        "total_verified": len(verified_list),
        "verification_status": "Active & Cryptographically Timestamped",
        "issued_at": datetime.now(timezone.utc).isoformat()
    }

@router.get("/candidate/{candidate_id}/passport/pdf")
def download_passport_pdf(candidate_id: str):
    cand = db.find_one("profiles", lambda p: p["id"] == candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    cand_skills = db.find_many("candidate_skills", lambda cs: cs["candidate_id"] == candidate_id and cs.get("is_verified", False))
    skills_map = {s["id"]: s for s in db.get_table("skills")}
    
    skills_list = []
    for cs in cand_skills:
        s_info = skills_map.get(cs["skill_id"], {})
        skills_list.append({
            "name": s_info.get("name") or cs.get("skill_name") or cs["skill_id"],
            "category": s_info.get("category", "General"),
            "assessment_score": cs.get("assessment_score", 0),
            "verified_at": cs.get("verified_at")
        })

    pdf_bytes = generate_candidate_passport_pdf(cand, skills_list)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={cand['full_name'].replace(' ', '_')}_Skill_Passport.pdf"}
    )

# -------------------------------------------------------------
# 4. JOBS & EXPLAINABLE MATCHING (Section 10.1 & 10.2)
# -------------------------------------------------------------
@router.post("/jobs")
def create_job(payload: JobCreate):
    sal_min = payload.salary_min or 80000
    sal_max = payload.salary_max or 150000
    new_job: Dict[str, Any] = {
        "id": f"job-{str(uuid.uuid4())[:6]}",
        "created_by": payload.created_by or "hr-01",
        "company_name": payload.company_name,
        "company": payload.company_name,
        "title": payload.title,
        "description": payload.description,
        "experience_level": payload.experience_level or "Mid-Senior",
        "salary_min": sal_min,
        "salary_max": sal_max,
        "salary_range": f"${sal_min:,} - ${sal_max:,}",
        "location": payload.location or "San Francisco, CA / Hybrid",
        "employment_type": payload.employment_type or "full-time",
        "job_type": payload.employment_type or "full-time",
        "status": "Active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.insert("jobs", new_job)

    # Insert required skills from required_skills or skills
    skills_list = payload.required_skills or payload.skills or []
    skills_name_map = {s["name"].lower().strip(): s["id"] for s in db.get_table("skills")}
    
    saved_skills = []
    for req in skills_list:
        is_req = req.get("is_required", True)
        default_weight = 2.0 if is_req else 1.0
        s_name = (req.get("skill_name") or req.get("name") or req.get("skill_id") or "Skill").strip()

        # Link to existing catalog skill: prioritize real explicit skill_id if provided
        raw_explicit_id = req.get("skill_id")
        explicit_id = None if (raw_explicit_id or "").startswith(("mand-", "pref-")) else raw_explicit_id
        catalog_id = None
        if explicit_id and db.find_one("skills", lambda s: s["id"] == explicit_id):
            catalog_id = explicit_id
        elif s_name.lower() in skills_name_map:
            catalog_id = skills_name_map[s_name.lower()]
        else:
            for s_cat_name, s_cat_id in skills_name_map.items():
                if len(s_cat_name) >= 3 and (s_cat_name in s_name.lower() or s_name.lower() in s_cat_name):
                    catalog_id = s_cat_id
                    break

        assigned_skill_id = catalog_id or explicit_id or f"sk-{str(uuid.uuid4())[:6]}"

        # Ensure skill exists in database skills catalog
        if not db.find_one("skills", lambda s: s["id"] == assigned_skill_id):
            db.insert("skills", {
                "id": assigned_skill_id,
                "name": s_name,
                "category": "Technical",
                "description": f"Verified competency in {s_name}"
            })
            skills_name_map[s_name.lower()] = assigned_skill_id

        req_row = {
            "job_id": new_job["id"],
            "skill_id": assigned_skill_id,
            "skill_name": s_name,
            "is_required": is_req,
            "weight": req.get("weight", default_weight)
        }
        db.insert("job_required_skills", req_row)
        saved_skills.append({
            **req_row,
            "name": s_name,
            "skill": {"id": assigned_skill_id, "name": s_name, "category": "Technical"}
        })

    new_job["required_skills"] = saved_skills
    new_job["skills"] = saved_skills
    new_job["company"] = new_job.get("company_name")
    new_job["job_type"] = new_job.get("employment_type", "full-time")
    new_job["salary_range"] = f"${new_job.get('salary_min', 80000):,} - ${new_job.get('salary_max', 150000):,}"
    db.save()

    # Pre-calculate match score for candidate feed compatibility
    try:
        new_job["match"] = calculate_candidate_job_match("cand-01", new_job["id"])
    except Exception:
        new_job["match"] = None

    db.log_audit("Job Created", payload.created_by or "hr-01", f"Job {payload.title} created for {payload.company_name}")
    return new_job

@router.get("/jobs")
@router.get("/jobs/feed")
def list_jobs(candidate_id: Optional[str] = Query(None)):
    jobs = db.find_many("jobs", lambda j: j.get("status") == "Active")
    # Sort newest first
    jobs.sort(key=lambda j: j.get("created_at", ""), reverse=True)
    skills_catalog = {s["id"]: s for s in db.get_table("skills")}
    cid = candidate_id or "cand-01"
    
    results = []
    for j in jobs:
        reqs = db.find_many("job_required_skills", lambda r: r["job_id"] == j["id"])
        job_skills = []
        for r in reqs:
            s_data = skills_catalog.get(r["skill_id"], {})
            resolved_name = r.get("skill_name") or s_data.get("name", r["skill_id"])
            job_skills.append({
                "skill_id": r["skill_id"],
                "skill_name": resolved_name,
                "name": resolved_name,
                "weight": r.get("weight", 1.0),
                "is_required": r.get("is_required", True),
                "skill": {"id": r["skill_id"], "name": resolved_name, "category": s_data.get("category", "General")}
            })
        
        match_info = None
        try:
            match_info = calculate_candidate_job_match(cid, j["id"])
        except Exception:
            match_info = None

        results.append({
            **j,
            "company": j.get("company") or j.get("company_name") or "Enterprise Partner",
            "company_name": j.get("company_name") or j.get("company") or "Enterprise Partner",
            "job_type": j.get("job_type") or j.get("employment_type") or "full-time",
            "employment_type": j.get("employment_type") or j.get("job_type") or "full-time",
            "salary_range": j.get("salary_range") or (f"${j.get('salary_min', 80000):,} - ${j.get('salary_max', 150000):,}" if j.get("salary_min") else "$120,000 - $160,000"),
            "required_skills": job_skills,
            "skills": job_skills,
            "match": match_info
        })
    return results

@router.get("/jobs/my-jobs")
def get_my_jobs(recruiter_id: Optional[str] = Query(None)):
    rid = recruiter_id or "hr-01"
    jobs = db.find_many("jobs", lambda j: j.get("created_by") == rid or j.get("status") == "Active")
    # Sort newest first
    jobs.sort(key=lambda j: j.get("created_at", ""), reverse=True)
    skills_catalog = {s["id"]: s for s in db.get_table("skills")}
    results = []
    for j in jobs:
        reqs = db.find_many("job_required_skills", lambda r: r["job_id"] == j["id"])
        job_skills = []
        for r in reqs:
            s_obj = skills_catalog.get(r["skill_id"], {})
            resolved_name = r.get("skill_name") or s_obj.get("name", r["skill_id"])
            job_skills.append({
                "skill_id": r["skill_id"],
                "skill_name": resolved_name,
                "name": resolved_name,
                "is_required": r.get("is_required", True),
                "weight": r.get("weight", 1.0),
                "skill": {"id": r["skill_id"], "name": resolved_name, "category": s_obj.get("category", "General")}
            })
        apps = db.find_many("job_applications", lambda a: a["job_id"] == j["id"])
        results.append({
            **j,
            "skills": job_skills,
            "required_skills": job_skills,
            "applicants_count": len(apps)
        })
    return results

@router.get("/jobs/{job_id}")
def get_job_detail(job_id: str, candidate_id: Optional[str] = Query(None)):
    job = db.find_one("jobs", lambda j: j["id"] == job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    cid = candidate_id or "cand-01"
    match_data = calculate_candidate_job_match(cid, job_id)
    skills_req = db.find_many("job_required_skills", lambda r: r["job_id"] == job_id)
    skills_catalog = {s["id"]: s for s in db.get_table("skills")}
    attached = []
    for r in skills_req:
        s_obj = skills_catalog.get(r["skill_id"], {})
        attached.append({
            "skill_id": r["skill_id"],
            "is_required": r.get("is_required", True),
            "weight": r.get("weight", 1.0),
            "skill": {"id": r["skill_id"], "name": s_obj.get("name", r["skill_id"]), "category": s_obj.get("category", "General")}
        })
    return {
        **job,
        "skills": attached,
        "gap_analysis": match_data
    }

@router.get("/jobs/{job_id}/matches")
def get_job_candidate_matches(job_id: str):
    """Returns all candidates ranked by explainable match score for this job."""
    candidates = db.find_many("profiles", lambda p: p["role"] == "candidate")
    matches = []
    for cand in candidates:
        match_data = calculate_candidate_job_match(cand["id"], job_id)
        cand_profile = db.find_one("candidate_profiles", lambda cp: cp["candidate_id"] == cand["id"]) or {}
        matches.append({
            "candidate": cand,
            "profile": cand_profile,
            "match": match_data
        })
    # Sort descending by match score
    matches.sort(key=lambda m: m["match"]["score"], reverse=True)
    return matches

@router.post("/jobs/{job_id}/applications")
@router.post("/jobs/{job_id}/apply")
def apply_for_job(job_id: str, payload: JobApplicationCreate):
    cid = payload.candidate_id or "cand-01"
    existing = db.find_one("job_applications", lambda a: a["job_id"] == job_id and a["candidate_id"] == cid)
    
    match_info = calculate_candidate_job_match(cid, job_id)
    locked_score = payload.match_score if payload.match_score is not None else match_info["score"]

    if existing:
        updates = {
            "match_score": locked_score,
            "notes": payload.notes or existing.get("notes", "")
        }
        if payload.learning_commitment:
            updates["learning_commitment"] = payload.learning_commitment
        updated = db.update("job_applications", lambda a: a["id"] == existing["id"], updates)
        return updated

    new_app = {
        "id": f"app-{str(uuid.uuid4())[:6]}",
        "job_id": job_id,
        "candidate_id": cid,
        "status": "applied",
        "notes": payload.notes or "Candidate submitted application with Verified Skill Passport",
        "learning_commitment": payload.learning_commitment or "",
        "match_score": locked_score,
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "interview_date": None
    }
    db.insert("job_applications", new_app)
    db.log_audit("Job Application", cid, f"Candidate applied to Job {job_id} with locked score {locked_score}%")
    return new_app

@router.get("/jobs/{job_id}/candidates")
def get_job_candidates(job_id: str):
    apps = db.find_many("job_applications", lambda a: a["job_id"] == job_id)
    profiles_map = {p["id"]: p for p in db.get_table("profiles")}
    results = []
    for a in apps:
        cand = profiles_map.get(a["candidate_id"], {})
        score = a.get("match_score")
        if score is None:
            match_info = calculate_candidate_job_match(a["candidate_id"], job_id)
            score = match_info["score"]
        results.append({
            "id": a["id"],
            "job_id": job_id,
            "candidate_id": a["candidate_id"],
            "match_score": score,
            "status": a.get("status", "applied"),
            "learning_commitment": a.get("learning_commitment", ""),
            "notes": a.get("notes", ""),
            "applied_at": a.get("applied_at", a.get("created_at")),
            "created_at": a.get("created_at", a.get("applied_at")),
            "profiles": _sanitize_profile(cand),
            "profile": _sanitize_profile(cand)
        })
    results.sort(key=lambda c: c.get("match_score", 0), reverse=True)
    return results

@router.patch("/jobs/{job_id}/applications/{candidate_id}")
def update_candidate_job_application(job_id: str, candidate_id: str, payload: Dict[str, Any]):
    app = db.find_one("job_applications", lambda a: a["job_id"] == job_id and a["candidate_id"] == candidate_id)
    if not app:
        app = db.find_one("job_applications", lambda a: a["id"] == candidate_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    new_status = payload.get("status", app.get("status", "applied"))
    updates = {"status": new_status}
    if "notes" in payload:
        updates["notes"] = payload["notes"]
    updated = db.update("job_applications", lambda a: a["id"] == app["id"], updates)
    db.log_audit("Application Status Updated", app["candidate_id"], f"Job {job_id} application status set to {new_status}")
    return updated

@router.get("/applications/me")
@router.get("/users/me/applications")
def get_my_applications(candidate_id: Optional[str] = Query(None)):
    cid = candidate_id or "cand-01"
    apps = db.find_many("job_applications", lambda a: a["candidate_id"] == cid)
    jobs_map = {j["id"]: j for j in db.get_table("jobs")}

    results = []
    for a in apps:
        j = jobs_map.get(a["job_id"], {})
        score = a.get("match_score")
        if score is None:
            match_info = calculate_candidate_job_match(cid, a["job_id"])
            score = match_info["score"]
        results.append({
            **a,
            "match_score": score,
            "jobs": j,
            "job": j,
            "job_title": j.get("title", "Software Role"),
            "company_name": j.get("company_name", "Technology Co"),
            "location": j.get("location", "Remote"),
            "salary": f"${j.get('salary_min', 0):,} - ${j.get('salary_max', 0):,}"
        })
    return results

@router.get("/applications/job/{job_id}")
def get_job_applications(job_id: str):
    return get_job_candidates(job_id)

@router.patch("/applications/{app_id}/status")
def update_application_status(app_id: str, payload: ApplicationStatusUpdate):
    app = db.find_one("job_applications", lambda a: a["id"] == app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    updates = {"status": payload.status}
    if payload.notes:
        updates["notes"] = payload.notes
    if payload.interview_date:
        updates["interview_date"] = payload.interview_date
        db.insert("meetings", {
            "id": f"mtg-{str(uuid.uuid4())[:6]}",
            "requester_id": "hr-01",
            "recipient_id": app["candidate_id"],
            "meeting_type": "Technical Interview",
            "scheduled_at": payload.interview_date,
            "status": "Confirmed",
            "meeting_link": "https://meet.google.com/interview-session",
            "agenda": f"Role interview for stage: {payload.status}"
        })

    updated = db.update("job_applications", lambda a: a["id"] == app_id, updates)
    db.log_audit("Application Stage Updated", app["candidate_id"], f"Application {app_id} stage set to {payload.status}")
    return updated

# -------------------------------------------------------------
# CANDIDATE RESUME PARSING & COMPETENCY MANAGEMENT (SkillBridge)
# -------------------------------------------------------------
@router.post("/resumes/parse")
async def parse_resume(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    try:
        content = await file.read()
        reader = pypdf.PdfReader(io.BytesIO(content))
        full_text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                full_text += t + " "

        full_text_lower = full_text.lower()
        skills = db.get_table("skills")
        extracted_skills = []

        # Synonym and alias mapping
        skill_patterns = {
            "sk-01": [r"\bpython\b", r"\bfastapi\b"],
            "sk-02": [r"\bpostgres\b", r"\bpostgresql\b", r"\bsql\b", r"\bdatabase\b"],
            "sk-03": [r"\bjavascript\b", r"\breact\b", r"\bfrontend\b", r"\btypescript\b", r"\bnode\b"],
            "sk-04": [r"\bai\b", r"\bllm\b", r"\bmachine learning\b", r"\bdeep learning\b"],
            "sk-05": [r"\bdocker\b", r"\bkubernetes\b", r"\bcloud\b", r"\baws\b", r"\bdevops\b"],
            "sk-06": [r"\bsecurity\b", r"\barchitecture\b", r"\bapi\b", r"\bmicroservices\b"],
            "sk-cpp": [r"\bc\+\+\b", r"\bcpp\b"],
            "sk-python": [r"\bpython\b"],
            "sk-java": [r"\bjava\b"],
            "sk-js": [r"\bjavascript\b", r"\bjs\b"],
            "sk-c": [r"\bc programming\b", r"\blinux c\b"],
            "sk-html": [r"\bhtml\b", r"\bhtml5\b"],
            "sk-css": [r"\bcss\b", r"\bcss3\b", r"\btailwind\b"],
            "sk-react": [r"\breact\b", r"\breactjs\b"],
            "sk-sql": [r"\bsql\b", r"\bqueries\b", r"\bmysql\b", r"\bpostgres\b"],
            "sk-git": [r"\bgit\b", r"\bgithub\b", r"\bgitlab\b"]
        }

        matched_ids = set()
        for s in skills:
            sid = s["id"]
            pats = skill_patterns.get(sid, [r"\b" + re.escape(s["name"].lower()) + r"\b"])
            for pat in pats:
                if re.search(pat, full_text_lower):
                    matched_ids.add(sid)
                    extracted_skills.append({
                        "id": s["id"],
                        "name": s["name"],
                        "category": s.get("category", "Technical")
                    })
                    break

        return {
            "filename": file.filename,
            "text_length": len(full_text),
            "extracted_skills": extracted_skills
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

@router.get("/users/me/skills")
@router.get("/candidate/skills")
def get_user_skills(candidate_id: Optional[str] = Query(None)):
    cid = candidate_id or "cand-01"
    cand_skills = db.find_many("candidate_skills", lambda cs: cs["candidate_id"] == cid)
    skills_catalog = {s["id"]: s for s in db.get_table("skills")}
    results = []
    for cs in cand_skills:
        s_obj = skills_catalog.get(cs["skill_id"], {
            "id": cs["skill_id"],
            "name": cs.get("skill_name") or cs["skill_id"],
            "category": "Technical"
        })
        score = cs.get("assessment_score", cs.get("quiz_score"))
        skill_display_name = s_obj.get("name") or cs.get("skill_name") or cs["skill_id"]
        results.append({
            "id": cs.get("id", f"cs-{cs['skill_id']}"),
            "candidate_id": cid,
            "skill_id": cs["skill_id"],
            "name": skill_display_name,
            "skill_name": skill_display_name,
            "category": s_obj.get("category", "Technical"),
            "proficiency_level": cs.get("proficiency_level", "intermediate"),
            "years_experience": cs.get("years_experience", 1.0),
            "quiz_score": score,
            "assessment_score": score,
            "is_verified": cs.get("is_verified", (score is not None and score >= 75.0)),
            "verified_at": cs.get("verified_at"),
            "skill": s_obj
        })
    return results

@router.post("/users/me/skills")
@router.post("/candidate/skills")
def add_user_skill(payload: CandidateSkillCreate, candidate_id: Optional[str] = Query(None)):
    cid = candidate_id or "cand-01"
    target_skill_id = payload.skill_id
    skill_name = payload.skill_name or ""

    # Resolve skill in catalog or insert new
    matched_skill = None
    if target_skill_id:
        tid = target_skill_id.lower().strip()
        matched_skill = db.find_one("skills", lambda s: s.get("id", "").lower() == tid or s.get("slug", "").lower() == tid or s.get("name", "").lower() == tid)
    if not matched_skill and skill_name:
        sname_clean = skill_name.lower().strip()
        matched_skill = db.find_one("skills", lambda s: s.get("name", "").lower() == sname_clean or s.get("slug", "").lower() == sname_clean or s.get("id", "").lower() == sname_clean)

    if matched_skill:
        target_skill_id = matched_skill["id"]
        if not skill_name:
            skill_name = matched_skill.get("name", target_skill_id)
    else:
        if not target_skill_id:
            safe_slug = "".join(c if c.isalnum() else "-" for c in (skill_name or "skill").lower()).strip("-")
            target_skill_id = f"sk-{safe_slug[:24]}"
        new_skill = {
            "id": target_skill_id,
            "name": skill_name or target_skill_id,
            "category": "Technical",
            "description": f"Verified competency in {skill_name or target_skill_id}"
        }
        db.insert("skills", new_skill)
        matched_skill = new_skill

    existing = db.find_one("candidate_skills", lambda cs: cs["candidate_id"] == cid and (cs["skill_id"] == target_skill_id or cs.get("skill_name", "").lower() == (skill_name or "").lower()))

    score = payload.assessment_score if payload.assessment_score is not None else payload.quiz_score
    is_verified = payload.is_verified or (score is not None and score >= 75.0)

    data: Dict[str, Any] = {
        "candidate_id": cid,
        "skill_id": target_skill_id,
        "skill_name": skill_name or (matched_skill.get("name") if matched_skill else target_skill_id),
        "proficiency_level": payload.proficiency_level or "intermediate",
        "years_experience": payload.years_experience or 1.0
    }
    if score is not None:
        data["assessment_score"] = score
        data["quiz_score"] = score
        data["is_verified"] = is_verified
        data["verified_at"] = datetime.now(timezone.utc).isoformat()
    elif existing:
        data["assessment_score"] = existing.get("assessment_score")
        data["quiz_score"] = existing.get("quiz_score")
        data["is_verified"] = existing.get("is_verified", False)
        data["verified_at"] = existing.get("verified_at")

    if existing:
        updated = db.update("candidate_skills", lambda cs: cs["candidate_id"] == cid and (cs["skill_id"] == target_skill_id or cs.get("id") == existing.get("id")), data)
        return updated
    else:
        data["id"] = f"cs-{str(uuid.uuid4())[:6]}"
        inserted = db.insert("candidate_skills", data)
        return inserted

@router.delete("/users/me/skills/{skill_id}")
@router.delete("/candidate/skills/{skill_id}")
def delete_user_skill(skill_id: str, candidate_id: Optional[str] = Query(None)):
    cid = candidate_id or "cand-01"
    clean_id = urllib.parse.unquote(skill_id).lower().strip()
    import re
    clean_slug = re.sub(r'[^a-z0-9]', '', clean_id.replace('sk-', ''))

    def matches_cs(cs):
        if cs.get("candidate_id") != cid:
            return False
        c_id = cs.get("skill_id", "").lower().strip()
        c_rec_id = cs.get("id", "").lower().strip()
        c_name = (cs.get("skill_name") or cs.get("name") or "").lower().strip()
        c_slug = re.sub(r'[^a-z0-9]', '', (c_name or c_id).replace('sk-', ''))
        return c_id == clean_id or c_rec_id == clean_id or c_name == clean_id or (clean_slug and c_slug == clean_slug)

    deleted = db.delete("candidate_skills", matches_cs)
    if not deleted:
        skill = db.find_one("skills", lambda s: s["id"].lower() == clean_id or s.get("name", "").lower() == clean_id or s.get("slug", "").lower() == clean_id or (clean_slug and re.sub(r'[^a-z0-9]', '', s.get("slug", "").lower()) == clean_slug))
        if skill:
            deleted = db.delete("candidate_skills", lambda cs: cs["candidate_id"] == cid and cs["skill_id"] == skill["id"])
    return {"success": True, "message": "Competency removed from profile"}


# -------------------------------------------------------------
# 5. FOUNDER & AI STARTUP COPILOT (Section 10.3 & 13)
# -------------------------------------------------------------
@router.post("/ideas/analyze")
def run_ai_idea_analysis(payload: IdeaAnalyzeRequest):
    """AI Startup Copilot: Generates structured business breakdown & feasibility analysis."""
    analysis = analyze_startup_idea(payload.model_dump())
    return analysis

@router.post("/startups")
def create_startup(payload: StartupCreate):
    new_stp = {
        "id": f"stp-{str(uuid.uuid4())[:6]}",
        "founder_id": payload.founder_id,
        "name": payload.name,
        "tagline": payload.tagline,
        "stage": payload.stage,
        "industry": payload.industry,
        "readiness_score": 88.0,
        "pitch": payload.pitch,
        "valuation_ask": payload.valuation_ask,
        "team_count": payload.team_count,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.insert("startups", new_stp)
    db.log_audit("Startup Created", payload.founder_id, f"Startup {payload.name} created")
    return new_stp

@router.get("/startups")
def list_startups():
    return db.get_table("startups")

@router.get("/startups/{startup_id}/proposal/pdf")
def download_startup_proposal_pdf(startup_id: str):
    stp = db.find_one("startups", lambda s: s["id"] == startup_id)
    if not stp:
        raise HTTPException(status_code=404, detail="Startup not found")

    # Generate full analysis for PDF
    analysis = analyze_startup_idea({
        "title": stp["name"],
        "industry": stp["industry"],
        "problem": "Operational bottlenecks and lack of transparent verification.",
        "solution": stp.get("pitch", "High performance AI software."),
        "target_customers": "Enterprise and high-growth organizations.",
        "business_model": "SaaS recurring licenses.",
        "funding_assumptions": stp.get("valuation_ask", "$1,000,000 Seed")
    })

    pdf_bytes = generate_business_proposal_pdf(stp, analysis)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={stp['name'].replace(' ', '_')}_Business_Proposal.pdf"}
    )

@router.post("/proposals/{startup_id}/share")
def share_proposal(startup_id: str, payload: ProposalShareRequest):
    new_share = {
        "id": f"prop-{str(uuid.uuid4())[:6]}",
        "startup_id": startup_id,
        "founder_id": payload.founder_id,
        "investor_id": payload.investor_id,
        "status": "Shared & Active",
        "shared_at": datetime.now(timezone.utc).isoformat(),
        "ai_summary": "Confidential proposal shared with verified institutional investor.",
        "risk_score": "Moderate"
    }
    db.insert("startup_proposals", new_share)
    db.log_audit("Proposal Shared", payload.founder_id, f"Proposal for {startup_id} shared with Investor {payload.investor_id}")
    return new_share

# -------------------------------------------------------------
# 6. INVESTOR & SHARKS MODE (Section 2.4 & 10.4)
# -------------------------------------------------------------
@router.get("/investor/proposals/{startup_id}/ai-analysis")
def get_investor_proposal_ai_analysis(startup_id: str):
    stp = db.find_one("startups", lambda s: s["id"] == startup_id)
    if not stp:
        raise HTTPException(status_code=404, detail="Startup not found")

    analysis = analyze_investor_proposal({
        "startup_name": stp["name"],
        "industry": stp["industry"],
        "stage": stp["stage"],
        "pitch": stp["pitch"],
        "valuation_ask": stp.get("valuation_ask", "$1,000,000")
    })
    return analysis

@router.post("/investor-interests")
def express_investor_interest(payload: InvestorInterestRequest):
    new_interest = {
        "id": f"int-{str(uuid.uuid4())[:6]}",
        "investor_id": payload.investor_id,
        "startup_id": payload.startup_id,
        "status": "Interested / Pitch Call Requested",
        "note": payload.note,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.insert("investor_interests", new_interest)
    
    stp = db.find_one("startups", lambda s: s["id"] == payload.startup_id)
    if stp:
        # Schedule meeting request
        db.insert("meetings", {
            "id": f"mtg-{str(uuid.uuid4())[:6]}",
            "requester_id": payload.investor_id,
            "recipient_id": stp["founder_id"],
            "meeting_type": "Shark Pitch & Investment Discussion",
            "scheduled_at": datetime.now(timezone.utc).isoformat(),
            "status": "Pending Confirmation",
            "meeting_link": "https://meet.google.com/shark-pitch-call",
            "agenda": payload.note
        })

    db.log_audit("Investor Interest", payload.investor_id, f"Investor expressed interest in {payload.startup_id}")
    return new_interest

@router.get("/investor/interests")
def list_investor_interests(investor_id: Optional[str] = Query(None)):
    if investor_id:
        return db.find_many("investor_interests", lambda i: i["investor_id"] == investor_id)
    return db.get_table("investor_interests")

# -------------------------------------------------------------
# 7. MEETINGS, AUDIT & PLATFORM STATS
# -------------------------------------------------------------
@router.post("/meetings")
def create_meeting(payload: MeetingRequest):
    new_meeting = {
        "id": f"mtg-{str(uuid.uuid4())[:6]}",
        "requester_id": payload.requester_id,
        "recipient_id": payload.recipient_id,
        "meeting_type": payload.meeting_type,
        "scheduled_at": payload.scheduled_at,
        "status": "Confirmed",
        "meeting_link": payload.meeting_link,
        "agenda": payload.agenda
    }
    db.insert("meetings", new_meeting)
    db.log_audit("Meeting Scheduled", payload.requester_id, f"Meeting with {payload.recipient_id} on {payload.scheduled_at}")
    return new_meeting

@router.get("/meetings")
def list_meetings(user_id: Optional[str] = Query(None)):
    if user_id:
        return db.find_many("meetings", lambda m: m["requester_id"] == user_id or m["recipient_id"] == user_id)
    return db.get_table("meetings")

@router.get("/audit-logs")
def list_audit_logs():
    return db.get_table("audit_logs")

@router.get("/stats")
def get_platform_stats():
    candidates = db.find_many("profiles", lambda p: p["role"] == "candidate")
    founders = db.find_many("profiles", lambda p: p["role"] == "founder")
    hr_reps = db.find_many("profiles", lambda p: p["role"] == "hr")
    investors = db.find_many("profiles", lambda p: p["role"] == "investor")
    verified_skills = db.find_many("candidate_skills", lambda cs: cs.get("is_verified", False))
    jobs = db.find_many("jobs", lambda j: j.get("status") == "Active")
    startups = db.get_table("startups")

    return {
        "candidate_count": len(candidates),
        "founder_count": len(founders),
        "hr_count": len(hr_reps),
        "investor_count": len(investors),
        "verified_skills_count": len(verified_skills),
        "active_jobs_count": len(jobs),
        "startups_count": len(startups)
    }

# -------------------------------------------------------------
# 8. GEMINI PRO AI CHATBOT & SHARING WORKSPACES
# -------------------------------------------------------------
@router.post("/chat/gemini-pro")
def chat_gemini_pro(payload: GeminiIdeaPromptRequest):
    """
    Gemini Pro AI Business Architect:
    Processes the founder's idea and generates:
    - Step-by-Step Strategic Roadmap
    - Job Roles Required with 75/25 Skills
    - Investment Required & Runway Allocation
    - Project Scope (TAM/SAM/SOM, MVP Boundaries)
    - Deep Explanation of Project Idea
    """
    fid = payload.founder_id or "found-01"
    founder_profile = db.find_one("profiles", lambda p: p["id"] == fid) or {
        "id": fid,
        "full_name": payload.founder_name or "Sarah Lin",
        "email": payload.founder_email or "sarah.lin@ecotrace.ai"
    }

    # Run Gemini synthesis
    analysis = synthesize_startup_architecture(
        payload.idea,
        founder_name=founder_profile.get("full_name", "Founder"),
        startup_name=payload.startup_name
    )

    # Persist session for PDF export and retrieval
    session_id = f"gem-{str(uuid.uuid4())[:8]}"
    db.insert("gemini_sessions", {
        "id": session_id,
        "founder_id": fid,
        "idea": payload.idea,
        "analysis": analysis,
        "founder": {
            "name": founder_profile.get("full_name", "Sarah Lin"),
            "email": founder_profile.get("email", "founder@idea2impact.io")
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    db.log_audit("Gemini Pro Idea Analyzed", fid, f"Generated business architecture for '{analysis.get('title')}'")

    return {
        "session_id": session_id,
        "analysis": analysis,
        "founder": {
            "id": fid,
            "name": founder_profile.get("full_name", "Sarah Lin"),
            "email": founder_profile.get("email", "founder@idea2impact.io")
        }
    }

@router.get("/founder/roles-pdf/{session_id}")
def download_roles_pdf_by_session(session_id: str):
    """Generates and downloads the Roles & Skills PDF by session ID."""
    session = db.find_one("gemini_sessions", lambda s: s["id"] == session_id)
    if not session:
        # Check if it was a shared hiring request
        hr_req = db.find_one("shared_hiring_requests", lambda r: r.get("session_id") == session_id or r.get("id") == session_id)
        if hr_req:
            founder_info = {"name": hr_req.get("founder_name", "Founder"), "email": hr_req.get("founder_email", "")}
            analysis_data = {
                "title": hr_req.get("idea_title", "Startup Venture"),
                "industry": hr_req.get("industry", "Technology"),
                "required_job_roles": hr_req.get("roles", [])
            }
            pdf_bytes = generate_roles_specification_pdf(founder_info, analysis_data)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=Team_Roles_Specification.pdf"}
            )
        raise HTTPException(status_code=404, detail="Session not found")

    founder_info = session.get("founder", {"name": "Sarah Lin", "email": "founder@idea2impact.io"})
    analysis = session.get("analysis", {})
    pdf_bytes = generate_roles_specification_pdf(founder_info, analysis)
    safe_title = re.sub(r"[^\w\-]", "_", analysis.get("title", "Startup"))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={safe_title}_Team_Roles_Spec.pdf"}
    )

@router.post("/founder/export-roles-pdf")
def export_roles_pdf_direct(payload: Dict[str, Any]):
    """Direct POST export for Roles & Skills PDF with JSON payload."""
    founder_info = payload.get("founder", {"name": "Sarah Lin", "email": "founder@idea2impact.io"})
    analysis = payload.get("analysis", payload)
    pdf_bytes = generate_roles_specification_pdf(founder_info, analysis)
    safe_title = re.sub(r"[^\w\-]", "_", analysis.get("title", "Startup"))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={safe_title}_Team_Roles_Spec.pdf"}
    )

@router.get("/founder/investor-pdf/{session_id}")
def download_investor_pdf_by_session(session_id: str):
    """Generates and downloads the Deep Explanation & Investor Pitch PDF by session ID."""
    session = db.find_one("gemini_sessions", lambda s: s["id"] == session_id)
    if not session:
        # Check if it was a shared pitch
        pitch = db.find_one("shared_founder_pitches", lambda p: p.get("session_id") == session_id or p.get("id") == session_id)
        if pitch:
            founder_info = {"name": pitch.get("founder_name", "Founder"), "email": pitch.get("founder_email", "")}
            analysis_data = {
                "title": pitch.get("startup_name", "Startup Venture"),
                "tagline": pitch.get("tagline", ""),
                "industry": pitch.get("industry", "Technology"),
                "deep_explanation": pitch.get("deep_explanation", {}),
                "project_scope": pitch.get("project_scope", {}),
                "investment_required": pitch.get("investment_required", {}),
                "execution_roadmap": pitch.get("execution_roadmap", [])
            }
            pdf_bytes = generate_investor_deep_pitch_pdf(founder_info, analysis_data)
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=Venture_Proposal_Pitch.pdf"}
            )
        raise HTTPException(status_code=404, detail="Session not found")

    founder_info = session.get("founder", {"name": "Sarah Lin", "email": "founder@idea2impact.io"})
    analysis = session.get("analysis", {})
    pdf_bytes = generate_investor_deep_pitch_pdf(founder_info, analysis)
    safe_title = re.sub(r"[^\w\-]", "_", analysis.get("title", "Startup"))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={safe_title}_Venture_Proposal.pdf"}
    )

@router.post("/founder/export-investor-pdf")
def export_investor_pdf_direct(payload: Dict[str, Any]):
    """Direct POST export for Deep Explanation & Investor Pitch PDF with JSON payload."""
    founder_info = payload.get("founder", {"name": "Sarah Lin", "email": "founder@idea2impact.io"})
    analysis = payload.get("analysis", payload)
    pdf_bytes = generate_investor_deep_pitch_pdf(founder_info, analysis)
    safe_title = re.sub(r"[^\w\-]", "_", analysis.get("title", "Startup"))
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={safe_title}_Venture_Proposal.pdf"}
    )

@router.post("/founder/share-to-hr")
def share_to_hr(payload: ShareToHrRequest):
    """
    Founder shares the generated Job Roles & Skills specification with HR.
    It is saved and immediately visible on the HR Dashboard!
    """
    fid = payload.founder_id or "found-01"
    founder = db.find_one("profiles", lambda p: p["id"] == fid) or {
        "full_name": "Sarah Lin",
        "email": "sarah.lin@ecotrace.ai"
    }

    req_record = {
        "id": f"hr-req-{str(uuid.uuid4())[:8]}",
        "session_id": payload.session_id,
        "founder_id": fid,
        "founder_name": founder.get("full_name", "Sarah Lin"),
        "founder_email": founder.get("email", "founder@idea2impact.io"),
        "idea_title": payload.idea_title,
        "industry": payload.industry or "Technology",
        "roles": payload.roles,
        "roles_count": len(payload.roles),
        "deep_explanation": payload.deep_explanation,
        "status": "New Request",
        "shared_at": datetime.now(timezone.utc).isoformat(),
        "note": payload.note or "Hiring specification shared by Founder for talent acquisition."
    }

    db.insert("shared_hiring_requests", req_record)
    db.log_audit("Hiring Spec Shared with HR", fid, f"Founder shared {len(payload.roles)} roles for '{payload.idea_title}'")

    return {
        "success": True,
        "message": f"Hiring specification for '{payload.idea_title}' sent to HR and now live on HR Dashboard!",
        "request": req_record
    }

@router.get("/hr/shared-hiring-requests")
def list_shared_hiring_requests():
    """Fetches all hiring specifications shared by founders for the HR Dashboard."""
    requests = db.get_table("shared_hiring_requests")
    return sorted(requests, key=lambda r: r.get("shared_at", ""), reverse=True)

@router.post("/hr/convert-request-to-job")
def convert_request_to_job(payload: ConvertRoleToJobRequest):
    """
    HR 1-Click action: converts a role from the founder's specification into an active job posting!
    """
    req_obj = db.find_one("shared_hiring_requests", lambda r: r["id"] == payload.request_id)
    if not req_obj:
        raise HTTPException(status_code=404, detail="Hiring request not found")

    roles = req_obj.get("roles", [])
    idx = payload.role_index or 0
    if idx < 0 or idx >= len(roles):
        raise HTTPException(status_code=400, detail="Invalid role index")

    target_role = roles[idx]

    # Create job in jobs table
    new_job: Dict[str, Any] = {
        "id": f"job-{str(uuid.uuid4())[:6]}",
        "created_by": payload.hr_id or "hr-01",
        "company_name": req_obj.get("idea_title", "Portfolio Venture"),
        "title": target_role.get("title", "Technical Role"),
        "description": "\n".join(target_role.get("responsibilities", ["Deliver core platform functionality."])),
        "experience_level": target_role.get("experience_level", "Senior"),
        "salary_min": 100000,
        "salary_max": 160000,
        "location": "Remote / Hybrid",
        "employment_type": "full-time",
        "status": "Active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.insert("jobs", new_job)

    req_skills = target_role.get("required_skills", [])
    pref_skills = target_role.get("preferred_skills", [])

    all_job_skills = []
    for s in req_skills:
        s_id = s.get("skill_id", f"sk-{str(uuid.uuid4())[:6]}")
        s_name = s.get("name", "Technical Skill")
        row = {
            "job_id": new_job["id"],
            "skill_id": s_id,
            "skill_name": s_name,
            "is_required": True,
            "weight": s.get("weight", 0.40)
        }
        db.insert("job_required_skills", row)
        all_job_skills.append({
            **row,
            "name": s_name,
            "skill": {"id": s_id, "name": s_name, "category": "Technical"}
        })
    for s in pref_skills:
        s_id = s.get("skill_id", f"sk-{str(uuid.uuid4())[:6]}")
        s_name = s.get("name", "Bonus Skill")
        row = {
            "job_id": new_job["id"],
            "skill_id": s_id,
            "skill_name": s_name,
            "is_required": False,
            "weight": s.get("weight", 0.25)
        }
        db.insert("job_required_skills", row)
        all_job_skills.append({
            **row,
            "name": s_name,
            "skill": {"id": s_id, "name": s_name, "category": "Technical"}
        })

    new_job["required_skills"] = all_job_skills
    new_job["skills"] = all_job_skills
    new_job["company"] = new_job.get("company_name")
    new_job["job_type"] = new_job.get("employment_type", "full-time")
    new_job["salary_range"] = f"${new_job.get('salary_min', 100000):,} - ${new_job.get('salary_max', 160000):,}"

    try:
        new_job["match"] = calculate_candidate_job_match("cand-01", new_job["id"])
    except Exception:
        new_job["match"] = None

    # Update request status
    req_obj["status"] = "Imported to Active Pipeline"
    db.save()
    db.log_audit("Role Converted to Job", payload.hr_id or "hr-01", f"Converted '{target_role.get('title')}' into active job opening")

    return {
        "success": True,
        "message": f"Role '{target_role.get('title')}' converted into active job opening!",
        "job": new_job
    }

@router.post("/founder/share-to-investor")
def share_to_investor(payload: ShareToInvestorRequest):
    """
    Founder shares the deep project explanation & investment proposal with Investors.
    It is saved and immediately visible on Investor / Sharks Mode!
    """
    fid = payload.founder_id or "found-01"
    founder = db.find_one("profiles", lambda p: p["id"] == fid) or {
        "full_name": "Sarah Lin",
        "email": "sarah.lin@ecotrace.ai",
        "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150"
    }

    pitch_record = {
        "id": f"pitch-{str(uuid.uuid4())[:8]}",
        "session_id": payload.session_id,
        "founder_id": fid,
        "founder_name": founder.get("full_name", "Sarah Lin"),
        "founder_email": founder.get("email", "founder@idea2impact.io"),
        "founder_avatar": founder.get("avatar_url", "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150"),
        "startup_name": payload.startup_name,
        "tagline": payload.tagline or "Autonomous innovation.",
        "industry": payload.industry or "Technology",
        "valuation_ask": payload.investment_required.get("total_ask", "$750,000"),
        "stage": payload.investment_required.get("stage", "Seed Round"),
        "runway_months": payload.investment_required.get("runway_months", 18),
        "deep_explanation": payload.deep_explanation,
        "project_scope": payload.project_scope,
        "investment_required": payload.investment_required,
        "execution_roadmap": payload.execution_roadmap,
        "status": "In Deal Pipeline",
        "shared_at": datetime.now(timezone.utc).isoformat(),
        "note": payload.note or "Confidential Venture Proposal shared by Founder via Gemini Pro AI Copilot."
    }

    db.insert("shared_founder_pitches", pitch_record)

    # Also register in startup_proposals for Victoria Sterling / Sharks
    db.insert("startup_proposals", {
        "id": f"prop-{str(uuid.uuid4())[:6]}",
        "startup_id": pitch_record["id"],
        "startup_name": payload.startup_name,
        "founder_id": fid,
        "investor_id": "inv-01",
        "status": "Under Review",
        "shared_at": datetime.now(timezone.utc).isoformat(),
        "ai_summary": payload.deep_explanation.get("elevator_pitch", "High-growth venture proposal."),
        "risk_score": "Moderate"
    })

    db.log_audit("Venture Pitch Shared with Investors", fid, f"Founder shared pitch for '{payload.startup_name}' (Ask: {pitch_record['valuation_ask']})")

    return {
        "success": True,
        "message": f"Proposal for '{payload.startup_name}' successfully sent to Investors and now live on Shark Room!",
        "pitch": pitch_record
    }

@router.get("/investor/shared-pitches")
def list_shared_pitches():
    """Fetches all proposals shared by founders for the Investor / Sharks Mode."""
    pitches = db.get_table("shared_founder_pitches")
    return sorted(pitches, key=lambda p: p.get("shared_at", ""), reverse=True)

@router.get("/messages")
def list_messages(
    channel: Optional[str] = Query(None),
    contact_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None)
):
    """Retrieve messages filtered by channel (candidate / founder) or contact ID."""
    messages = db.get_table("messages")
    filtered = messages
    if channel and isinstance(channel, str):
        filtered = [m for m in filtered if m.get("channel") == channel]
    if contact_id and isinstance(contact_id, str):
        filtered = [m for m in filtered if m.get("sender_id") == contact_id or m.get("receiver_id") == contact_id]
    if user_id and isinstance(user_id, str):
        filtered = [m for m in filtered if m.get("sender_id") == user_id or m.get("receiver_id") == user_id]
    return sorted(filtered, key=lambda m: m.get("timestamp", ""))

@router.post("/messages")
def send_message(payload: MessageCreate):
    """Send a direct message between HR and Candidate/Founder."""
    msg_id = f"msg-{str(uuid.uuid4())[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "id": msg_id,
        "sender_id": payload.sender_id,
        "receiver_id": payload.receiver_id,
        "sender_role": payload.sender_role,
        "receiver_role": payload.receiver_role,
        "sender_name": payload.sender_name or payload.sender_id,
        "receiver_name": payload.receiver_name or payload.receiver_id,
        "text": payload.text,
        "channel": payload.channel or "candidate",
        "timestamp": payload.timestamp or now_iso,
        "is_read": False
    }
    db.insert("messages", record)
    db.log_audit("Direct Message Sent", payload.sender_id, f"Message sent from {payload.sender_role} to {payload.receiver_role} ({payload.channel} channel)")
    return {"success": True, "message": "Message sent successfully", "data": record}


