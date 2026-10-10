from typing import Dict, Any, List
from ..database import db

def calculate_candidate_job_match(candidate_id: str, job_id: str) -> Dict[str, Any]:
    """
    Computes explainable compatibility score between candidate and job requirements.
    Formula from Idea2Impact specification Section 10.1:
    Match Score = (Weight of matched required skills / Total weight of required skills) * 100
    """
    # 1. Fetch Job and its required skills
    job = db.find_one("jobs", lambda j: j["id"] == job_id)
    if not job:
        raise ValueError(f"Job with id {job_id} not found")

    job_skills_req = db.find_many("job_required_skills", lambda r: r["job_id"] == job_id)
    skills_catalog = {s["id"]: s for s in db.get_table("skills")}

    # 2. Fetch Candidate and verified skills
    candidate_skills = db.find_many("candidate_skills", lambda cs: cs["candidate_id"] == candidate_id and cs.get("is_verified", False))
    candidate_skill_ids = {cs["skill_id"]: cs for cs in candidate_skills}

    # If no skills are defined for the job, default to 100%
    if not job_skills_req:
        return {
            "candidate_id": candidate_id,
            "job_id": job_id,
            "score": 100.0,
            "matched_skills": [],
            "missing_skills": [],
            "explanation": "No specific technical requirements have been defined for this opening.",
            "algorithm_version": "v1.0-explainable-weighted",
            "is_strong_fit": True
        }

    total_required_weight = 0.0
    matched_required_weight = 0.0
    matched_skills = []
    missing_skills = []

    for req in job_skills_req:
        skill_id = req["skill_id"]
        weight = float(req.get("weight", 1.0))
        is_required = req.get("is_required", True)
        skill_info = skills_catalog.get(skill_id, {"name": skill_id, "category": "General"})

        if is_required:
            total_required_weight += weight

        if skill_id in candidate_skill_ids:
            cand_skill_data = candidate_skill_ids[skill_id]
            if is_required:
                matched_required_weight += weight

            matched_skills.append({
                "skill_id": skill_id,
                "skill_name": skill_info["name"],
                "category": skill_info.get("category", "General"),
                "is_required": is_required,
                "weight": weight,
                "candidate_assessment_score": cand_skill_data.get("assessment_score", 0),
                "is_verified": cand_skill_data.get("is_verified", False),
                "verified_at": cand_skill_data.get("verified_at")
            })
        else:
            missing_skills.append({
                "skill_id": skill_id,
                "skill_name": skill_info["name"],
                "category": skill_info.get("category", "General"),
                "is_required": is_required,
                "weight": weight,
                "status": "Not Verified"
            })

    # Avoid zero division
    if total_required_weight == 0:
        score = 100.0 if len(missing_skills) == 0 else 50.0
    else:
        score = round((matched_required_weight / total_required_weight) * 100.0, 1)

    # Compose explainable narrative
    matched_req_count = len([m for m in matched_skills if m["is_required"]])
    total_req_count = len([r for r in job_skills_req if r.get("is_required", True)])

    explanation = (
        f"Candidate satisfies {matched_req_count} of {total_req_count} mandatory skill requirements "
        f"({round(matched_required_weight, 2)} of {round(total_required_weight, 2)} weighted points), "
        f"yielding a {score}% verified compatibility score. "
    )
    if missing_skills:
        missing_names = ", ".join([m["skill_name"] for m in missing_skills if m["is_required"]])
        if missing_names:
            explanation += f"Skills required to bridge: {missing_names}."
    else:
        explanation += "Full alignment across all verified mandatory technical competencies."

    # Generate Learning Roadmap Recommendations for missing skills
    learning_roadmap = []
    for miss in missing_skills:
        learning_roadmap.append({
            "skill_name": miss["skill_name"],
            "urgency": "High" if miss["is_required"] else "Medium",
            "suggested_resource": f"Complete the certified {miss['skill_name']} interactive track and hands-on lab.",
            "practice_project": f"Build an end-to-end sandbox project highlighting {miss['skill_name']} production patterns.",
            "assessment_cta": f"Take the {miss['skill_name']} 15-minute verification assessment to earn your badge."
        })

    result = {
        "candidate_id": candidate_id,
        "job_id": job_id,
        "score": score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "matched_count": matched_req_count,
        "total_required_count": total_req_count,
        "explanation": explanation,
        "learning_roadmap": learning_roadmap,
        "is_strong_fit": score >= 75.0,
        "algorithm_version": "v1.0-explainable-weighted"
    }

    # Store in database match_results table for auditability
    existing = db.find_one("match_results", lambda m: m.get("candidate_id") == candidate_id and m.get("job_id") == job_id)
    if existing:
        db.update("match_results", lambda m: m["id"] == existing["id"], result)
    else:
        db.insert("match_results", result)

    return result
