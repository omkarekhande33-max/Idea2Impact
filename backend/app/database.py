import json
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_store.json")

INITIAL_DATA = {
    "profiles": [
        {
            "id": "cand-01",
            "full_name": "Alex Rivera",
            "email": "alex.rivera@example.com",
            "role": "candidate",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "bio": "Full-Stack Engineer specialized in scalable Python backends, FastAPI microservices, and React SPAs.",
            "created_at": "2026-01-15T10:00:00Z"
        },
        {
            "id": "cand-02",
            "full_name": "Priya Sharma",
            "email": "priya.sharma@example.com",
            "role": "candidate",
            "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
            "bio": "AI & ML Engineer focused on LLM pipelines, RAG systems, and high-performance inference.",
            "created_at": "2026-02-10T12:00:00Z"
        },
        {
            "id": "cand-03",
            "full_name": "Jordan Lee",
            "email": "jordan.lee@example.com",
            "role": "candidate",
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            "bio": "Frontend Engineer & UI Architect proficient in responsive layouts, component libraries, and TypeScript.",
            "created_at": "2026-03-01T09:30:00Z"
        },
        {
            "id": "found-01",
            "full_name": "Sarah Lin",
            "email": "sarah.lin@ecotrace.ai",
            "role": "founder",
            "avatar_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
            "bio": "Founder & CEO at EcoTrace AI. Passionate about decarbonizing supply chains with autonomous carbon accounting.",
            "created_at": "2026-01-05T08:00:00Z"
        },
        {
            "id": "hr-01",
            "full_name": "Elena Rostova",
            "email": "elena.rostova@novatech.io",
            "role": "hr",
            "avatar_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
            "bio": "Head of Technical Talent Acquisition at NovaTech Systems. Building high-growth engineering teams.",
            "created_at": "2026-01-20T11:00:00Z"
        },
        {
            "id": "inv-01",
            "full_name": "Victoria Sterling",
            "email": "v.sterling@apexfrontier.vc",
            "role": "investor",
            "avatar_url": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80",
            "bio": "General Partner at Apex Frontier Ventures. Backing early-stage AI, Sustainability, and Enterprise SaaS.",
            "created_at": "2026-01-08T14:00:00Z"
        }
    ],
    "candidate_profiles": [
        {
            "candidate_id": "cand-01",
            "education": "B.S. in Computer Science, Georgia Tech",
            "experience_years": 4,
            "portfolio_url": "https://github.com/alexrivera-dev",
            "target_role": "Senior Full-Stack Engineer",
            "summary": "Proven track record in high-concurrency REST APIs, database optimization, and modern web application frontends."
        },
        {
            "candidate_id": "cand-02",
            "education": "M.S. in Artificial Intelligence, Carnegie Mellon",
            "experience_years": 3,
            "portfolio_url": "https://github.com/priyasharma-ai",
            "target_role": "AI / Machine Learning Engineer",
            "summary": "Specialist in fine-tuning open source LLMs, embedding architectures, and agentic workflows."
        },
        {
            "candidate_id": "cand-03",
            "education": "B.A. in Interactive Design & CS, University of Washington",
            "experience_years": 2,
            "portfolio_url": "https://jordanlee.design",
            "target_role": "Frontend Software Engineer",
            "summary": "Passionate about accessible UI systems, micro-animations, and fast client-side rendering."
        }
    ],
    "founder_profiles": [
        {
            "founder_id": "found-01",
            "company_name": "EcoTrace AI",
            "industry": "CleanTech / AI",
            "stage": "Seed",
            "pitch_deck_url": "https://ecotrace.ai/deck.pdf"
        }
    ],
    "hr_profiles": [
        {
            "hr_id": "hr-01",
            "company_name": "NovaTech Systems",
            "position": "Director of Engineering Talent",
            "website": "https://novatech.io"
        }
    ],
    "investor_profiles": [
        {
            "investor_id": "inv-01",
            "fund_name": "Apex Frontier Ventures",
            "preferred_stages": ["Seed", "Pre-Seed", "Series A"],
            "target_industries": ["AI / Machine Learning", "CleanTech", "Enterprise SaaS", "Developer Tools"],
            "min_ticket": 100000,
            "max_ticket": 1000000
        }
    ],
    "skills": [
        {
            "id": "sk-01",
            "name": "Python & FastAPI",
            "category": "Backend",
            "description": "Async programming, Pydantic validation, dependency injection, REST APIs."
        },
        {
            "id": "sk-02",
            "name": "PostgreSQL & Database Design",
            "category": "Database",
            "description": "Relational schema modeling, indexing, foreign keys, query optimization, RLS."
        },
        {
            "id": "sk-03",
            "name": "Modern JavaScript & Frontend",
            "category": "Frontend",
            "description": "ES Modules, async DOM manipulation, state management, responsive UI design."
        },
        {
            "id": "sk-04",
            "name": "AI & LLM Integration",
            "category": "AI / ML",
            "description": "Prompt orchestration, structured JSON outputs, embeddings, LangChain/LlamaIndex."
        },
        {
            "id": "sk-05",
            "name": "Cloud Deployment & Docker",
            "category": "DevOps",
            "description": "Containerization, CI/CD pipelines, container orchestration, static hosting."
        },
        {
            "id": "sk-06",
            "name": "System Architecture & Security",
            "category": "Architecture",
            "description": "Role-based access control (RBAC), token authentication, API rate limiting, sanitization."
        },
        {
            "id": "sk-dist-sys",
            "name": "Distributed Systems",
            "slug": "distributed-systems",
            "category": "Cloud & Systems",
            "description": "CAP theorem, Paxos & Raft consensus algorithms, distributed transactions (2PC & Saga patterns), eventual consistency, idempotency, and message queues."
        },
        {
            "id": "sk-docker-k8s",
            "name": "Docker & Kubernetes",
            "slug": "docker-kubernetes",
            "category": "DevOps & Cloud",
            "description": "Multi-stage Docker builds, layer caching, Kubernetes Pods, Deployments, StatefulSets, Services, Ingress, and horizontal pod autoscaling (HPA)."
        },
        {
            "id": "sk-redis",
            "name": "Redis Caching",
            "slug": "redis-caching",
            "category": "Databases & Tools",
            "description": "In-memory data structures (Hashes, Sorted Sets), Cache-Aside and Write-Through caching patterns, TTL expiration, Redis Pub/Sub, and distributed locking."
        },
        {
            "id": "sk-cloud-arch",
            "name": "Cloud Architecture",
            "slug": "cloud-architecture",
            "category": "Cloud & Systems",
            "description": "Multi-AZ high availability, multi-region disaster recovery (RTO/RPO), 12-factor cloud apps, VPC networking, security groups, and Circuit Breaker patterns."
        }
    ],
    "candidate_skills": [
        {
            "candidate_id": "cand-01",
            "skill_id": "sk-01",
            "skill_name": "Python & FastAPI",
            "assessment_score": 100.0,
            "quiz_score": 100.0,
            "is_verified": True,
            "verified_at": "2026-10-21T15:17:55.686818+00:00"
        },
        {
            "candidate_id": "cand-01",
            "skill_id": "sk-java",
            "skill_name": "Java",
            "assessment_score": 80.0,
            "quiz_score": 80.0,
            "is_verified": True,
            "verified_at": "2026-10-21T17:00:00.000000+00:00"
        },
        {
            "candidate_id": "cand-01",
            "skill_id": "sk-asm-js",
            "skill_name": "asm-js",
            "assessment_score": 100.0,
            "quiz_score": 100.0,
            "is_verified": True,
            "verified_at": "2026-10-21T17:00:00.000000+00:00"
        },
        {
            "candidate_id": "cand-02",
            "skill_id": "sk-01",
            "assessment_score": 85.0,
            "is_verified": True,
            "verified_at": "2026-02-18T09:00:00Z"
        },
        {
            "candidate_id": "cand-02",
            "skill_id": "sk-04",
            "assessment_score": 95.0,
            "is_verified": True,
            "verified_at": "2026-02-20T14:30:00Z"
        },
        {
            "candidate_id": "cand-03",
            "skill_id": "sk-03",
            "assessment_score": 90.0,
            "is_verified": True,
            "verified_at": "2026-03-02T16:00:00Z"
        }
    ],
    "assessments": [
        {
            "id": "asm-01",
            "skill_id": "sk-01",
            "title": "Python & FastAPI Production Services Assessment",
            "passing_score": 75.0,
            "duration_minutes": 15,
            "questions": [
                {
                    "id": "pyd_q1",
                    "text": "In FastAPI, how does declaring an endpoint handler with 'async def' differ from declaring it with standard synchronous 'def'?",
                    "options": [
                        "'async def' forces FastAPI to spin up a new OS thread per request, whereas 'def' uses a single thread",
                        "'async def' routes run directly on the event loop (must never block), whereas 'def' routes are dispatched to an external worker threadpool",
                        "'def' routes cannot use Pydantic models or dependency injection",
                        "'async def' disables CORS and request validation for higher performance"
                    ],
                    "correct_index": 1,
                    "explanation": "FastAPI executes 'async def' functions cooperatively on the main asyncio event loop, while standard 'def' functions are offloaded to an external AnyIO threadpool to prevent blocking the event loop."
                },
                {
                    "id": "pyd_q2",
                    "text": "What is the primary role of FastAPI's 'Depends()' dependency injection system?",
                    "options": [
                        "To automatically generate database migration scripts and ORM tables",
                        "To declare shared logic (auth, database sessions, query parameters) that FastAPI resolves hierarchically before executing the route handler",
                        "To inject JavaScript client-side bundles into HTML templates",
                        "To measure CPU and memory usage of individual HTTP endpoints"
                    ],
                    "correct_index": 1,
                    "explanation": "Depends() enables clean modular architectures where dependencies (such as auth token verification or database sessions) are instantiated, validated, and yield-cleaned automatically per request."
                },
                {
                    "id": "pyd_q3",
                    "text": "In Pydantic v2 / FastAPI, what is the recommended way to validate that a string field conforms to a valid email format?",
                    "options": [
                        "Use a regular expression directly inside every route handler with re.match()",
                        "Declare the field using Pydantic's EmailStr type",
                        "Cast the incoming payload to a Python dictionary and check for '@' manually",
                        "Enable the --verify-emails flag in the Uvicorn command line"
                    ],
                    "correct_index": 1,
                    "explanation": "Pydantic provides EmailStr (backed by email-validator), which automatically performs RFC-compliant email syntax validation during request parsing."
                },
                {
                    "id": "pyd_q4",
                    "text": "How should an asynchronous FastAPI service execute a lightweight task (like sending an email or audit logging) after returning the HTTP response?",
                    "options": [
                        "Use time.sleep() inside the route before the return statement",
                        "Add a parameter of type BackgroundTasks and call background_tasks.add_task(func, *args)",
                        "Fork a new child process with os.fork()",
                        "Block the client response with an infinite while loop"
                    ],
                    "correct_index": 1,
                    "explanation": "FastAPI's BackgroundTasks allows route handlers to schedule callables that run after the response has been sent to the client, preventing latency spikes for the caller."
                },
                {
                    "id": "pyd_q5",
                    "text": "When building high-throughput FastAPI services with async database drivers, why must you NEVER execute synchronous blocking I/O (e.g. requests.get or time.sleep)?",
                    "options": [
                        "FastAPI will throw a SyntaxError at compile time",
                        "Blocking the single event loop thread stops ALL concurrent async requests from being processed until the blocking call finishes",
                        "It permanently disables database connection pooling",
                        "It causes the ASGI server to drop SSL certificates"
                    ],
                    "correct_index": 1,
                    "explanation": "Because asyncio relies on cooperative multitasking on a single thread, any blocking synchronous call stops the entire event loop, freezing all concurrent requests."
                }
            ]
        },
        {
            "id": "asm-02",
            "skill_id": "sk-02",
            "title": "PostgreSQL & Relational Design Assessment",
            "passing_score": 75.0,
            "duration_minutes": 15,
            "questions": [
                {
                    "id": "q1",
                    "text": "What is the primary architectural purpose of Row Level Security (RLS) in PostgreSQL?",
                    "options": [
                        "Compressing table rows on disk to save storage",
                        "Restricting which rows a database user or session can select, update, or delete based on SQL policies",
                        "Creating read-only replicas across multiple geographical regions",
                        "Automatically converting JSON fields into B-Trees"
                    ],
                    "correct_index": 1,
                    "explanation": "RLS applies security filters directly in the database engine, preventing unauthorized row leakage regardless of application flaws."
                },
                {
                    "id": "q2",
                    "text": "When establishing a relationship where each Job Listing requires multiple skills with custom weights, which relational pattern is ideal?",
                    "options": [
                        "A single CSV column in the jobs table",
                        "A junction / associative table (job_required_skills) with foreign keys to jobs and skills",
                        "Duplicate job rows for every single skill",
                        "Store unindexed text blobs"
                    ],
                    "correct_index": 1,
                    "explanation": "An associative table allows clean Many-to-Many mappings, relational integrity, indexing, and per-skill metadata such as weight."
                },
                {
                    "id": "q3",
                    "text": "What type of index is most effective in PostgreSQL for high-speed lookup on an exact UUID primary key?",
                    "options": [
                        "B-Tree index (default)",
                        "GIN full-text index",
                        "BRIN index",
                        "Spatial R-Tree index"
                    ],
                    "correct_index": 0,
                    "explanation": "B-Tree indexes provide logarithmic O(log N) lookups and are the default standard index for equality lookups."
                },
                {
                    "id": "q4",
                    "text": "What is the consequence of adding 'ON DELETE CASCADE' to a foreign key constraint from job_applications to candidates?",
                    "options": [
                        "Candidate deletion will fail if applications exist",
                        "Deleting the candidate profile automatically purges all related application records",
                        "The foreign key is converted into a loose pointer",
                        "Candidate records become anonymous"
                    ],
                    "correct_index": 1,
                    "explanation": "ON DELETE CASCADE propagates the delete operation to dependent child rows automatically."
                }
            ]
        },
        {
            "id": "asm-03",
            "skill_id": "sk-03",
            "title": "Modern JavaScript & Responsive Web Assessment",
            "passing_score": 75.0,
            "duration_minutes": 15,
            "questions": [
                {
                    "id": "q1",
                    "text": "Why is using ES Modules ('import' / 'export' with type='module') advantageous in modern vanilla web apps?",
                    "options": [
                        "It eliminates the need for any CSS styling",
                        "It enables scoped modular code without global variable collisions and supports native browser loading",
                        "It forces synchronous execution of all scripts",
                        "It prevents fetch requests from failing"
                    ],
                    "correct_index": 1,
                    "explanation": "ES Modules provide isolated scopes, strict mode enforcement, and clean code organization without global namespace pollution."
                },
                {
                    "id": "q2",
                    "text": "Which CSS layout method is best suited for a 2-dimensional dashboard grid with responsive sidebar and main content?",
                    "options": [
                        "Float layout with clearfix",
                        "CSS Grid (grid-template-columns / grid-template-rows)",
                        "Inline-block elements with vertical-align",
                        "Table elements"
                    ],
                    "correct_index": 1,
                    "explanation": "CSS Grid is purpose-built for two-dimensional structured dashboard layouts with seamless responsive adaptability."
                },
                {
                    "id": "q3",
                    "text": "How can a web app detect when a candidate navigates away or switches browser tabs during an active proctored assessment?",
                    "options": [
                        "Listen to 'visibilitychange' on document and 'blur' on window",
                        "Inspect the user's desktop taskbar via navigator",
                        "Read local process memory through WebSocket",
                        "Check screen brightness values"
                    ],
                    "correct_index": 0,
                    "explanation": "Document visibilitychange and window blur events reliably detect when the user minimizes the tab or switches apps."
                },
                {
                    "id": "q4",
                    "text": "What is the key advantage of client-side optimistic UI updates combined with API synchronization?",
                    "options": [
                        "It eliminates the need for a database",
                        "It provides instant, zero-latency feedback to the user while keeping server data consistent",
                        "It automatically solves all network outages permanently",
                        "It bypasses authentication requirements"
                    ],
                    "correct_index": 1,
                    "explanation": "Optimistic UI immediately reflects user actions on screen while performing asynchronous network requests in the background."
                }
            ]
        },
        {
            "id": "asm-04",
            "skill_id": "sk-04",
            "title": "AI & LLM Integration Architecture Assessment",
            "passing_score": 75.0,
            "duration_minutes": 15,
            "questions": [
                {
                    "id": "q1",
                    "text": "When building an AI Startup Copilot, why should the backend enforce structured JSON schema validation on LLM output?",
                    "options": [
                        "To prevent the browser from having to parse text and guarantee predictable UI rendering of fields like risks and assumptions",
                        "Because LLMs cannot output plain English",
                        "To reduce cloud server electricity consumption",
                        "To encrypt the prompt tokens"
                    ],
                    "correct_index": 0,
                    "explanation": "Enforcing structured JSON guarantees that downstream frontend components receive guaranteed typed fields without parser crashes."
                },
                {
                    "id": "q2",
                    "text": "Why must AI API keys (such as OpenAI, Gemini, or Anthropic keys) NEVER be exposed in browser client JavaScript?",
                    "options": [
                        "Browsers do not support UTF-8 characters",
                        "Any user can inspect network traffic or source code, steal the key, and rack up unauthorized API bills",
                        "API keys slow down CSS rendering",
                        "The browser console will automatically deactivate the key"
                    ],
                    "correct_index": 1,
                    "explanation": "Client-side secrets are fully accessible to end users; API credentials must strictly reside on the secured backend."
                },
                {
                    "id": "q3",
                    "text": "According to the Idea2Impact architectural principles, how should AI-generated evaluations and startup risks be treated?",
                    "options": [
                        "As infallible guarantees of financial success or failure",
                        "As assistive decision support for human judgment, clearly labeled with assumptions rather than certainty",
                        "As legal binding contracts for venture capital",
                        "As automatic rejections for startup founders"
                    ],
                    "correct_index": 1,
                    "explanation": "AI models provide decision support and summarize assumptions, but human judgment remains the ultimate authority."
                },
                {
                    "id": "q4",
                    "text": "What is the purpose of Retrieval-Augmented Generation (RAG) in corporate candidate or startup discovery?",
                    "options": [
                        "Grounding model responses in verifiable database documents and private profiles to prevent hallucinations",
                        "Replacing all SQL database tables with text embeddings",
                        "Converting PDFs to image files",
                        "Compressing video streams"
                    ],
                    "correct_index": 0,
                    "explanation": "RAG retrieves specific facts and profiles from verified databases before prompting the model, anchoring the generation in real data."
                }
            ]
        }
    ],
    "assessment_attempts": [
        {
            "id": "att-01",
            "candidate_id": "cand-01",
            "assessment_id": "asm-01",
            "score": 92.0,
            "passed": True,
            "flags": ["tab_switches: 0", "clean_session"],
            "completed_at": "2026-02-14T15:20:00Z"
        },
        {
            "id": "att-02",
            "candidate_id": "cand-01",
            "assessment_id": "asm-02",
            "score": 88.0,
            "passed": True,
            "flags": ["tab_switches: 0", "clean_session"],
            "completed_at": "2026-02-15T10:15:00Z"
        }
    ],
    "jobs": [
        {
            "id": "job-01",
            "created_by": "hr-01",
            "company_name": "NovaTech Systems",
            "title": "Senior Full-Stack Platform Engineer",
            "description": "Lead the core platform engineering team building next-generation cloud analytics and microservices. You will design robust Python/FastAPI services, design high-throughput PostgreSQL schemas, and craft delightful responsive interfaces.",
            "experience_level": "Senior (4+ years)",
            "salary_min": 120000,
            "salary_max": 160000,
            "location": "San Francisco, CA (Hybrid / Remote)",
            "status": "Active",
            "created_at": "2026-02-01T10:00:00Z"
        },
        {
            "id": "job-02",
            "created_by": "hr-01",
            "company_name": "NovaTech Systems",
            "title": "AI Systems & Inference Engineer",
            "description": "Architect and optimize high-throughput LLM pipelines, prompt orchestration, and autonomous agent systems. Must have deep experience in Python, vector embeddings, and backend scalability.",
            "experience_level": "Mid-Senior (3+ years)",
            "salary_min": 130000,
            "salary_max": 175000,
            "location": "Remote (US & Global)",
            "status": "Active",
            "created_at": "2026-02-10T14:30:00Z"
        },
        {
            "id": "job-03",
            "created_by": "found-01",
            "company_name": "EcoTrace AI",
            "title": "Founding Frontend & UI Architect",
            "description": "Join as employee #1 on frontend to build the enterprise carbon visualization portal. Shape the design system, data visualization charts, and responsive user experience.",
            "experience_level": "Mid-Level (2+ years)",
            "salary_min": 95000,
            "salary_max": 135000,
            "location": "Boston, MA / Remote",
            "status": "Active",
            "created_at": "2026-02-18T09:15:00Z"
        }
    ],
    "job_required_skills": [
        # Job 01: Full-Stack Engineer
        {"job_id": "job-01", "skill_id": "sk-01", "is_required": True, "weight": 0.40},
        {"job_id": "job-01", "skill_id": "sk-02", "is_required": True, "weight": 0.35},
        {"job_id": "job-01", "skill_id": "sk-03", "is_required": True, "weight": 0.25},
        # Job 02: AI Systems Engineer
        {"job_id": "job-02", "skill_id": "sk-01", "is_required": True, "weight": 0.35},
        {"job_id": "job-02", "skill_id": "sk-04", "is_required": True, "weight": 0.45},
        {"job_id": "job-02", "skill_id": "sk-05", "is_required": True, "weight": 0.20},
        # Job 03: Founding Frontend Engineer
        {"job_id": "job-03", "skill_id": "sk-03", "is_required": True, "weight": 0.60},
        {"job_id": "job-03", "skill_id": "sk-01", "is_required": False, "weight": 0.40}
    ],
    "job_applications": [
        {
            "id": "app-01",
            "job_id": "job-01",
            "candidate_id": "cand-01",
            "status": "Interview",
            "applied_at": "2026-02-18T16:00:00Z",
            "notes": "Top candidate with 100% verified required skills in Python, Postgres, and JS.",
            "interview_date": "2026-03-12T17:00:00Z"
        },
        {
            "id": "app-02",
            "job_id": "job-02",
            "candidate_id": "cand-02",
            "status": "Shortlisted",
            "applied_at": "2026-02-22T10:30:00Z",
            "notes": "Outstanding score on AI Integration assessment (95%).",
            "interview_date": None
        }
    ],
    "startups": [
        {
            "id": "stp-01",
            "founder_id": "found-01",
            "name": "EcoTrace AI",
            "tagline": "Autonomous carbon accounting and ESG supply-chain intelligence.",
            "stage": "Seed",
            "industry": "CleanTech / Enterprise AI",
            "readiness_score": 92.5,
            "pitch": "EcoTrace AI ingests raw ERP data, freight telematics, and supplier invoices to automate Scope 1, 2, and 3 emissions auditing in real-time.",
            "valuation_ask": "$1,200,000 for 12% equity",
            "team_count": 3,
            "created_at": "2026-01-10T12:00:00Z"
        },
        {
            "id": "stp-02",
            "founder_id": "found-01",
            "name": "NeuroHealth Diagnostic",
            "tagline": "Early biomarker screening for neurodegenerative conditions via multimodal sensory capture.",
            "stage": "Pre-Seed",
            "industry": "HealthTech / BioAI",
            "readiness_score": 85.0,
            "pitch": "Non-invasive tablet app assessing subtle oculomotor and vocal tremors to detect early onset cognitive shifts.",
            "valuation_ask": "$600,000 for 10% equity",
            "team_count": 2,
            "created_at": "2026-02-05T09:00:00Z"
        }
    ],
    "startup_ideas": [
        {
            "id": "idea-01",
            "startup_id": "stp-01",
            "founder_id": "found-01",
            "problem": "Enterprises spend months and hundreds of thousands of dollars on manual sustainability consulting with outdated spreadsheet models that fail CSRD and SEC compliance.",
            "solution": "An automated AI agent ingestion pipeline that connects directly to ERPs (SAP, NetSuite) and supply telemetry to calculate precise emission metrics in real-time.",
            "target_customers": "Mid-to-large enterprise manufacturers, logistics operators, and consumer brands subject to ESG mandates.",
            "business_model": "B2B SaaS subscription tiered by supplier count ($24k - $96k ARR) + compliance audit report certification fees.",
            "risks": "Integration complexity across legacy ERP systems; evolving regulatory emission factor benchmarks.",
            "market_size": "$18.4 Billion global climate accounting software market by 2030."
        }
    ],
    "startup_proposals": [
        {
            "id": "prop-01",
            "startup_id": "stp-01",
            "founder_id": "found-01",
            "investor_id": "inv-01",
            "status": "Under Review",
            "shared_at": "2026-02-15T14:00:00Z",
            "ai_summary": "EcoTrace AI is addressing a high-urgency compliance pain point in enterprise ESG auditing with an automated agentic architecture. Strong unit economics and clear regulatory tailwinds.",
            "risk_score": "Moderate (ERP sales cycles typically 6-9 months)",
            "due_diligence_notes": "Founder has 6 years domain expertise in supply logistics. Initial LOIs signed with 2 tier-1 pilot manufacturers."
        }
    ],
    "investor_interests": [
        {
            "id": "int-01",
            "investor_id": "inv-01",
            "startup_id": "stp-01",
            "status": "Meeting Requested",
            "note": "Extremely impressed with the automated Scope 3 ingestion engine. Would love to discuss lead terms for the $1.2M seed round.",
            "created_at": "2026-02-25T11:00:00Z"
        }
    ],
    "meetings": [
        {
            "id": "mtg-01",
            "requester_id": "inv-01",
            "recipient_id": "found-01",
            "meeting_type": "Investor Pitch & Due Diligence",
            "scheduled_at": "2026-03-15T18:00:00Z",
            "status": "Confirmed",
            "meeting_link": "https://meet.google.com/xyz-idea-impact",
            "agenda": "Review enterprise pilot metrics, customer acquisition pipeline, and cap table."
        },
        {
            "id": "mtg-02",
            "requester_id": "hr-01",
            "recipient_id": "cand-01",
            "meeting_type": "Technical Architecture Deep Dive",
            "scheduled_at": "2026-03-12T17:00:00Z",
            "status": "Confirmed",
            "meeting_link": "https://meet.google.com/nova-tech-interview",
            "agenda": "FastAPI async pipeline design and PostgreSQL indexing strategy."
        }
    ],
    "audit_logs": [
        {
            "id": "log-01",
            "event": "Skill Verified",
            "user_id": "cand-01",
            "details": "Alex Rivera passed Python & FastAPI Backend Assessment with 92% score. Badge issued.",
            "timestamp": "2026-02-14T15:20:00Z"
        },
        {
            "id": "log-02",
            "event": "Proposal Shared",
            "user_id": "found-01",
            "details": "Sarah Lin shared EcoTrace AI Seed Proposal with Victoria Sterling (Apex Frontier Ventures).",
            "timestamp": "2026-02-15T14:00:00Z"
        }
    ],
    "messages": [
        {
            "id": "msg-01",
            "sender_id": "cand-01",
            "sender_role": "candidate",
            "sender_name": "Alex Rivera",
            "receiver_id": "hr-01",
            "receiver_role": "hr",
            "receiver_name": "Elena Rostova",
            "text": "Hi Elena! I just completed the Python & FastAPI production assessment with a 92% score. I'm very interested in the Senior Full-Stack Engineer role at NovaTech Systems.",
            "channel": "candidate",
            "timestamp": "2026-03-01T10:15:00Z",
            "is_read": True
        },
        {
            "id": "msg-02",
            "sender_id": "hr-01",
            "sender_role": "hr",
            "sender_name": "Elena Rostova",
            "receiver_id": "cand-01",
            "receiver_role": "candidate",
            "receiver_name": "Alex Rivera",
            "text": "Hello Alex, impressive performance on the assessment! Your 75/25 compatibility score came out to 94%. We'd love to schedule a technical architecture discussion with our engineering lead.",
            "channel": "candidate",
            "timestamp": "2026-03-01T10:30:00Z",
            "is_read": True
        },
        {
            "id": "msg-03",
            "sender_id": "cand-01",
            "sender_role": "candidate",
            "sender_name": "Alex Rivera",
            "receiver_id": "hr-01",
            "receiver_role": "hr",
            "receiver_name": "Elena Rostova",
            "text": "Thank you Elena! I'm available this Thursday or Friday afternoon. Looking forward to discussing the async microservices pipeline.",
            "channel": "candidate",
            "timestamp": "2026-03-01T10:45:00Z",
            "is_read": True
        },
        {
            "id": "msg-04",
            "sender_id": "cand-02",
            "sender_role": "candidate",
            "sender_name": "Priya Sharma",
            "receiver_id": "hr-01",
            "receiver_role": "hr",
            "receiver_name": "Elena Rostova",
            "text": "Hi Elena, I saw NovaTech's open AI Systems role. I've verified my skills in LLM fine-tuning and agentic pipelines with a 95% assessment rating.",
            "channel": "candidate",
            "timestamp": "2026-03-02T14:10:00Z",
            "is_read": True
        },
        {
            "id": "msg-05",
            "sender_id": "hr-01",
            "sender_role": "hr",
            "sender_name": "Elena Rostova",
            "receiver_id": "cand-02",
            "receiver_role": "candidate",
            "receiver_name": "Priya Sharma",
            "text": "Hi Priya, your credentials look fantastic. We are building an enterprise autonomous agent suite and your background is a great match. Are you free for an exploratory call?",
            "channel": "candidate",
            "timestamp": "2026-03-02T14:35:00Z",
            "is_read": True
        },
        {
            "id": "msg-06",
            "sender_id": "cand-02",
            "sender_role": "candidate",
            "sender_name": "Priya Sharma",
            "receiver_id": "hr-01",
            "receiver_role": "hr",
            "receiver_name": "Elena Rostova",
            "text": "Absolutely! I can jump on a Google Meet tomorrow at 3 PM UTC. Let me know if that works for your team.",
            "channel": "candidate",
            "timestamp": "2026-03-02T14:50:00Z",
            "is_read": False
        },
        {
            "id": "msg-07",
            "sender_id": "cand-03",
            "sender_role": "candidate",
            "sender_name": "Jordan Lee",
            "receiver_id": "hr-01",
            "receiver_role": "hr",
            "receiver_name": "Elena Rostova",
            "text": "Hello Elena, I've submitted my application for the UI Architect position. My portfolio showcases our design system and interactive dashboards.",
            "channel": "candidate",
            "timestamp": "2026-03-03T09:20:00Z",
            "is_read": True
        },
        {
            "id": "msg-08",
            "sender_id": "hr-01",
            "sender_role": "hr",
            "sender_name": "Elena Rostova",
            "receiver_id": "cand-03",
            "receiver_role": "candidate",
            "receiver_name": "Jordan Lee",
            "text": "Thanks Jordan! We're reviewing your design showcase alongside our front-end lead. We'll follow up shortly with next steps.",
            "channel": "candidate",
            "timestamp": "2026-03-03T09:40:00Z",
            "is_read": True
        },
        {
            "id": "msg-09",
            "sender_id": "found-01",
            "sender_role": "founder",
            "sender_name": "Sarah Lin",
            "receiver_id": "hr-01",
            "receiver_role": "hr",
            "receiver_name": "Elena Rostova",
            "text": "Hi Elena, I just shared our hiring specification for EcoTrace AI via Gemini Pro Studio. We urgently need a Lead Backend Engineer with 75% core FastAPI & PostgreSQL and 25% Docker/Kubernetes.",
            "channel": "founder",
            "timestamp": "2026-03-01T11:00:00Z",
            "is_read": True
        },
        {
            "id": "msg-10",
            "sender_id": "hr-01",
            "sender_role": "hr",
            "sender_name": "Elena Rostova",
            "receiver_id": "found-01",
            "receiver_role": "founder",
            "receiver_name": "Sarah Lin",
            "text": "Hi Sarah! I received the hiring specification and official PDF. We already ran it through our 75/25 dual-tier matching engine and identified 2 candidates with >80% compatibility (including Alex Rivera at 94%).",
            "channel": "founder",
            "timestamp": "2026-03-01T11:25:00Z",
            "is_read": True
        },
        {
            "id": "msg-11",
            "sender_id": "found-01",
            "sender_role": "founder",
            "sender_name": "Sarah Lin",
            "receiver_id": "hr-01",
            "receiver_role": "hr",
            "receiver_name": "Elena Rostova",
            "text": "That's incredible turnaround! Could you please share their verified passports and arrange initial technical screens for this week?",
            "channel": "founder",
            "timestamp": "2026-03-01T11:45:00Z",
            "is_read": False
        },
        {
            "id": "msg-12",
            "sender_id": "found-02",
            "sender_role": "founder",
            "sender_name": "Marcus Vance",
            "receiver_id": "hr-01",
            "receiver_role": "hr",
            "receiver_name": "Elena Rostova",
            "text": "Elena, our Series A round is closing soon and we need to ramp up our distributed systems team. Do you have verified candidates with consensus protocol experience?",
            "channel": "founder",
            "timestamp": "2026-03-03T16:15:00Z",
            "is_read": True
        },
        {
            "id": "msg-13",
            "sender_id": "hr-01",
            "sender_role": "hr",
            "sender_name": "Elena Rostova",
            "receiver_id": "found-02",
            "receiver_role": "founder",
            "receiver_name": "Marcus Vance",
            "text": "Hi Marcus, yes! We have candidates with verified badges in Distributed Systems and Redis Caching. I will compile a dedicated dossier for HyperScale Data today.",
            "channel": "founder",
            "timestamp": "2026-03-03T16:40:00Z",
            "is_read": True
        }
    ]
}

