# TalentProof (TP)

> **From Ideas to Innovation. From Talent to Growth.**  
> A unified platform connecting candidates, founders, HR professionals, and investors through verified skills, AI-assisted startup development, recruitment, and investment discovery.

---

## 🌟 Key Differentiating Features

1. **🛡️ Verified Skill Passport**:
   - Timed technical skill assessments with backend grading.
   - Benchmark rule: Score $\ge 75\%$ awards official verified status.
   - Anti-tamper focus and tab-switch telemetry tracking.
   - 1-Click export to official **Verified Skill Passport PDF** (built with ReportLab).

2. **🤖 AI Startup Copilot & Idea Analyzer**:
   - Transforms raw ideas into structured business plans.
   - Evaluates multidimensional feasibility (Market, Technical, Financial, Operational, Defensibility).
   - Identifies customer ICPs, competitor differentiation, pricing tiers, and 90-day execution milestones.
   - 1-Click export to **Business Proposal PDF**.

3. **🎯 Explainable Talent Matching**:
   - Transparent mathematical score calculation:
     $$\text{Match Score} = \left(\frac{\sum \text{Weight of Matched Required Skills}}{\sum \text{Total Weight of Required Skills}}\right) \times 100$$
   - Clear breakdown of satisfied requirements vs. missing competencies.
   - Personalized Learning Roadmaps with curated labs and hands-on practice projects.

4. **🦈 Investor / Sharks Mode**:
   - AI Investor Proposal Assistant: Extracts core valuation assumptions, flags potential risks, and formulates high-impact founder interview questions.
   - 1-Click *"Express Shark Interest / Lead Round"* meeting requests.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (Python 3.12 included)

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Launch the Platform
```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Open in Browser
Visit [http://127.0.0.1:8000](http://127.0.0.1:8000) to access the complete application!

Use the **Demo Persona Switcher Bar** at the top of the screen to jump instantly between:
- 🌐 **Public Portal**: Ecosystem overview and platform vitals
- 🎓 **Candidate Mode**: Alex Rivera (Take quizzes, earn verified badges, view job matches)
- 🚀 **Founder Mode**: Sarah Lin / EcoTrace AI (Run AI idea analyzer, export proposals)
- 💼 **HR / Recruiter Mode**: Elena Rostova (Post weighted jobs, inspect explainable scores)
- 🦈 **Investor / Shark Mode**: Victoria Sterling (Review AI due diligence, express interest)

---

## 🧪 Running the Backend Test Suite
```bash
cd backend
python -m unittest discover tests
```

---

## 📁 Repository Structure
```
talentproof/
├── frontend/
│   ├── index.html            # Main SPA entrypoint
│   ├── css/
│   │   ├── global.css        # Design tokens & color system
│   │   ├── layout.css        # Navbar, sidebar, grid layouts
│   │   └── components.css    # Cards, badges, modals, quizzes
│   └── js/
│       ├── api.js            # Client REST API module
│       ├── state.js          # Reactive state & anti-cheat monitor
│       └── app.js            # View router & interactive controllers
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI entrypoint & static mounting
│   │   ├── config.py         # App configuration
│   │   ├── database.py       # Relational persistence & audit logs
│   │   ├── dependencies.py   # Auth resolution
│   │   ├── ai/               # AI Copilot & due diligence
│   │   ├── matching/         # Explainable matching engine
│   │   ├── services/         # ReportLab PDF generators
│   │   └── routers/          # REST API endpoints
│   ├── tests/
│   │   └── test_api.py       # Unit test suite
│   └── requirements.txt
├── docs/
│   └── ARCHITECTURE.md       # Architectural deep dive
└── README.md
```
