from typing import Dict, Any, List
import urllib.parse
from ..database import db

def calculate_candidate_job_match(candidate_id: str, job_id: str) -> Dict[str, Any]:
    """
    Computes explainable compatibility score between candidate and job requirements.
    Supports SkillBridge Dual-Tier Weighted Matching Engine:
    75% Core Mandatory Requirements + 25% Preferred Bonus Competencies.
    When only mandatory requirements exist, scales to 100% Core.
    """
    # 1. Fetch Job and its required skills
    job = db.find_one("jobs", lambda j: j["id"] == job_id)
    if not job:
        raise ValueError(f"Job with id {job_id} not found")

    job_skills_req = db.find_many("job_required_skills", lambda r: r["job_id"] == job_id)
    skills_catalog = {s["id"]: s for s in db.get_table("skills")}

    # 2. Fetch Candidate tagged/verified skills
    # Candidate matches if skill is verified or tagged with proficiency
    candidate_skills = db.find_many("candidate_skills", lambda cs: cs["candidate_id"] == candidate_id)
    candidate_skill_ids = {cs["skill_id"]: cs for cs in candidate_skills}

    # If no skills are defined for the job, default to 100%
    if not job_skills_req:
        return {
            "candidate_id": candidate_id,
            "job_id": job_id,
            "score": 100.0,
            "match_score_percentage": 100.0,
            "matched_skills": [],
            "critical_skill_gaps": [],
            "bonus_competencies": [],
            "missing_skills": [],
            "missing_preferred_skills": [],
            "explanation": "No specific technical requirements have been defined for this opening.",
            "algorithm_version": "v4.2-dual-tier-75-25",
            "is_strong_fit": True,
            "learning_roadmap": []
        }

    mandatory_reqs = [r for r in job_skills_req if r.get("is_required", True)]
    preferred_reqs = [r for r in job_skills_req if not r.get("is_required", True)]

    total_mandatory_weight = sum(float(r.get("weight", 1.0)) for r in mandatory_reqs)
    total_preferred_weight = sum(float(r.get("weight", 1.0)) for r in preferred_reqs)

    matched_mandatory_weight = 0.0
    matched_preferred_weight = 0.0

    matched_skills = [] # Mandatory verified matches
    critical_skill_gaps = [] # Missing mandatory skills
    bonus_competencies = [] # Matched preferred skills
    missing_preferred_skills = [] # Missing preferred skills
    all_missing_skills = []

    import re
    def normalize_slug(text: str) -> str:
        if not text:
            return ""
        return re.sub(r'[^a-z0-9]', '', text.lower().replace('sk-', ''))

    # Candidate skill lookup maps for exact ID, name, and normalized slug
    cand_by_id = {}
    cand_by_name = {}
    cand_by_slug = {}

    for cs in candidate_skills:
        s_obj = skills_catalog.get(cs["skill_id"], {})
        c_id = cs["skill_id"].lower().strip()
        cand_by_id[c_id] = cs

        name_cand = (cs.get("skill_name") or s_obj.get("name") or cs["skill_id"]).lower().strip()
        cand_by_name[name_cand] = cs
        c_slug = normalize_slug(name_cand)
        if c_slug:
            cand_by_slug[c_slug] = cs
        c_id_slug = normalize_slug(c_id)
        if c_id_slug:
            cand_by_slug[c_id_slug] = cs
        if s_obj.get("slug"):
            cand_by_slug[normalize_slug(s_obj["slug"])] = cs

    for req in job_skills_req:
        skill_id = req["skill_id"]
        weight = float(req.get("weight", 1.0))
        is_required = req.get("is_required", True)
        skill_info = skills_catalog.get(skill_id, {"name": skill_id, "category": "General"})
        skill_name = (req.get("skill_name") or req.get("name") or skill_info.get("name") or skill_id).strip()
        req_name_lower = skill_name.lower().strip()
        req_slug = normalize_slug(skill_name)
        req_id_lower = skill_id.lower().strip()

        # Strict match: ID, exact name, or slug
        cand_data = cand_by_id.get(req_id_lower)
        if not cand_data:
            cand_data = cand_by_name.get(req_name_lower)
        if not cand_data and req_slug:
            cand_data = cand_by_slug.get(req_slug)
        if not cand_data and skill_info.get("slug"):
            cand_data = cand_by_slug.get(normalize_slug(skill_info["slug"]))

        # Controlled standard aliases ONLY
        if not cand_data:
            if req_slug in ('pythonfastapi', 'python') and ('python' in cand_by_slug or 'pythonfastapi' in cand_by_slug):
                cand_data = cand_by_slug.get('pythonfastapi') or cand_by_slug.get('python')
            elif req_slug in ('postgresqldatabasedesign', 'postgresql') and ('postgresql' in cand_by_slug or 'postgresqldatabasedesign' in cand_by_slug):
                cand_data = cand_by_slug.get('postgresqldatabasedesign') or cand_by_slug.get('postgresql')
            elif req_slug in ('dockerkubernetes', 'docker') and ('docker' in cand_by_slug or 'dockerkubernetes' in cand_by_slug):
                cand_data = cand_by_slug.get('dockerkubernetes') or cand_by_slug.get('docker')

        is_cand_matched = cand_data is not None
        assessment_score = cand_data.get("assessment_score", cand_data.get("quiz_score", 85.0)) if cand_data else 0.0
        is_verified = (cand_data.get("is_verified", assessment_score >= 75.0)) if cand_data else False

        entry = {
            "skill_id": skill_id,
            "skill_name": skill_name,
            "skill": {"id": skill_id, "name": skill_name, "category": skill_info.get("category", "General")},
            "category": skill_info.get("category", "General"),
            "is_required": is_required,
            "weight": weight,
            "proficiency_level": cand_data.get("proficiency_level", "intermediate") if cand_data else "none",
            "candidate_assessment_score": assessment_score,
            "is_verified": is_verified,
            "verified_at": cand_data.get("verified_at") if cand_data else None
        }

        if is_required:
            if is_cand_matched:
                matched_mandatory_weight += weight
                matched_skills.append(entry)
            else:
                critical_skill_gaps.append(entry)
                all_missing_skills.append({
                    "skill_id": skill_id,
                    "skill_name": skill_name,
                    "category": skill_info.get("category", "General"),
                    "is_required": True,
                    "weight": weight,
                    "status": "Not Verified"
                })
        else:
            if is_cand_matched:
                matched_preferred_weight += weight
                bonus_competencies.append(entry)
            else:
                missing_preferred_skills.append(entry)
                all_missing_skills.append({
                    "skill_id": skill_id,
                    "skill_name": skill_name,
                    "category": skill_info.get("category", "General"),
                    "is_required": False,
                    "weight": weight,
                    "status": "Optional Missing"
                })

    # Dual-Tier 75/25 Formula Calculation:
    if mandatory_reqs and preferred_reqs:
        # Both tiers active: 75% Mandatory + 25% Preferred
        mand_ratio = (matched_mandatory_weight / total_mandatory_weight) if total_mandatory_weight > 0 else 1.0
        pref_ratio = (matched_preferred_weight / total_preferred_weight) if total_preferred_weight > 0 else 0.0
        mand_score_comp = round(mand_ratio * 75.0, 1)
        pref_score_comp = round(pref_ratio * 25.0, 1)
        score = round(mand_score_comp + pref_score_comp, 1)
        formula_breakdown = "75% Mandatory + 25% Preferred"
    elif mandatory_reqs:
        # 100% Mandatory
        mand_ratio = (matched_mandatory_weight / total_mandatory_weight) if total_mandatory_weight > 0 else 1.0
        mand_score_comp = round(mand_ratio * 100.0, 1)
        pref_score_comp = 0.0
        score = mand_score_comp
        formula_breakdown = "100% Mandatory"
    elif preferred_reqs:
        # 100% Preferred
        pref_ratio = (matched_preferred_weight / total_preferred_weight) if total_preferred_weight > 0 else 1.0
        mand_score_comp = 0.0
        pref_score_comp = round(pref_ratio * 100.0, 1)
        score = pref_score_comp
        formula_breakdown = "100% Preferred"
    else:
        score = 100.0
        mand_score_comp = 75.0
        pref_score_comp = 25.0
        formula_breakdown = "No strict requirements"

    matched_req_count = len(matched_skills)
    total_req_count = len(mandatory_reqs)

    explanation = (
        f"Candidate satisfies {matched_req_count} of {total_req_count} mandatory skill requirements "
        f"({round(matched_mandatory_weight, 2)} of {round(total_mandatory_weight, 2)} weighted points), "
        f"yielding a {score}% compatibility score ({formula_breakdown})."
    )
    if critical_skill_gaps:
        missing_names = ", ".join([m["skill_name"] for m in critical_skill_gaps])
        explanation += f" Critical gaps: {missing_names}."
    if bonus_competencies:
        bonus_names = ", ".join([b["skill_name"] for b in bonus_competencies])
        explanation += f" Bonus competencies: {bonus_names}."

    # Curated Learning Roadmap Recommendations
    learning_roadmap = []
    for miss in critical_skill_gaps:
        s_name = miss["skill_name"]
        slug_encoded = urllib.parse.quote_plus(s_name)
        learning_roadmap.append({
            "skill_name": s_name,
            "urgency": "High",
            "suggested_resource": f"Complete the certified {s_name} interactive track and hands-on lab.",
            "practice_project": f"Build an end-to-end sandbox project highlighting {s_name} production patterns.",
            "assessment_cta": f"Take the {s_name} 10-minute verification assessment to earn your badge.",
            "roadmap_url": f"roadmap.html?skill={slug_encoded}"
        })
    for miss in missing_preferred_skills:
        s_name = miss["skill_name"]
        slug_encoded = urllib.parse.quote_plus(s_name)
        learning_roadmap.append({
            "skill_name": s_name,
            "urgency": "Bonus / Low",
            "suggested_resource": f"Explore {s_name} concepts to earn a +25% preferred score boost.",
            "practice_project": f"Add {s_name} integration into your existing projects.",
            "assessment_cta": f"Verify {s_name} for additional compatibility points.",
            "roadmap_url": f"roadmap.html?skill={slug_encoded}"
        })

    result = {
        "candidate_id": candidate_id,
        "job_id": job_id,
        "score": score,
        "match_score_percentage": score,
        "mandatory_score_component": mand_score_comp,
        "preferred_score_component": pref_score_comp,
        "matched_skills": matched_skills,
        "critical_skill_gaps": critical_skill_gaps,
        "bonus_competencies": bonus_competencies,
        "missing_skills": all_missing_skills,
        "missing_preferred_skills": missing_preferred_skills,
        "matched_count": matched_req_count,
        "total_required_count": total_req_count,
        "explanation": explanation,
        "formula_breakdown": formula_breakdown,
        "learning_roadmap": learning_roadmap,
        "is_strong_fit": score >= 75.0,
        "algorithm_version": "v4.2-dual-tier-75-25"
    }

    # Store in database match_results table for auditability
    existing = db.find_one("match_results", lambda m: m.get("candidate_id") == candidate_id and m.get("job_id") == job_id)
    if existing:
        db.update("match_results", lambda m: m["id"] == existing["id"], result)
    else:
        db.insert("match_results", result)

    return result