class Database:
    def __init__(self):
        self._data: Dict[str, List[Dict[str, Any]]] = {}
        self.load()

    def _migrate_users(self):
        try:
            from .security.auth import hash_password
            default_pw_hash = hash_password("password123")
            profiles = self._data.setdefault("profiles", [])
            for p in profiles:
                if not p.get("username"):
                    p["username"] = p["email"].split("@")[0].replace(".", "").lower()
                if not p.get("password_hash"):
                    p["password_hash"] = default_pw_hash
                if not p.get("auth_provider"):
                    p["auth_provider"] = "local"
        except Exception as e:
            print(f"User migration notice: {e}")

    def load(self):
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
                    self._migrate_users()
                    return
            except Exception as e:
                print(f"Error loading {DB_FILE}, resetting to initial data: {e}")
        self._data = json.loads(json.dumps(INITIAL_DATA))
        self._migrate_users()
        self.save()

    def save(self):
        try:
            with open(DB_FILE, "w", encoding="utf-8") as f:
                json.dump(self._data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving to {DB_FILE}: {e}")

    def find_user(self, identifier: str) -> Optional[Dict[str, Any]]:
        ident = identifier.strip().lower()
        return self.find_one(
            "profiles",
            lambda p: p.get("email", "").lower() == ident or p.get("username", "").lower() == ident
        )

    def get_table(self, table_name: str) -> List[Dict[str, Any]]:
        return self._data.setdefault(table_name, [])

    def find_one(self, table_name: str, filter_fn) -> Optional[Dict[str, Any]]:
        table = self.get_table(table_name)
        for row in table:
            if filter_fn(row):
                return row
        return None

    def find_many(self, table_name: str, filter_fn) -> List[Dict[str, Any]]:
        table = self.get_table(table_name)
        return [row for row in table if filter_fn(row)]

    def insert(self, table_name: str, record: Dict[str, Any]) -> Dict[str, Any]:
        if "id" not in record:
            record["id"] = f"{table_name[:4]}-{str(uuid.uuid4())[:8]}"
        self.get_table(table_name).append(record)
        self.save()
        return record

    def update(self, table_name: str, filter_fn, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        row = self.find_one(table_name, filter_fn)
        if row:
            row.update(updates)
            self.save()
            return row
        return None

    def delete(self, table_name: str, filter_fn) -> bool:
        table = self.get_table(table_name)
        orig_len = len(table)
        self._data[table_name] = [r for r in table if not filter_fn(r)]
        if len(self._data[table_name]) != orig_len:
            self.save()
            return True
        return False

    def log_audit(self, event: str, user_id: str, details: str):
        self.insert("audit_logs", {
            "id": f"log-{str(uuid.uuid4())[:8]}",
            "event": event,
            "user_id": user_id,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

db = Database()
