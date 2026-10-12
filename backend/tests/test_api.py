
import unittest
from app.matching.engine import calculate_candidate_job_match
from app.ai.copilot import analyze_startup_idea, analyze_investor_proposal
from app.services.pdf_generator import generate_business_proposal_pdf, generate_candidate_passport_pdf
from app.database import db

class TestIdea2Impact(unittest.TestCase):

    def test_matching_engine_full_match(self):
        """Candidate cand-01 satisfies 100% of job-01 required skills."""
        result = calculate_candidate_job_match("cand-01", "job-01")
        self.assertEqual(result["score"], 100.0)
        self.assertEqual(result["matched_count"], 3)
        self.assertEqual(len(result["missing_skills"]), 0)
        self.assertTrue(result["is_strong_fit"])

    def test_matching_engine_partial_match(self):
        """Candidate cand-02 satisfies only Python for job-01 (40% match)."""
        result = calculate_candidate_job_match("cand-02", "job-01")
        self.assertEqual(result["score"], 40.0)
        self.assertEqual(result["matched_count"], 1)
        self.assertEqual(len(result["missing_skills"]), 2)
        self.assertFalse(result["is_strong_fit"])
        self.assertTrue(len(result["learning_roadmap"]) > 0)

    def test_ai_copilot_analysis(self):
        """AI Startup Copilot generates valid multidimensional feasibility scores."""
        payload = {
            "title": "QuantumFlow",
            "industry": "DeepTech",
            "problem": "Slow optimization workflows in quantum compilers.",
            "solution": "GPU-accelerated compilation graph engine.",
            "target_customers": "Quantum research laboratories and enterprise simulation teams.",
            "business_model": "Annual high-performance computing licenses.",
            "known_costs": "GPU clusters, engineering talent.",
            "funding_assumptions": "$1,500,000 Seed"
        }
        res = analyze_startup_idea(payload)
        self.assertIn("feasibility_score", res)
        self.assertGreater(res["feasibility_score"], 70.0)
        self.assertIn("dimensions", res)
        self.assertIn("milestones_90_days", res)

    def test_investor_due_diligence_assistant(self):
        """AI Investor assistant extracts assumptions and risks."""
        proposal = {
            "startup_name": "EcoTrace AI",
            "industry": "CleanTech",
            "stage": "Seed",
            "pitch": "Real-time carbon telemetry and ESG compliance.",
            "valuation_ask": "$1,200,000 for 12% equity"
        }
        res = analyze_investor_proposal(proposal)
        self.assertEqual(res["startup_name"], "EcoTrace AI")
        self.assertTrue(len(res["key_assumptions_flagged"]) > 0)
        self.assertTrue(len(res["due_diligence_questions"]) > 0)

    def test_pdf_generation(self):
        """Generates valid non-empty PDF bytes."""
        cand = {"full_name": "Alex Rivera", "email": "alex@test.com", "id": "cand-01"}
        skills = [{"name": "Python & FastAPI", "category": "Backend", "assessment_score": 92.0, "verified_at": "2026-02-14"}]
        pdf_bytes = generate_candidate_passport_pdf(cand, skills)
        self.assertTrue(len(pdf_bytes) > 1000)

    def test_authentication_login_and_register(self):
        """Tests user login with password, registration, and token validation."""
        from app.routers.api import login, register, get_auth_me
        from app.schemas.models import LoginRequest, RegisterRequest

        # Login with existing demo account
        login_res = login(LoginRequest(username="alexrivera", password="password123"))
        self.assertIn("token", login_res)
        self.assertEqual(login_res["user"]["role"], "candidate")
        self.assertNotIn("password_hash", login_res["user"])

        # Validate token with get_auth_me
        me_res = get_auth_me(authorization=f"Bearer {login_res['token']}")
        self.assertEqual(me_res["id"], "cand-01")

        # Register a unique user
        import uuid
        test_user = f"tester_{uuid.uuid4().hex[:6]}"
        reg_res = register(RegisterRequest(
            username=test_user,
            email=f"{test_user}@test.io",
            password="StrongPassword123!",
            full_name="Test Developer",
            role="founder"
        ))
        self.assertIn("token", reg_res)
        self.assertEqual(reg_res["user"]["username"], test_user)
        self.assertEqual(reg_res["user"]["role"], "founder")

        # Verify login of new user
        new_login = login(LoginRequest(username=test_user, password="StrongPassword123!"))
        self.assertEqual(new_login["user"]["email"], f"{test_user}@test.io")

    def test_google_auth_flow(self):
        """Tests Google OAuth registration and login."""
        from app.routers.api import google_auth
        from app.schemas.models import GoogleAuthRequest
        import uuid

        g_email = f"google_user_{uuid.uuid4().hex[:6]}@gmail.com"
        # 1. First time signup via Google
        res1 = google_auth(GoogleAuthRequest(
            email=g_email,
            full_name="Google Innovator",
            role="investor"
        ))
        self.assertTrue(res1["is_new_user"])
        self.assertEqual(res1["user"]["role"], "investor")
        self.assertEqual(res1["user"]["auth_provider"], "google")

        # 2. Subsequent login with same Google account
        res2 = google_auth(GoogleAuthRequest(
            email=g_email,
            full_name="Google Innovator"
        ))
        self.assertFalse(res2["is_new_user"])
        self.assertEqual(res2["user"]["id"], res1["user"]["id"])

    def test_candidate_competencies_and_dual_tier_matching(self):
        """Tests adding competency, dual-tier matching, and applying with learning commitment."""
        from app.routers.api import (
            add_user_skill, get_user_skills, delete_user_skill,
            create_job, apply_for_job, get_job_candidates, update_candidate_job_application
        )
        from app.schemas.models import CandidateSkillCreate, JobCreate, JobApplicationCreate

        test_cand_id = "test-cand-99"

        # 1. Add skills to test candidate (e.g. sk-python, sk-react)
        add_user_skill(CandidateSkillCreate(
            skill_id="sk-python",
            proficiency_level="advanced",
            years_experience=3.5,
            quiz_score=85.0
        ), candidate_id=test_cand_id)

        add_user_skill(CandidateSkillCreate(
            skill_id="sk-react",
            proficiency_level="intermediate",
            years_experience=2.0,
            quiz_score=80.0
        ), candidate_id=test_cand_id)

        user_skills = get_user_skills(candidate_id=test_cand_id)
        self.assertTrue(any(s["skill_id"] == "sk-python" for s in user_skills))
        self.assertTrue(any(s["is_verified"] for s in user_skills))

        # 2. Recruiter creates job with 75% mandatory and 25% preferred skills
        new_job = create_job(JobCreate(
            company_name="Acme Tech",
            title="Senior Full-Stack Engineer",
            description="Leading full stack architecture.",
            location="Remote",
            employment_type="full-time",
            skills=[
                {"skill_id": "sk-python", "is_required": True, "weight": 2.0},
                {"skill_id": "sk-sql", "is_required": True, "weight": 2.0},
                {"skill_id": "sk-react", "is_required": False, "weight": 1.0}
            ]
        ))
        job_id = new_job["id"]

        # 3. Calculate candidate match
        match_info = calculate_candidate_job_match(test_cand_id, job_id)
        # Meets 1 of 2 mandatory (50% of 75% = 37.5%) + 1 of 1 preferred (100% of 25% = 25%) = 62.5%
        self.assertEqual(match_info["score"], 62.5)
        self.assertEqual(len(match_info["critical_skill_gaps"]), 1)
        self.assertEqual(match_info["critical_skill_gaps"][0]["skill_id"], "sk-sql")
        self.assertEqual(len(match_info["bonus_competencies"]), 1)

        # 4. Candidate applies with learning commitment
        app = apply_for_job(job_id, JobApplicationCreate(
            candidate_id=test_cand_id,
            learning_commitment="Enrolled in PostgreSQL intensive course, completing in 2 weeks.",
            notes="Ready to interview"
        ))
        self.assertEqual(app["match_score"], 62.5)
        self.assertIn("PostgreSQL intensive", app["learning_commitment"])

        # 5. Recruiter inspects candidate pipeline
        candidates = get_job_candidates(job_id)
        self.assertTrue(any(c["candidate_id"] == test_cand_id for c in candidates))
        found = next(c for c in candidates if c["candidate_id"] == test_cand_id)
        self.assertEqual(found["match_score"], 62.5)
        self.assertEqual(found["learning_commitment"], "Enrolled in PostgreSQL intensive course, completing in 2 weeks.")

        # 6. Recruiter updates candidate status to shortlisted
        updated = update_candidate_job_application(job_id, test_cand_id, {"status": "shortlisted"})
        self.assertEqual(updated["status"], "shortlisted")

        # 7. Candidate removes skill
        del_res = delete_user_skill("sk-react", candidate_id=test_cand_id)
        self.assertTrue(del_res["success"])

if __name__ == "__main__":
    unittest.main()
