from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str = "candidate" # candidate, founder, hr, investor
    bio: Optional[str] = ""

class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = "candidate"

class ProfileCreate(BaseModel):
    full_name: str
    email: str
    role: str # candidate, founder, hr, investor
    bio: Optional[str] = ""
    username: Optional[str] = None
    password: Optional[str] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class AssessmentSubmission(BaseModel):
    candidate_id: str
    answers: Dict[str, int] # question_id -> selected option index
    flags: Optional[List[str]] = Field(default_factory=list)

class JobCreate(BaseModel):
    created_by: str
    company_name: str
    title: str
    description: str
    experience_level: str
    salary_min: int
    salary_max: int
    location: str
    required_skills: List[Dict[str, Any]] # [{"skill_id": "sk-01", "is_required": True, "weight": 0.4}]

class JobApplicationCreate(BaseModel):
    candidate_id: str
    notes: Optional[str] = ""

class ApplicationStatusUpdate(BaseModel):
    status: str # "Applied", "Under Review", "Shortlisted", "Interview", "Selected", "Rejected", "Offer Sent"
    notes: Optional[str] = None
    interview_date: Optional[str] = None

class IdeaAnalyzeRequest(BaseModel):
    title: str
    industry: str
    problem: str
    solution: str
    target_customers: str
    business_model: str
    known_costs: Optional[str] = ""
    funding_assumptions: Optional[str] = ""

class StartupCreate(BaseModel):
    founder_id: str
    name: str
    tagline: str
    stage: str
    industry: str
    pitch: str
    valuation_ask: str
    team_count: int = 1

class ProposalShareRequest(BaseModel):
    founder_id: str
    investor_id: str
    startup_id: str

class InvestorInterestRequest(BaseModel):
    investor_id: str
    startup_id: str
    note: str

class MeetingRequest(BaseModel):
    requester_id: str
    recipient_id: str
    meeting_type: str
    scheduled_at: str
    meeting_link: Optional[str] = "https://meet.google.com/idea2impact-call"
    agenda: str
