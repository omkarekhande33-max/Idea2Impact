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

class CandidateSkillCreate(BaseModel):
    skill_id: Optional[str] = None
    skill_name: Optional[str] = None
    proficiency_level: Optional[str] = "intermediate"
    years_experience: Optional[float] = 1.0
    quiz_score: Optional[float] = None
    assessment_score: Optional[float] = None
    is_verified: Optional[bool] = False

class JobCreate(BaseModel):
    created_by: Optional[str] = "hr-01"
    company_name: str
    title: str
    description: str
    experience_level: Optional[str] = "Mid-Senior"
    salary_min: Optional[int] = 80000
    salary_max: Optional[int] = 150000
    location: str
    location_type: Optional[str] = "Hybrid"
    map_url: Optional[str] = None
    map_query: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    employment_type: Optional[str] = "full-time"
    required_skills: Optional[List[Dict[str, Any]]] = Field(default_factory=list) # [{"skill_id": "sk-01", "is_required": True, "weight": 2.0}]
    skills: Optional[List[Dict[str, Any]]] = Field(default_factory=list) # Alternate alias from SkillBridge

class JobApplicationCreate(BaseModel):
    candidate_id: Optional[str] = "cand-01"
    notes: Optional[str] = ""
    learning_commitment: Optional[str] = ""
    match_score: Optional[float] = None

class ApplicationStatusUpdate(BaseModel):
    status: str # "applied", "reviewing", "shortlisted", "rejected", "interview", "selected"
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

class GeminiIdeaPromptRequest(BaseModel):
    idea: str
    founder_id: Optional[str] = "found-01"
    founder_name: Optional[str] = None
    founder_email: Optional[str] = None
    startup_name: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = None

class ShareToHrRequest(BaseModel):
    session_id: Optional[str] = None
    founder_id: Optional[str] = "found-01"
    idea_title: str
    industry: Optional[str] = "Technology"
    roles: List[Dict[str, Any]]
    deep_explanation: Optional[Dict[str, Any]] = None
    note: Optional[str] = "Hiring requirements specification shared by Founder for recruitment."

class ConvertRoleToJobRequest(BaseModel):
    request_id: str
    role_index: Optional[int] = 0
    hr_id: Optional[str] = "hr-01"

class ShareToInvestorRequest(BaseModel):
    session_id: Optional[str] = None
    founder_id: Optional[str] = "found-01"
    startup_name: str
    tagline: Optional[str] = None
    industry: Optional[str] = "Technology"
    deep_explanation: Dict[str, Any]
    project_scope: Dict[str, Any]
    investment_required: Dict[str, Any]
    execution_roadmap: List[Dict[str, Any]]
    note: Optional[str] = "Confidential Venture Proposal shared by Founder via Gemini Pro."

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
    investor_id: Optional[str] = "inv-01"
    startup_id: Optional[str] = None
    startup_name: Optional[str] = None
    tagline: Optional[str] = None
    industry: Optional[str] = None
    valuation_ask: Optional[str] = None
    pitch: Optional[str] = None
    blueprint: Optional[Dict[str, Any]] = None
    founder_name: Optional[str] = None
    founder_email: Optional[str] = None
    founder_avatar: Optional[str] = None

class InvestorInterestRequest(BaseModel):
    investor_id: str
    startup_id: str
    note: str

class MeetingRequest(BaseModel):
    id: Optional[str] = None
    title: Optional[str] = None
    meeting_type: Optional[str] = "Pitch Sync"
    participant: Optional[str] = None
    investor_name: Optional[str] = None
    investor_firm: Optional[str] = None
    founder_name: Optional[str] = None
    startup_name: Optional[str] = None
    time: Optional[str] = None
    requester_id: Optional[str] = "found-01"
    recipient_id: Optional[str] = "inv-01"
    scheduled_at: Optional[str] = None
    meeting_link: Optional[str] = "https://meet.google.com/idea2impact-call"
    agenda: Optional[str] = "Review 92.5% Founder Readiness Score, dual-tier hiring architecture, and term sheet parameters."

class MessageCreate(BaseModel):
    id: Optional[str] = None
    sender_id: str
    receiver_id: str
    sender_role: str = "hr" # "hr", "candidate", "founder", "investor"
    receiver_role: str = "candidate" # "candidate", "founder", "hr", "investor"
    sender_name: Optional[str] = None
    receiver_name: Optional[str] = None
    text: str
    channel: Optional[str] = "candidate" # "candidate", "founder", "investor"
    timestamp: Optional[str] = None

class MessagesReadRequest(BaseModel):
    channel: Optional[str] = "investor"
    sender_id: Optional[str] = None
    receiver_id: Optional[str] = None

