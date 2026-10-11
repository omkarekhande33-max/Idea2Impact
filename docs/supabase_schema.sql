-- ========================================================
-- Idea2Impact (I²) - Complete Supabase PostgreSQL Schema
-- Project URL: https://qegdokcntshzmhldshbm.supabase.co
-- Run this in Supabase Dashboard -> SQL Editor
-- ========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Clean Drop (Ensures clean rebuild if re-running)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.meetings CASCADE;
DROP TABLE IF EXISTS public.investor_interests CASCADE;
DROP TABLE IF EXISTS public.startup_proposals CASCADE;
DROP TABLE IF EXISTS public.startup_ideas CASCADE;
DROP TABLE IF EXISTS public.startups CASCADE;
DROP TABLE IF EXISTS public.job_applications CASCADE;
DROP TABLE IF EXISTS public.job_required_skills CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.assessment_attempts CASCADE;
DROP TABLE IF EXISTS public.assessments CASCADE;
DROP TABLE IF EXISTS public.candidate_skills CASCADE;
DROP TABLE IF EXISTS public.skills CASCADE;
DROP TABLE IF EXISTS public.investor_profiles CASCADE;
DROP TABLE IF EXISTS public.hr_profiles CASCADE;
DROP TABLE IF EXISTS public.founder_profiles CASCADE;
DROP TABLE IF EXISTS public.candidate_profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. Core Tables

CREATE TABLE IF NOT EXISTS public.profiles (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('candidate', 'founder', 'hr', 'investor', 'admin')),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.candidate_profiles (
    candidate_id VARCHAR(64) PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    education TEXT,
    experience_years NUMERIC DEFAULT 0,
    portfolio_url TEXT,
    target_role VARCHAR(255),
    summary TEXT
);

CREATE TABLE IF NOT EXISTS public.founder_profiles (
    founder_id VARCHAR(64) PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    industry VARCHAR(255),
    stage VARCHAR(64),
    pitch_deck_url TEXT
);

CREATE TABLE IF NOT EXISTS public.hr_profiles (
    hr_id VARCHAR(64) PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    position VARCHAR(255),
    website TEXT
);

