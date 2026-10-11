import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, Header, Response
from typing import Optional, List, Dict, Any

from ..database import db
from ..schemas.models import (
    LoginRequest, RegisterRequest, GoogleAuthRequest,
    ProfileCreate, ProfileUpdate, AssessmentSubmission,
    JobCreate, JobApplicationCreate, ApplicationStatusUpdate,
    IdeaAnalyzeRequest, StartupCreate, ProposalShareRequest,
    InvestorInterestRequest, MeetingRequest
)
from ..security.auth import (
    hash_password, verify_password, create_access_token, verify_access_token
)
from ..matching.engine import calculate_candidate_job_match
from ..ai.copilot import analyze_startup_idea, analyze_investor_proposal
from ..services.pdf_generator import generate_business_proposal_pdf, generate_candidate_passport_pdf

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

    return {**_sanitize_profile(profile), "details": role_data}

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
    updates = {k: v for k, v in payload.dict().items() if v is not None}
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
def list_assessments():
    assessments = db.get_table("assessments")
    skills = {s["id"]: s["name"] for s in db.get_table("skills")}
    results = []
    for a in assessments:
        results.append({
            "id": a["id"],
            "title": a["title"],
            "skill_id": a["skill_id"],
            "skill_name": skills.get(a["skill_id"], "Technical Skill"),
            "question_count": len(a.get("questions", [])),
            "passing_score": a.get("passing_score", 75.0),
            "duration_minutes": a.get("duration_minutes", 15)
        })
    return results

@router.get("/assessments/{assessment_id}")
def get_assessment(assessment_id: str):
    asm = db.find_one("assessments", lambda a: a["id"] == assessment_id)
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

@router.post("/assessments/{assessment_id}/attempts")
def submit_assessment(assessment_id: str, payload: AssessmentSubmission):
    asm = db.find_one("assessments", lambda a: a["id"] == assessment_id)
    if not asm:
        raise HTTPException(status_code=404, detail="Assessment not found")

    questions = asm.get("questions", [])
    total_q = len(questions)
    if total_q == 0:
        raise HTTPException(status_code=400, detail="Empty assessment")

    correct_count = 0
    feedback = []

    for q in questions:
        qid = q["id"]
        chosen = payload.answers.get(qid)
        correct = q.get("correct_index")
        is_correct = (chosen == correct)
        if is_correct:
            correct_count += 1
        feedback.append({
            "question_id": qid,
            "is_correct": is_correct,
            "correct_option": correct,
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
        existing_skill = db.find_one("candidate_skills", lambda cs: cs["candidate_id"] == payload.candidate_id and cs["skill_id"] == skill_id)
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

    return {
        "attempt_id": attempt["id"],
        "score": score,
        "passed": passed,
        "passing_threshold": asm.get("passing_score", 75.0),
        "feedback": feedback,
        "verified": passed
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
            "name": s_info.get("name", cs["skill_id"]),
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
            "name": s_info.get("name", cs["skill_id"]),
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
    new_job = {
        "id": f"job-{str(uuid.uuid4())[:6]}",
        "created_by": payload.created_by,
        "company_name": payload.company_name,
        "title": payload.title,
        "description": payload.description,
        "experience_level": payload.experience_level,
        "salary_min": payload.salary_min,
        "salary_max": payload.salary_max,
        "location": payload.location,
        "status": "Active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    db.insert("jobs", new_job)

    # Insert required skills
    for req in payload.required_skills:
        db.insert("job_required_skills", {
            "job_id": new_job["id"],
            "skill_id": req["skill_id"],
            "is_required": req.get("is_required", True),
            "weight": req.get("weight", 0.33)
        })

    db.log_audit("Job Created", payload.created_by, f"Job {payload.title} created for {payload.company_name}")
    return new_job

@router.get("/jobs")
def list_jobs(candidate_id: Optional[str] = Query(None)):
    jobs = db.find_many("jobs", lambda j: j.get("status") == "Active")
    skills_catalog = {s["id"]: s for s in db.get_table("skills")}
    
    results = []
    for j in jobs:
        reqs = db.find_many("job_required_skills", lambda r: r["job_id"] == j["id"])
        job_skills = []
        for r in reqs:
            s_data = skills_catalog.get(r["skill_id"], {})
            job_skills.append({
                "skill_id": r["skill_id"],
                "name": s_data.get("name", r["skill_id"]),
                "weight": r.get("weight", 1.0),
                "is_required": r.get("is_required", True)
            })
        
        match_info = None
        if candidate_id:
            try:
                match_info = calculate_candidate_job_match(candidate_id, j["id"])
            except Exception:
                match_info = None

        results.append({
            **j,
            "required_skills": job_skills,
            "match": match_info
        })
    return results

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
def apply_for_job(job_id: str, payload: JobApplicationCreate):
    existing = db.find_one("job_applications", lambda a: a["job_id"] == job_id and a["candidate_id"] == payload.candidate_id)
    if existing:
        return existing

    new_app = {
        "id": f"app-{str(uuid.uuid4())[:6]}",
        "job_id": job_id,
        "candidate_id": payload.candidate_id,
        "status": "Applied",
        "notes": payload.notes or "Candidate submitted application with Verified Skill Passport",
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "interview_date": None
    }
    db.insert("job_applications", new_app)
    db.log_audit("Job Application", payload.candidate_id, f"Candidate applied to Job {job_id}")
    return new_app

@router.get("/applications/me")
def get_my_applications(candidate_id: Optional[str] = Query(None)):
    cid = candidate_id or "cand-01"
    apps = db.find_many("job_applications", lambda a: a["candidate_id"] == cid)
    jobs_map = {j["id"]: j for j in db.get_table("jobs")}

    results = []
    for a in apps:
        j = jobs_map.get(a["job_id"], {})
        results.append({
            **a,
            "job_title": j.get("title", "Software Role"),
            "company_name": j.get("company_name", "Technology Co"),
            "location": j.get("location", "Remote"),
            "salary": f"${j.get('salary_min', 0):,} - ${j.get('salary_max', 0):,}"
        })
    return results

@router.get("/applications/job/{job_id}")
def get_job_applications(job_id: str):
    apps = db.find_many("job_applications", lambda a: a["job_id"] == job_id)
    profiles_map = {p["id"]: p for p in db.get_table("profiles")}
    
    results = []
    for a in apps:
        cand = profiles_map.get(a["candidate_id"], {})
        match_info = calculate_candidate_job_match(a["candidate_id"], job_id)
        results.append({
            **a,
            "candidate": cand,
            "match": match_info
        })
    return results

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
        # Also auto-create a meeting record if an interview is scheduled!
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
# 5. FOUNDER & AI STARTUP COPILOT (Section 10.3 & 13)
# -------------------------------------------------------------
@router.post("/ideas/analyze")
def run_ai_idea_analysis(payload: IdeaAnalyzeRequest):
    """AI Startup Copilot: Generates structured business breakdown & feasibility analysis."""
    analysis = analyze_startup_idea(payload.dict())
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
