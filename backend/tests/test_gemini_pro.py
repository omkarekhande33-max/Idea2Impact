import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import unittest
from app.routers.api import (
    chat_gemini_pro, share_to_hr, list_shared_hiring_requests,
    convert_request_to_job, share_to_investor, list_shared_pitches,
    download_roles_pdf_by_session, download_investor_pdf_by_session
)
from app.schemas.models import (
    GeminiIdeaPromptRequest, ShareToHrRequest, ConvertRoleToJobRequest, ShareToInvestorRequest
)

class TestGeminiProEndpoints(unittest.TestCase):
    def test_gemini_chat_and_pdf_generation(self):
        # 1. Founder enters idea
        prompt_req = GeminiIdeaPromptRequest(
            idea="AI-powered medical triage platform for rural health clinics with low connectivity.",
            founder_id="found-01"
        )
        chat_res = chat_gemini_pro(prompt_req)
        self.assertIn("session_id", chat_res)
        self.assertIn("analysis", chat_res)
        analysis = chat_res["analysis"]

        # Validate step-by-step roadmap
        self.assertIn("execution_roadmap", analysis)
        self.assertGreaterEqual(len(analysis["execution_roadmap"]), 3)

        # Validate job roles with skills
        self.assertIn("required_job_roles", analysis)
        self.assertGreaterEqual(len(analysis["required_job_roles"]), 2)
        first_role = analysis["required_job_roles"][0]
        self.assertIn("title", first_role)
        self.assertIn("required_skills", first_role)

        # Validate investment required and scope
        self.assertIn("investment_required", analysis)
        self.assertIn("project_scope", analysis)
        self.assertIn("deep_explanation", analysis)

        session_id = chat_res["session_id"]

        # 2. Test downloading Roles PDF
        roles_pdf_res = download_roles_pdf_by_session(session_id)
        self.assertEqual(roles_pdf_res.media_type, "application/pdf")
        self.assertGreater(len(roles_pdf_res.body), 1000)

        # 3. Test downloading Investor PDF
        inv_pdf_res = download_investor_pdf_by_session(session_id)
        self.assertEqual(inv_pdf_res.media_type, "application/pdf")
        self.assertGreater(len(inv_pdf_res.body), 1000)

        # 4. Test "Share to HR"
        hr_share_res = share_to_hr(ShareToHrRequest(
            session_id=session_id,
            founder_id="found-01",
            idea_title=analysis["title"],
            industry=analysis["industry"],
            roles=analysis["required_job_roles"],
            deep_explanation=analysis["deep_explanation"]
        ))
        self.assertTrue(hr_share_res["success"])
        hr_req_id = hr_share_res["request"]["id"]

        # 5. Verify visible on HR Dashboard
        all_hr_requests = list_shared_hiring_requests()
        self.assertTrue(any(r["id"] == hr_req_id for r in all_hr_requests))

        # 6. Test 1-click convert role to job
        convert_res = convert_request_to_job(ConvertRoleToJobRequest(
            request_id=hr_req_id,
            role_index=0
        ))
        self.assertTrue(convert_res["success"])
        self.assertIn("job", convert_res)

        # 7. Test "Share to Investor"
        inv_share_res = share_to_investor(ShareToInvestorRequest(
            session_id=session_id,
            founder_id="found-01",
            startup_name=analysis["title"],
            tagline=analysis["tagline"],
            industry=analysis["industry"],
            deep_explanation=analysis["deep_explanation"],
            project_scope=analysis["project_scope"],
            investment_required=analysis["investment_required"],
            execution_roadmap=analysis["execution_roadmap"]
        ))
        self.assertTrue(inv_share_res["success"])
        pitch_id = inv_share_res["pitch"]["id"]

        # 8. Verify visible on Investor / Sharks mode
        all_pitches = list_shared_pitches()
        self.assertTrue(any(p["id"] == pitch_id for p in all_pitches))
        matched_pitch = next(p for p in all_pitches if p["id"] == pitch_id)
        self.assertEqual(matched_pitch["founder_id"], "found-01")
        self.assertIn("valuation_ask", matched_pitch)

if __name__ == "__main__":
    unittest.main()