CREATE TABLE IF NOT EXISTS public.investor_profiles (
    investor_id VARCHAR(64) PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    fund_name VARCHAR(255),
    preferred_stages JSONB DEFAULT '[]'::jsonb,
    target_industries JSONB DEFAULT '[]'::jsonb,
    min_ticket NUMERIC DEFAULT 0,
    max_ticket NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.skills (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.candidate_skills (
    candidate_id VARCHAR(64) REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id VARCHAR(64) REFERENCES public.skills(id) ON DELETE CASCADE,
    assessment_score NUMERIC DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    PRIMARY KEY (candidate_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.assessments (
    id VARCHAR(64) PRIMARY KEY,
    skill_id VARCHAR(64) REFERENCES public.skills(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    passing_score NUMERIC DEFAULT 75,
    duration_minutes INT DEFAULT 15,
    questions JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.assessment_attempts (
    id VARCHAR(64) PRIMARY KEY,
    candidate_id VARCHAR(64) REFERENCES public.profiles(id) ON DELETE CASCADE,
    assessment_id VARCHAR(64) REFERENCES public.assessments(id) ON DELETE CASCADE,
    score NUMERIC NOT NULL,
    passed BOOLEAN NOT NULL,
    flags JSONB DEFAULT '[]'::jsonb,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.jobs (
    id VARCHAR(64) PRIMARY KEY,
    created_by VARCHAR(64) REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    experience_level VARCHAR(64),
    salary_min NUMERIC,
    salary_max NUMERIC,
    location VARCHAR(255),
    status VARCHAR(64) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.job_required_skills (
    job_id VARCHAR(64) REFERENCES public.jobs(id) ON DELETE CASCADE,
    skill_id VARCHAR(64) REFERENCES public.skills(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT TRUE,
    weight NUMERIC DEFAULT 0.2,
    PRIMARY KEY (job_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.job_applications (
    id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) REFERENCES public.jobs(id) ON DELETE CASCADE,
    candidate_id VARCHAR(64) REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(64) DEFAULT 'Applied',
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    interview_date TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.startups (
    id VARCHAR(64) PRIMARY KEY,
    founder_id VARCHAR(64) REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    tagline TEXT,
    stage VARCHAR(64),
    industry VARCHAR(255),
    readiness_score NUMERIC DEFAULT 0,
    pitch TEXT,
    valuation_ask TEXT,
    team_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.startup_ideas (
    id VARCHAR(64) PRIMARY KEY,
    startup_id VARCHAR(64) REFERENCES public.startups(id) ON DELETE CASCADE,
    founder_id VARCHAR(64) REFERENCES public.profiles(id) ON DELETE CASCADE,
    problem TEXT,
    solution TEXT,
    target_customers TEXT,
    business_model TEXT,
    risks TEXT,
    market_size VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS public.startup_proposals (
    id VARCHAR(64) PRIMARY KEY,
    startup_id VARCHAR(64) REFERENCES public.startups(id) ON DELETE CASCADE,
    founder_id VARCHAR(64) REFERENCES public.profiles(id) ON DELETE CASCADE,
    investor_id VARCHAR(64) REFERENCES public.profiles(id) ON DELETE CASCADE,
    status VARCHAR(64) DEFAULT 'Pending Review',
    shared_at TIMESTAMPTZ DEFAULT NOW(),
    ai_summary TEXT,
    risk_score TEXT,
    due_diligence_notes TEXT
);

CREATE TABLE IF NOT EXISTS public.investor_interests (
    id VARCHAR(64) PRIMARY KEY,
    investor_id VARCHAR(64) REFERENCES public.profiles(id) ON DELETE CASCADE,
    startup_id VARCHAR(64) REFERENCES public.startups(id) ON DELETE CASCADE,
    status VARCHAR(64) DEFAULT 'Term Sheet Offered',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.meetings (
    id VARCHAR(64) PRIMARY KEY,
    requester_id VARCHAR(64) REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id VARCHAR(64) REFERENCES public.profiles(id) ON DELETE CASCADE,
    meeting_type VARCHAR(255),
    scheduled_at TIMESTAMPTZ,
    status VARCHAR(64) DEFAULT 'Pending',
    meeting_link TEXT,
    agenda TEXT
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    event VARCHAR(255) NOT NULL,
    user_id VARCHAR(64),
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) & Standard Open Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_profiles" ON public.profiles;
CREATE POLICY "allow_read_all_profiles" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_profiles" ON public.profiles;
CREATE POLICY "allow_insert_all_profiles" ON public.profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_profiles" ON public.profiles;
CREATE POLICY "allow_update_all_profiles" ON public.profiles FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_profiles" ON public.profiles;
CREATE POLICY "allow_delete_all_profiles" ON public.profiles FOR DELETE USING (true);
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_candidate_profiles" ON public.candidate_profiles;
CREATE POLICY "allow_read_all_candidate_profiles" ON public.candidate_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_candidate_profiles" ON public.candidate_profiles;
CREATE POLICY "allow_insert_all_candidate_profiles" ON public.candidate_profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_candidate_profiles" ON public.candidate_profiles;
CREATE POLICY "allow_update_all_candidate_profiles" ON public.candidate_profiles FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_candidate_profiles" ON public.candidate_profiles;
CREATE POLICY "allow_delete_all_candidate_profiles" ON public.candidate_profiles FOR DELETE USING (true);
ALTER TABLE public.founder_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_founder_profiles" ON public.founder_profiles;
CREATE POLICY "allow_read_all_founder_profiles" ON public.founder_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_founder_profiles" ON public.founder_profiles;
CREATE POLICY "allow_insert_all_founder_profiles" ON public.founder_profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_founder_profiles" ON public.founder_profiles;
CREATE POLICY "allow_update_all_founder_profiles" ON public.founder_profiles FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_founder_profiles" ON public.founder_profiles;
CREATE POLICY "allow_delete_all_founder_profiles" ON public.founder_profiles FOR DELETE USING (true);
ALTER TABLE public.hr_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_hr_profiles" ON public.hr_profiles;
CREATE POLICY "allow_read_all_hr_profiles" ON public.hr_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_hr_profiles" ON public.hr_profiles;
CREATE POLICY "allow_insert_all_hr_profiles" ON public.hr_profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_hr_profiles" ON public.hr_profiles;
CREATE POLICY "allow_update_all_hr_profiles" ON public.hr_profiles FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_hr_profiles" ON public.hr_profiles;
CREATE POLICY "allow_delete_all_hr_profiles" ON public.hr_profiles FOR DELETE USING (true);
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_investor_profiles" ON public.investor_profiles;
CREATE POLICY "allow_read_all_investor_profiles" ON public.investor_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_investor_profiles" ON public.investor_profiles;
CREATE POLICY "allow_insert_all_investor_profiles" ON public.investor_profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_investor_profiles" ON public.investor_profiles;
CREATE POLICY "allow_update_all_investor_profiles" ON public.investor_profiles FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_investor_profiles" ON public.investor_profiles;
CREATE POLICY "allow_delete_all_investor_profiles" ON public.investor_profiles FOR DELETE USING (true);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_skills" ON public.skills;
CREATE POLICY "allow_read_all_skills" ON public.skills FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_skills" ON public.skills;
CREATE POLICY "allow_insert_all_skills" ON public.skills FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_skills" ON public.skills;
CREATE POLICY "allow_update_all_skills" ON public.skills FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_skills" ON public.skills;
CREATE POLICY "allow_delete_all_skills" ON public.skills FOR DELETE USING (true);
ALTER TABLE public.candidate_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_candidate_skills" ON public.candidate_skills;
CREATE POLICY "allow_read_all_candidate_skills" ON public.candidate_skills FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_candidate_skills" ON public.candidate_skills;
CREATE POLICY "allow_insert_all_candidate_skills" ON public.candidate_skills FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_candidate_skills" ON public.candidate_skills;
CREATE POLICY "allow_update_all_candidate_skills" ON public.candidate_skills FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_candidate_skills" ON public.candidate_skills;
CREATE POLICY "allow_delete_all_candidate_skills" ON public.candidate_skills FOR DELETE USING (true);
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_assessments" ON public.assessments;
CREATE POLICY "allow_read_all_assessments" ON public.assessments FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_assessments" ON public.assessments;
CREATE POLICY "allow_insert_all_assessments" ON public.assessments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_assessments" ON public.assessments;
CREATE POLICY "allow_update_all_assessments" ON public.assessments FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_assessments" ON public.assessments;
CREATE POLICY "allow_delete_all_assessments" ON public.assessments FOR DELETE USING (true);
ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_assessment_attempts" ON public.assessment_attempts;
CREATE POLICY "allow_read_all_assessment_attempts" ON public.assessment_attempts FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_assessment_attempts" ON public.assessment_attempts;
CREATE POLICY "allow_insert_all_assessment_attempts" ON public.assessment_attempts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_assessment_attempts" ON public.assessment_attempts;
CREATE POLICY "allow_update_all_assessment_attempts" ON public.assessment_attempts FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_assessment_attempts" ON public.assessment_attempts;
CREATE POLICY "allow_delete_all_assessment_attempts" ON public.assessment_attempts FOR DELETE USING (true);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_jobs" ON public.jobs;
CREATE POLICY "allow_read_all_jobs" ON public.jobs FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_jobs" ON public.jobs;
CREATE POLICY "allow_insert_all_jobs" ON public.jobs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_jobs" ON public.jobs;
CREATE POLICY "allow_update_all_jobs" ON public.jobs FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_jobs" ON public.jobs;
CREATE POLICY "allow_delete_all_jobs" ON public.jobs FOR DELETE USING (true);
ALTER TABLE public.job_required_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_job_required_skills" ON public.job_required_skills;
CREATE POLICY "allow_read_all_job_required_skills" ON public.job_required_skills FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_job_required_skills" ON public.job_required_skills;
CREATE POLICY "allow_insert_all_job_required_skills" ON public.job_required_skills FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_job_required_skills" ON public.job_required_skills;
CREATE POLICY "allow_update_all_job_required_skills" ON public.job_required_skills FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_job_required_skills" ON public.job_required_skills;
CREATE POLICY "allow_delete_all_job_required_skills" ON public.job_required_skills FOR DELETE USING (true);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_job_applications" ON public.job_applications;
CREATE POLICY "allow_read_all_job_applications" ON public.job_applications FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_job_applications" ON public.job_applications;
CREATE POLICY "allow_insert_all_job_applications" ON public.job_applications FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_job_applications" ON public.job_applications;
CREATE POLICY "allow_update_all_job_applications" ON public.job_applications FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_job_applications" ON public.job_applications;
CREATE POLICY "allow_delete_all_job_applications" ON public.job_applications FOR DELETE USING (true);
ALTER TABLE public.startups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_startups" ON public.startups;
CREATE POLICY "allow_read_all_startups" ON public.startups FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_startups" ON public.startups;
CREATE POLICY "allow_insert_all_startups" ON public.startups FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_startups" ON public.startups;
CREATE POLICY "allow_update_all_startups" ON public.startups FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_startups" ON public.startups;
CREATE POLICY "allow_delete_all_startups" ON public.startups FOR DELETE USING (true);
ALTER TABLE public.startup_ideas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_startup_ideas" ON public.startup_ideas;
CREATE POLICY "allow_read_all_startup_ideas" ON public.startup_ideas FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_startup_ideas" ON public.startup_ideas;
CREATE POLICY "allow_insert_all_startup_ideas" ON public.startup_ideas FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_startup_ideas" ON public.startup_ideas;
CREATE POLICY "allow_update_all_startup_ideas" ON public.startup_ideas FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_startup_ideas" ON public.startup_ideas;
CREATE POLICY "allow_delete_all_startup_ideas" ON public.startup_ideas FOR DELETE USING (true);
ALTER TABLE public.startup_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_startup_proposals" ON public.startup_proposals;
CREATE POLICY "allow_read_all_startup_proposals" ON public.startup_proposals FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_startup_proposals" ON public.startup_proposals;
CREATE POLICY "allow_insert_all_startup_proposals" ON public.startup_proposals FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_startup_proposals" ON public.startup_proposals;
CREATE POLICY "allow_update_all_startup_proposals" ON public.startup_proposals FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_startup_proposals" ON public.startup_proposals;
CREATE POLICY "allow_delete_all_startup_proposals" ON public.startup_proposals FOR DELETE USING (true);
ALTER TABLE public.investor_interests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_investor_interests" ON public.investor_interests;
CREATE POLICY "allow_read_all_investor_interests" ON public.investor_interests FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_investor_interests" ON public.investor_interests;
CREATE POLICY "allow_insert_all_investor_interests" ON public.investor_interests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_investor_interests" ON public.investor_interests;
CREATE POLICY "allow_update_all_investor_interests" ON public.investor_interests FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_investor_interests" ON public.investor_interests;
CREATE POLICY "allow_delete_all_investor_interests" ON public.investor_interests FOR DELETE USING (true);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_meetings" ON public.meetings;
CREATE POLICY "allow_read_all_meetings" ON public.meetings FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_meetings" ON public.meetings;
CREATE POLICY "allow_insert_all_meetings" ON public.meetings FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_meetings" ON public.meetings;
CREATE POLICY "allow_update_all_meetings" ON public.meetings FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_meetings" ON public.meetings;
CREATE POLICY "allow_delete_all_meetings" ON public.meetings FOR DELETE USING (true);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_read_all_audit_logs" ON public.audit_logs;
CREATE POLICY "allow_read_all_audit_logs" ON public.audit_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_insert_all_audit_logs" ON public.audit_logs;
CREATE POLICY "allow_insert_all_audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "allow_update_all_audit_logs" ON public.audit_logs;
CREATE POLICY "allow_update_all_audit_logs" ON public.audit_logs FOR UPDATE USING (true);
DROP POLICY IF EXISTS "allow_delete_all_audit_logs" ON public.audit_logs;
CREATE POLICY "allow_delete_all_audit_logs" ON public.audit_logs FOR DELETE USING (true);

-- 5. Seed Data

-- Seed profiles
INSERT INTO public.profiles (id, full_name, email, role, avatar_url, bio, created_at) VALUES
('cand-01', 'Alex Rivera', 'alex.rivera@example.com', 'candidate', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'Full-Stack Engineer specialized in scalable Python backends, FastAPI microservices, and React SPAs.', '2026-01-15T10:00:00Z'),
('cand-02', 'Priya Sharma', 'priya.sharma@example.com', 'candidate', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', 'AI & ML Engineer focused on LLM pipelines, RAG systems, and high-performance inference.', '2026-02-10T12:00:00Z'),
('cand-03', 'Jordan Lee', 'jordan.lee@example.com', 'candidate', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'Frontend Engineer & UI Architect proficient in responsive layouts, component libraries, and TypeScript.', '2026-03-01T09:30:00Z'),
('found-01', 'Sarah Lin', 'sarah.lin@ecotrace.ai', 'founder', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', 'Founder & CEO at EcoTrace AI. Passionate about decarbonizing supply chains with autonomous carbon accounting.', '2026-01-05T08:00:00Z'),
('hr-01', 'Elena Rostova', 'elena.rostova@novatech.io', 'hr', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', 'Head of Technical Talent Acquisition at NovaTech Systems. Building high-growth engineering teams.', '2026-01-20T11:00:00Z'),
('inv-01', 'Victoria Sterling', 'v.sterling@apexfrontier.vc', 'investor', 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80', 'General Partner at Apex Frontier Ventures. Backing early-stage AI, Sustainability, and Enterprise SaaS.', '2026-01-08T14:00:00Z')
ON CONFLICT DO NOTHING;

-- Seed candidate_profiles
INSERT INTO public.candidate_profiles (candidate_id, education, experience_years, portfolio_url, target_role, summary) VALUES
('cand-01', 'B.S. in Computer Science, Georgia Tech', 4, 'https://github.com/alexrivera-dev', 'Senior Full-Stack Engineer', 'Proven track record in high-concurrency REST APIs, database optimization, and modern web application frontends.'),
('cand-02', 'M.S. in Artificial Intelligence, Carnegie Mellon', 3, 'https://github.com/priyasharma-ai', 'AI / Machine Learning Engineer', 'Specialist in fine-tuning open source LLMs, embedding architectures, and agentic workflows.'),
('cand-03', 'B.A. in Interactive Design & CS, University of Washington', 2, 'https://jordanlee.design', 'Frontend Software Engineer', 'Passionate about accessible UI systems, micro-animations, and fast client-side rendering.')
ON CONFLICT DO NOTHING;

-- Seed founder_profiles
INSERT INTO public.founder_profiles (founder_id, company_name, industry, stage, pitch_deck_url) VALUES
('found-01', 'EcoTrace AI', 'CleanTech / AI', 'Seed', 'https://ecotrace.ai/deck.pdf')
ON CONFLICT DO NOTHING;

-- Seed hr_profiles
INSERT INTO public.hr_profiles (hr_id, company_name, position, website) VALUES
('hr-01', 'NovaTech Systems', 'Director of Engineering Talent', 'https://novatech.io')
ON CONFLICT DO NOTHING;

-- Seed investor_profiles
INSERT INTO public.investor_profiles (investor_id, fund_name, preferred_stages, target_industries, min_ticket, max_ticket) VALUES
('inv-01', 'Apex Frontier Ventures', '["Seed", "Pre-Seed", "Series A"]'::jsonb, '["AI / Machine Learning", "CleanTech", "Enterprise SaaS", "Developer Tools"]'::jsonb, 100000, 1000000)
ON CONFLICT DO NOTHING;

-- Seed skills
INSERT INTO public.skills (id, name, category, description) VALUES
('sk-01', 'Python & FastAPI', 'Backend', 'Async programming, Pydantic validation, dependency injection, REST APIs.'),
('sk-02', 'PostgreSQL & Database Design', 'Database', 'Relational schema modeling, indexing, foreign keys, query optimization, RLS.'),
('sk-03', 'Modern JavaScript & Frontend', 'Frontend', 'ES Modules, async DOM manipulation, state management, responsive UI design.'),
('sk-04', 'AI & LLM Integration', 'AI / ML', 'Prompt orchestration, structured JSON outputs, embeddings, LangChain/LlamaIndex.'),
('sk-05', 'Cloud Deployment & Docker', 'DevOps', 'Containerization, CI/CD pipelines, container orchestration, static hosting.'),
('sk-06', 'System Architecture & Security', 'Architecture', 'Role-based access control (RBAC), token authentication, API rate limiting, sanitization.')
ON CONFLICT DO NOTHING;

-- Seed candidate_skills
INSERT INTO public.candidate_skills (candidate_id, skill_id, assessment_score, is_verified, verified_at) VALUES
('cand-01', 'sk-01', 92.0, True, '2026-02-14T15:20:00Z'),
('cand-01', 'sk-02', 88.0, True, '2026-02-15T10:15:00Z'),
('cand-01', 'sk-03', 80.0, True, '2026-02-16T11:45:00Z'),
('cand-02', 'sk-01', 85.0, True, '2026-02-18T09:00:00Z'),
('cand-02', 'sk-04', 95.0, True, '2026-02-20T14:30:00Z'),
('cand-03', 'sk-03', 90.0, True, '2026-03-02T16:00:00Z')
ON CONFLICT DO NOTHING;

-- Seed assessments
INSERT INTO public.assessments (id, skill_id, title, passing_score, duration_minutes, questions) VALUES
('asm-01', 'sk-01', 'Python & FastAPI Backend Assessment', 75.0, 15, '[{"id": "q1", "text": "In FastAPI, how do you specify that an endpoint handler should run asynchronously without blocking the event loop?", "options": ["Use the @async_route decorator", "Define the handler function with ''async def''", "Wrap the return value in asyncio.Future()", "Set background_task=True in router configuration"], "correct_index": 1, "explanation": "Declaring endpoint functions with ''async def'' allows FastAPI to execute them cooperatively on the asyncio event loop."}, {"id": "q2", "text": "What does Pydantic BaseModel primarily provide when used in FastAPI request bodies?", "options": ["Database connection pooling", "Data validation, parsing, and automated OpenAPI documentation schema generation", "Automatic SQL query generation and ORM mapping", "Client-side cookie storage encryption"], "correct_index": 1, "explanation": "Pydantic performs runtime data type validation, sanitization, and produces OpenAPI/Swagger schemas."}, {"id": "q3", "text": "Which dependency injection tool in FastAPI is used to share authentication, database sessions, and permissions across routes?", "options": ["fastapi.Depends", "fastapi.Inject", "fastapi.Provide", "fastapi.Autowired"], "correct_index": 0, "explanation": "Depends() is FastAPI''s standard mechanism for dependency declaration and hierarchical resolution."}, {"id": "q4", "text": "How should long-running CPU-intensive or slow operations be handled without starving FastAPI async requests?", "options": ["Execute them synchronously in the main async function", "Offload them to BackgroundTasks, Celery worker, or run in a thread pool via run_in_executor", "Increase the OS thread stack size", "Set async_timeout to 0"], "correct_index": 1, "explanation": "Blocking operations block the GIL and asyncio loop unless dispatched to worker threads or external task queues."}]'::jsonb),
('asm-02', 'sk-02', 'PostgreSQL & Relational Design Assessment', 75.0, 15, '[{"id": "q1", "text": "What is the primary architectural purpose of Row Level Security (RLS) in PostgreSQL?", "options": ["Compressing table rows on disk to save storage", "Restricting which rows a database user or session can select, update, or delete based on SQL policies", "Creating read-only replicas across multiple geographical regions", "Automatically converting JSON fields into B-Trees"], "correct_index": 1, "explanation": "RLS applies security filters directly in the database engine, preventing unauthorized row leakage regardless of application flaws."}, {"id": "q2", "text": "When establishing a relationship where each Job Listing requires multiple skills with custom weights, which relational pattern is ideal?", "options": ["A single CSV column in the jobs table", "A junction / associative table (job_required_skills) with foreign keys to jobs and skills", "Duplicate job rows for every single skill", "Store unindexed text blobs"], "correct_index": 1, "explanation": "An associative table allows clean Many-to-Many mappings, relational integrity, indexing, and per-skill metadata such as weight."}, {"id": "q3", "text": "What type of index is most effective in PostgreSQL for high-speed lookup on an exact UUID primary key?", "options": ["B-Tree index (default)", "GIN full-text index", "BRIN index", "Spatial R-Tree index"], "correct_index": 0, "explanation": "B-Tree indexes provide logarithmic O(log N) lookups and are the default standard index for equality lookups."}, {"id": "q4", "text": "What is the consequence of adding ''ON DELETE CASCADE'' to a foreign key constraint from job_applications to candidates?", "options": ["Candidate deletion will fail if applications exist", "Deleting the candidate profile automatically purges all related application records", "The foreign key is converted into a loose pointer", "Candidate records become anonymous"], "correct_index": 1, "explanation": "ON DELETE CASCADE propagates the delete operation to dependent child rows automatically."}]'::jsonb),
('asm-03', 'sk-03', 'Modern JavaScript & Responsive Web Assessment', 75.0, 15, '[{"id": "q1", "text": "Why is using ES Modules (''import'' / ''export'' with type=''module'') advantageous in modern vanilla web apps?", "options": ["It eliminates the need for any CSS styling", "It enables scoped modular code without global variable collisions and supports native browser loading", "It forces synchronous execution of all scripts", "It prevents fetch requests from failing"], "correct_index": 1, "explanation": "ES Modules provide isolated scopes, strict mode enforcement, and clean code organization without global namespace pollution."}, {"id": "q2", "text": "Which CSS layout method is best suited for a 2-dimensional dashboard grid with responsive sidebar and main content?", "options": ["Float layout with clearfix", "CSS Grid (grid-template-columns / grid-template-rows)", "Inline-block elements with vertical-align", "Table elements"], "correct_index": 1, "explanation": "CSS Grid is purpose-built for two-dimensional structured dashboard layouts with seamless responsive adaptability."}, {"id": "q3", "text": "How can a web app detect when a candidate navigates away or switches browser tabs during an active proctored assessment?", "options": ["Listen to ''visibilitychange'' on document and ''blur'' on window", "Inspect the user''s desktop taskbar via navigator", "Read local process memory through WebSocket", "Check screen brightness values"], "correct_index": 0, "explanation": "Document visibilitychange and window blur events reliably detect when the user minimizes the tab or switches apps."}, {"id": "q4", "text": "What is the key advantage of client-side optimistic UI updates combined with API synchronization?", "options": ["It eliminates the need for a database", "It provides instant, zero-latency feedback to the user while keeping server data consistent", "It automatically solves all network outages permanently", "It bypasses authentication requirements"], "correct_index": 1, "explanation": "Optimistic UI immediately reflects user actions on screen while performing asynchronous network requests in the background."}]'::jsonb),
('asm-04', 'sk-04', 'AI & LLM Integration Architecture Assessment', 75.0, 15, '[{"id": "q1", "text": "When building an AI Startup Copilot, why should the backend enforce structured JSON schema validation on LLM output?", "options": ["To prevent the browser from having to parse text and guarantee predictable UI rendering of fields like risks and assumptions", "Because LLMs cannot output plain English", "To reduce cloud server electricity consumption", "To encrypt the prompt tokens"], "correct_index": 0, "explanation": "Enforcing structured JSON guarantees that downstream frontend components receive guaranteed typed fields without parser crashes."}, {"id": "q2", "text": "Why must AI API keys (such as OpenAI, Gemini, or Anthropic keys) NEVER be exposed in browser client JavaScript?", "options": ["Browsers do not support UTF-8 characters", "Any user can inspect network traffic or source code, steal the key, and rack up unauthorized API bills", "API keys slow down CSS rendering", "The browser console will automatically deactivate the key"], "correct_index": 1, "explanation": "Client-side secrets are fully accessible to end users; API credentials must strictly reside on the secured backend."}, {"id": "q3", "text": "According to the Idea2Impact architectural principles, how should AI-generated evaluations and startup risks be treated?", "options": ["As infallible guarantees of financial success or failure", "As assistive decision support for human judgment, clearly labeled with assumptions rather than certainty", "As legal binding contracts for venture capital", "As automatic rejections for startup founders"], "correct_index": 1, "explanation": "AI models provide decision support and summarize assumptions, but human judgment remains the ultimate authority."}, {"id": "q4", "text": "What is the purpose of Retrieval-Augmented Generation (RAG) in corporate candidate or startup discovery?", "options": ["Grounding model responses in verifiable database documents and private profiles to prevent hallucinations", "Replacing all SQL database tables with text embeddings", "Converting PDFs to image files", "Compressing video streams"], "correct_index": 0, "explanation": "RAG retrieves specific facts and profiles from verified databases before prompting the model, anchoring the generation in real data."}]'::jsonb)
ON CONFLICT DO NOTHING;

-- Seed assessment_attempts
INSERT INTO public.assessment_attempts (id, candidate_id, assessment_id, score, passed, flags, completed_at) VALUES
('att-01', 'cand-01', 'asm-01', 92.0, True, '["tab_switches: 0", "clean_session"]'::jsonb, '2026-02-14T15:20:00Z'),
('att-02', 'cand-01', 'asm-02', 88.0, True, '["tab_switches: 0", "clean_session"]'::jsonb, '2026-02-15T10:15:00Z')
ON CONFLICT DO NOTHING;

-- Seed jobs
INSERT INTO public.jobs (id, created_by, company_name, title, description, experience_level, salary_min, salary_max, location, status, created_at) VALUES
('job-01', 'hr-01', 'NovaTech Systems', 'Senior Full-Stack Platform Engineer', 'Lead the core platform engineering team building next-generation cloud analytics and microservices. You will design robust Python/FastAPI services, design high-throughput PostgreSQL schemas, and craft delightful responsive interfaces.', 'Senior (4+ years)', 120000, 160000, 'San Francisco, CA (Hybrid / Remote)', 'Active', '2026-02-01T10:00:00Z'),
('job-02', 'hr-01', 'NovaTech Systems', 'AI Systems & Inference Engineer', 'Architect and optimize high-throughput LLM pipelines, prompt orchestration, and autonomous agent systems. Must have deep experience in Python, vector embeddings, and backend scalability.', 'Mid-Senior (3+ years)', 130000, 175000, 'Remote (US & Global)', 'Active', '2026-02-10T14:30:00Z'),
('job-03', 'found-01', 'EcoTrace AI', 'Founding Frontend & UI Architect', 'Join as employee #1 on frontend to build the enterprise carbon visualization portal. Shape the design system, data visualization charts, and responsive user experience.', 'Mid-Level (2+ years)', 95000, 135000, 'Boston, MA / Remote', 'Active', '2026-02-18T09:15:00Z')
ON CONFLICT DO NOTHING;

-- Seed job_required_skills
INSERT INTO public.job_required_skills (job_id, skill_id, is_required, weight) VALUES
('job-01', 'sk-01', True, 0.4),
('job-01', 'sk-02', True, 0.35),
('job-01', 'sk-03', True, 0.25),
('job-02', 'sk-01', True, 0.35),
('job-02', 'sk-04', True, 0.45),
('job-02', 'sk-05', True, 0.2),
('job-03', 'sk-03', True, 0.6),
('job-03', 'sk-01', False, 0.4)
ON CONFLICT DO NOTHING;

-- Seed job_applications
INSERT INTO public.job_applications (id, job_id, candidate_id, status, applied_at, notes, interview_date) VALUES
('app-01', 'job-01', 'cand-01', 'Interview', '2026-02-18T16:00:00Z', 'Top candidate with 100% verified required skills in Python, Postgres, and JS.', '2026-03-12T17:00:00Z'),
('app-02', 'job-02', 'cand-02', 'Shortlisted', '2026-02-22T10:30:00Z', 'Outstanding score on AI Integration assessment (95%).', NULL)
ON CONFLICT DO NOTHING;

-- Seed startups
INSERT INTO public.startups (id, founder_id, name, tagline, stage, industry, readiness_score, pitch, valuation_ask, team_count, created_at) VALUES
('stp-01', 'found-01', 'EcoTrace AI', 'Autonomous carbon accounting and ESG supply-chain intelligence.', 'Seed', 'CleanTech / Enterprise AI', 92.5, 'EcoTrace AI ingests raw ERP data, freight telematics, and supplier invoices to automate Scope 1, 2, and 3 emissions auditing in real-time.', '$1,200,000 for 12% equity', 3, '2026-01-10T12:00:00Z'),
('stp-02', 'found-01', 'NeuroHealth Diagnostic', 'Early biomarker screening for neurodegenerative conditions via multimodal sensory capture.', 'Pre-Seed', 'HealthTech / BioAI', 85.0, 'Non-invasive tablet app assessing subtle oculomotor and vocal tremors to detect early onset cognitive shifts.', '$600,000 for 10% equity', 2, '2026-02-05T09:00:00Z')
ON CONFLICT DO NOTHING;

-- Seed startup_ideas
INSERT INTO public.startup_ideas (id, startup_id, founder_id, problem, solution, target_customers, business_model, risks, market_size) VALUES
('idea-01', 'stp-01', 'found-01', 'Enterprises spend months and hundreds of thousands of dollars on manual sustainability consulting with outdated spreadsheet models that fail CSRD and SEC compliance.', 'An automated AI agent ingestion pipeline that connects directly to ERPs (SAP, NetSuite) and supply telemetry to calculate precise emission metrics in real-time.', 'Mid-to-large enterprise manufacturers, logistics operators, and consumer brands subject to ESG mandates.', 'B2B SaaS subscription tiered by supplier count ($24k - $96k ARR) + compliance audit report certification fees.', 'Integration complexity across legacy ERP systems; evolving regulatory emission factor benchmarks.', '$18.4 Billion global climate accounting software market by 2030.')
ON CONFLICT DO NOTHING;

-- Seed startup_proposals
INSERT INTO public.startup_proposals (id, startup_id, founder_id, investor_id, status, shared_at, ai_summary, risk_score, due_diligence_notes) VALUES
('prop-01', 'stp-01', 'found-01', 'inv-01', 'Under Review', '2026-02-15T14:00:00Z', 'EcoTrace AI is addressing a high-urgency compliance pain point in enterprise ESG auditing with an automated agentic architecture. Strong unit economics and clear regulatory tailwinds.', 'Moderate (ERP sales cycles typically 6-9 months)', 'Founder has 6 years domain expertise in supply logistics. Initial LOIs signed with 2 tier-1 pilot manufacturers.')
ON CONFLICT DO NOTHING;

-- Seed investor_interests
INSERT INTO public.investor_interests (id, investor_id, startup_id, status, note, created_at) VALUES
('int-01', 'inv-01', 'stp-01', 'Meeting Requested', 'Extremely impressed with the automated Scope 3 ingestion engine. Would love to discuss lead terms for the $1.2M seed round.', '2026-02-25T11:00:00Z')
ON CONFLICT DO NOTHING;

-- Seed meetings
INSERT INTO public.meetings (id, requester_id, recipient_id, meeting_type, scheduled_at, status, meeting_link, agenda) VALUES
('mtg-01', 'inv-01', 'found-01', 'Investor Pitch & Due Diligence', '2026-03-15T18:00:00Z', 'Confirmed', 'https://meet.google.com/xyz-idea-impact', 'Review enterprise pilot metrics, customer acquisition pipeline, and cap table.'),
('mtg-02', 'hr-01', 'cand-01', 'Technical Architecture Deep Dive', '2026-03-12T17:00:00Z', 'Confirmed', 'https://meet.google.com/nova-tech-interview', 'FastAPI async pipeline design and PostgreSQL indexing strategy.')
ON CONFLICT DO NOTHING;

-- Seed audit_logs
INSERT INTO public.audit_logs (id, event, user_id, details, timestamp) VALUES
('log-01', 'Skill Verified', 'cand-01', 'Alex Rivera passed Python & FastAPI Backend Assessment with 92% score. Badge issued.', '2026-02-14T15:20:00Z'),
('log-02', 'Proposal Shared', 'found-01', 'Sarah Lin shared EcoTrace AI Seed Proposal with Victoria Sterling (Apex Frontier Ventures).', '2026-02-15T14:00:00Z')
ON CONFLICT DO NOTHING;
