# Idea2Impact — System Architecture & Implementation Guide

## 1. Overview
**Idea2Impact** is an AI-powered digital platform designed to connect candidates, startup founders, HR professionals, and investors in a unified ecosystem:
- **Candidate Mode**: Verified technical skill assessments (75% pass mark), anti-cheat proctored focus tracking, cryptographic-stamped Skill Passport, and explainable job matching.
- **Founder Mode**: AI Startup Copilot & Idea Analyzer, multidimensional feasibility scores (Market, Technical, Financial, Operational, Competitive), 90-day roadmap, ReportLab PDF proposal export, and controlled investor sharing.
- **HR Mode**: Weighted technical job postings, explainable compatibility ranking (`Match Score = (Weight of matched skills / Total weight) * 100`), stage pipeline Kanban, and interview scheduling.
- **Investor / Sharks Mode**: Discover vetted ventures, AI due-diligence report with flagged assumptions & questions, and 1-click Shark Interest term sheet requests.

## 2. Relational Database Model
The application models all 12 core tables defined in the specification:
1. `profiles`: Common identity and role mapping.
2. `candidate_profiles`, `founder_profiles`, `hr_profiles`, `investor_profiles`: Role-specific metadata.
3. `skills`: Master skill catalogue.
4. `candidate_skills`: Relational verification mapping, assessment scores, and audit timestamps.
5. `assessments`: Timed proctored assessments and question banks.
6. `assessment_attempts`: Backend grading scores and anti-cheat tab-switch telemetry flags.
7. `jobs`: Listings with salary, level, and location.
8. `job_required_skills`: Associative table containing requirement weights (sum = 1.0).
9. `job_applications`: Application lifecycle from Applied to Offer Sent.
10. `match_results`: Cached explainable score breakdowns and learning roadmaps.
11. `startups` & `startup_ideas`: Startup vitals and AI Copilot business plans.
12. `startup_proposals` & `investor_interests`: Private access control and investor commitments.

## 3. Explainable Matching Formula
```text
Match Score = (Sum of weights of verified required skills / Total weight of required skills) * 100
```
Missing skills automatically generate a personalized **Learning Roadmap** with tailored study resources, hands-on practice projects, and instant verification call-to-actions.

## 4. PDF Generation Service
The platform employs Python's `reportlab` library to render:
- **Verified Skill Passport PDF**: Cryptographically verifiable competency transcripts for candidates.
- **Business Proposal Pitch Deck PDF**: Complete investment thesis, feasibility radar breakdown, and financial assumptions for founders.
