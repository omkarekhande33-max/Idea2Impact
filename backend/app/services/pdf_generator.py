import os
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from typing import Dict, Any, List

def generate_business_proposal_pdf(startup_data: Dict[str, Any], analysis_data: Dict[str, Any]) -> bytes:
    """Generates a professional business proposal PDF using ReportLab."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    primary_color = colors.HexColor("#14213D")
    secondary_color = colors.HexColor("#2563EB")
    accent_color = colors.HexColor("#14B8A6")
    text_dark = colors.HexColor("#1E293B")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=secondary_color,
        spaceAfter=15
    )
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=text_dark,
        spaceAfter=8
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#64748B"),
        spaceBefore=15
    )
    
    story = []
    
    # Header Banner
    name = startup_data.get("name", "Startup Pitch")
    tagline = startup_data.get("tagline", "Autonomous Innovation")
    industry = startup_data.get("industry", "Technology")
    stage = startup_data.get("stage", "Seed")
    ask = startup_data.get("valuation_ask", "Capital Seeking")
    
    story.append(Paragraph(f"Idea2Impact Proposal: {name}", title_style))
    story.append(Paragraph(f"{tagline} | Stage: {stage} | Industry: {industry}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceBefore=0, spaceAfter=12))
    
    # Overview Table
    meta_data = [
        [Paragraph("<b>Company:</b>", body_style), Paragraph(name, body_style),
         Paragraph("<b>Funding Ask:</b>", body_style), Paragraph(ask, body_style)],
        [Paragraph("<b>Industry:</b>", body_style), Paragraph(industry, body_style),
         Paragraph("<b>Feasibility Score:</b>", body_style), Paragraph(f"{analysis_data.get('feasibility_score', 86)}/100", body_style)],
        [Paragraph("<b>Date:</b>", body_style), Paragraph(datetime.now().strftime("%B %d, %Y"), body_style),
         Paragraph("<b>Status:</b>", body_style), Paragraph("Confidential / Private Share", body_style)]
    ]
    t_meta = Table(meta_data, colWidths=[100, 160, 100, 160])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))
    
    # Executive Summary
    story.append(Paragraph("1. Executive Summary", heading_style))
    exec_summary = analysis_data.get("executive_summary", startup_data.get("pitch", "Innovative platform solving key industry challenges."))
    story.append(Paragraph(exec_summary, body_style))
    
    # Problem & Solution
    fit = analysis_data.get("problem_solution_fit", {})
    story.append(Paragraph("2. Problem & Proposed Solution", heading_style))
    story.append(Paragraph(f"<b>Core Problem:</b> {fit.get('core_pain_point', 'Critical enterprise bottleneck.')}", body_style))
    story.append(Paragraph(f"<b>Solution Mechanism:</b> {fit.get('solution_mechanism', 'Scalable modern software.')}", body_style))
    story.append(Paragraph(f"<b>Value Multiplier:</b> {fit.get('value_prop_multiplier', 'Significant speed advantage.')}", body_style))
    
    # Business Model & Pricing
    bm = analysis_data.get("business_model_breakdown", {})
    story.append(Paragraph("3. Business Model & Commercialization", heading_style))
    story.append(Paragraph(f"<b>Revenue Model:</b> {bm.get('primary_revenue_stream', 'SaaS subscriptions.')}", body_style))
    story.append(Paragraph(f"<b>Gross Margins:</b> {bm.get('projected_gross_margin', '80%+ software margins.')}", body_style))
    
    # Feasibility Dimensions Table
    dims = analysis_data.get("dimensions", {})
    if dims:
        story.append(Paragraph("4. Multidimensional Feasibility Analysis", heading_style))
        dim_rows = [
            [Paragraph("<b>Dimension</b>", body_style), Paragraph("<b>Score</b>", body_style), Paragraph("<b>Assessment</b>", body_style)],
            [Paragraph("Market Demand", body_style), Paragraph(f"{dims.get('market_demand', 85)}%", body_style), Paragraph("Strong demand and clear urgent customer pain point", body_style)],
            [Paragraph("Technical Viability", body_style), Paragraph(f"{dims.get('technical_viability', 85)}%", body_style), Paragraph("Standard scalable cloud and AI pipeline implementation", body_style)],
            [Paragraph("Financial Sustainability", body_style), Paragraph(f"{dims.get('financial_sustainability', 80)}%", body_style), Paragraph("Sound unit economics with high recurring margins", body_style)],
            [Paragraph("Operational Execution", body_style), Paragraph(f"{dims.get('operational_execution', 80)}%", body_style), Paragraph("Direct sales and product-led onboarding trajectory", body_style)],
            [Paragraph("Competitive Defensibility", body_style), Paragraph(f"{dims.get('competitive_defensibility', 82)}%", body_style), Paragraph("Network effects and high workflow data stickiness", body_style)]
        ]
        t_dims = Table(dim_rows, colWidths=[150, 70, 300])
        t_dims.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#14213D")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_dims)
        story.append(Spacer(1, 10))

    # Milestones
    milestones = analysis_data.get("milestones_90_days", [])
    if milestones:
        story.append(Paragraph("5. 90-Day Execution Roadmap", heading_style))
        for m in milestones:
            story.append(Paragraph(f"• <b>{m.get('day')}:</b> {m.get('goal')}", body_style))

    story.append(Paragraph("Confidential document generated by Idea2Impact Platform. AI-assisted evaluations support human judgment and do not represent financial guarantees.", disclaimer_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def generate_candidate_passport_pdf(candidate_data: Dict[str, Any], verified_skills: List[Dict[str, Any]]) -> bytes:
    """Generates a verified candidate skill passport PDF."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    primary = colors.HexColor("#14213D")
    accent = colors.HexColor("#14B8A6")
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=22, textColor=primary, spaceAfter=4)
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontName='Helvetica', fontSize=11, textColor=colors.HexColor("#2563EB"), spaceAfter=12)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=13, textColor=primary, spaceBefore=10, spaceAfter=6)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=14, textColor=colors.HexColor("#1E293B"))

    story = []
    
    name = candidate_data.get("full_name", "Candidate")
    story.append(Paragraph("Idea2Impact Verified Skill Passport", title_style))
    story.append(Paragraph(f"Official Verified Competency Record for {name}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=accent, spaceBefore=0, spaceAfter=14))

    # Profile summary
    cand_info = [
        [Paragraph("<b>Candidate Name:</b>", body_style), Paragraph(name, body_style),
         Paragraph("<b>Email:</b>", body_style), Paragraph(candidate_data.get("email", ""), body_style)],
        [Paragraph("<b>Passport ID:</b>", body_style), Paragraph(f"PASSPORT-{candidate_data.get('id', '001')}-VERIFIED", body_style),
         Paragraph("<b>Status:</b>", body_style), Paragraph("<font color='#16A34A'><b>VERIFIED TALENT (75%+ Benchmark)</b></font>", body_style)]
    ]
    t_info = Table(cand_info, colWidths=[120, 160, 80, 160])
    t_info.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_info)
    story.append(Spacer(1, 14))

    # Verified Skills Table
    story.append(Paragraph("Verified Competencies & Assessment Results", heading_style))
    skill_rows = [
        [Paragraph("<b>Skill / Competency</b>", body_style),
         Paragraph("<b>Category</b>", body_style),
         Paragraph("<b>Assessment Score</b>", body_style),
         Paragraph("<b>Verification Date</b>", body_style),
         Paragraph("<b>Status</b>", body_style)]
    ]
    for s in verified_skills:
        skill_rows.append([
            Paragraph(s.get("name", "Skill"), body_style),
            Paragraph(s.get("category", "General"), body_style),
            Paragraph(f"<b>{s.get('assessment_score', 0)}%</b>", body_style),
            Paragraph(str(s.get("verified_at", "Verified"))[:10], body_style),
            Paragraph("<font color='#16A34A'><b>VERIFIED</b></font>", body_style)
        ])

    t_skills = Table(skill_rows, colWidths=[150, 100, 110, 90, 70])
    t_skills.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_skills)
    story.append(Spacer(1, 16))

    story.append(Paragraph("Verification Integrity Note", heading_style))
    story.append(Paragraph("All skills listed above have undergone proctored technical evaluations with backend grading and session integrity logs. Only assessments achieving a score of 75% or higher receive this official verification credential.", body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def generate_roles_specification_pdf(founder_data: Dict[str, Any], analysis_data: Dict[str, Any]) -> bytes:
    """Generates an official Team Requirements & Roles Specification PDF for HR recruitment."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=36, bottomMargin=36
    )

    styles = getSampleStyleSheet()
    primary = colors.HexColor("#14213D")
    secondary = colors.HexColor("#2563EB")
    accent = colors.HexColor("#14B8A6")
    text_dark = colors.HexColor("#1E293B")
    text_muted = colors.HexColor("#64748B")

    title_style = ParagraphStyle('RTitle', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=20, leading=24, textColor=primary, spaceAfter=4)
    subtitle_style = ParagraphStyle('RSub', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=14, textColor=secondary, spaceAfter=10)
    heading_style = ParagraphStyle('RHead', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=primary, spaceBefore=8, spaceAfter=4)
    subhead_style = ParagraphStyle('RSubHead', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=secondary, spaceBefore=6, spaceAfter=3)
    body_style = ParagraphStyle('RBody', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=13, textColor=text_dark, spaceAfter=5)
    bullet_style = ParagraphStyle('RBullet', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=13, textColor=text_dark, leftIndent=12, spaceAfter=3)
    caption_style = ParagraphStyle('RCaption', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8, leading=11, textColor=text_muted, spaceBefore=10)

    story = []

    title = analysis_data.get("title", "Startup Venture")
    founder_name = founder_data.get("name") or founder_data.get("full_name", "Sarah Lin")
    founder_email = founder_data.get("email", "founder@idea2impact.io")
    industry = analysis_data.get("industry", "Technology & AI")
    roles = analysis_data.get("required_job_roles", [])

    story.append(Paragraph(f"Idea2Impact — Team & Hiring Requirements Blueprint", title_style))
    story.append(Paragraph(f"Specification for <b>{title}</b> | Prepared by Gemini Pro AI Business Architect for HR & Talent Acquisition", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent, spaceBefore=0, spaceAfter=10))

    # Meta Table
    meta_info = [
        [Paragraph("<b>Company / Project:</b>", body_style), Paragraph(title, body_style),
         Paragraph("<b>Founder / Sponsor:</b>", body_style), Paragraph(f"{founder_name} ({founder_email})", body_style)],
        [Paragraph("<b>Industry Sector:</b>", body_style), Paragraph(industry, body_style),
         Paragraph("<b>Date Generated:</b>", body_style), Paragraph(datetime.now().strftime("%B %d, %Y"), body_style)],
        [Paragraph("<b>Target Headcount:</b>", body_style), Paragraph(f"{len(roles)} Core Strategic Roles", body_style),
         Paragraph("<b>Standard:</b>", body_style), Paragraph("<font color='#0F766E'><b>Idea2Impact 75/25 Dual-Tier Verified</b></font>", body_style)]
    ]
    t_meta = Table(meta_info, colWidths=[110, 160, 110, 150])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 8))

    # Project Overview Brief
    story.append(Paragraph("1. Project Context & Hiring Directive", heading_style))
    deep = analysis_data.get("deep_explanation", {})
    pitch = deep.get("elevator_pitch", analysis_data.get("tagline", "High-growth technological initiative."))
    story.append(Paragraph(f"<b>Business Directive:</b> {pitch}", body_style))
    story.append(Paragraph(f"<b>Technical Stack:</b> {deep.get('architectural_thesis', 'Modern scalable microservices and AI pipelines.')}", body_style))
    story.append(Spacer(1, 6))

    # Job Roles Breakdown
    story.append(Paragraph("2. Required Job Roles & Competency Specifications", heading_style))

    for idx, role in enumerate(roles, 1):
        r_title = role.get("title", f"Role {idx}")
        r_dept = role.get("department", "Engineering")
        r_exp = role.get("experience_level", "Senior")
        r_salary = role.get("salary_range", "$120k - $150k")
        r_prio = role.get("hiring_priority", "Phase 1")

        # Role Header Box
        role_header_data = [
            [Paragraph(f"<b>Role #{idx}: {r_title}</b>", ParagraphStyle('RH', fontName='Helvetica-Bold', fontSize=10, textColor=colors.white)),
             Paragraph(f"<b>Dept:</b> {r_dept} | <b>Level:</b> {r_exp} | <b>Target:</b> {r_salary} | <b>Priority:</b> {r_prio}", ParagraphStyle('RHM', fontName='Helvetica', fontSize=8, textColor=colors.HexColor("#E2E8F0")))]
        ]
        t_rh = Table(role_header_data, colWidths=[200, 330])
        t_rh.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), primary),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_rh)

        # Responsibilities
        resps = role.get("responsibilities", [])
        if resps:
            story.append(Paragraph("<b>Core Deliverables & Responsibilities:</b>", subhead_style))
            for resp in resps:
                story.append(Paragraph(f"• {resp}", bullet_style))

        # Required & Preferred Skills Table
        req_skills = role.get("required_skills", [])
        pref_skills = role.get("preferred_skills", [])
        all_role_skills = req_skills + pref_skills

        if all_role_skills:
            skill_table_data = [
                [Paragraph("<b>Competency / Skill</b>", body_style),
                 Paragraph("<b>Tier</b>", body_style),
                 Paragraph("<b>Weight</b>", body_style),
                 Paragraph("<b>Domain</b>", body_style),
                 Paragraph("<b>Verification Standard</b>", body_style)]
            ]
            for s in all_role_skills:
                is_mandatory = s.get("is_required", True)
                w = s.get("weight", 0.3)
                w_str = f"{int(w * 100)}%" if w <= 1.0 else f"{w}"
                tier_badge = "<b><font color='#2563EB'>Mandatory (75%)</font></b>" if is_mandatory else "<i>Preferred (25%)</i>"
                skill_table_data.append([
                    Paragraph(s.get("name", "Skill"), body_style),
                    Paragraph(tier_badge, body_style),
                    Paragraph(w_str, body_style),
                    Paragraph(s.get("category", "Technical"), body_style),
                    Paragraph("Score ≥ 75% Proctored", body_style)
                ])

            t_skills = Table(skill_table_data, colWidths=[160, 100, 60, 90, 120])
            t_skills.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
                ('PADDING', (0,0), (-1,-1), 3),
            ]))
            story.append(t_skills)

        story.append(Spacer(1, 6))

    # HR Protocol Note
    story.append(Paragraph("3. HR Executive Instructions & SkillBridge Protocol", heading_style))
    story.append(Paragraph(
        "This specification has been submitted directly to the HR Dashboard. Each listed position can be converted with 1-click into an active job posting on Idea2Impact, automatically matching against candidate skill passports with transparent mathematical grading: "
        "<i>Match Score = (∑ Matched Weight / ∑ Total Weight) × 100</i>. Anti-tamper proctoring flags and verified certificates are pre-enforced.",
        body_style
    ))
    story.append(Paragraph("Confidential document generated by Idea2Impact Platform. AI-assisted evaluations support human talent acquisition judgment.", caption_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def generate_investor_deep_pitch_pdf(founder_data: Dict[str, Any], analysis_data: Dict[str, Any]) -> bytes:
    """Generates an official Executive Venture Proposal & Deep Project Explanation PDF for Investors."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=36, bottomMargin=36
    )

    styles = getSampleStyleSheet()
    primary = colors.HexColor("#14213D")
    secondary = colors.HexColor("#2563EB")
    accent = colors.HexColor("#14B8A6")
    text_dark = colors.HexColor("#1E293B")
    text_muted = colors.HexColor("#64748B")

    title_style = ParagraphStyle('ITitle', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=20, leading=24, textColor=primary, spaceAfter=4)
    subtitle_style = ParagraphStyle('ISub', parent=styles['Normal'], fontName='Helvetica', fontSize=10, leading=14, textColor=secondary, spaceAfter=8)
    heading_style = ParagraphStyle('IHead', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=primary, spaceBefore=8, spaceAfter=4)
    body_style = ParagraphStyle('IBody', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=13, textColor=text_dark, spaceAfter=5)
    bullet_style = ParagraphStyle('IBullet', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=13, textColor=text_dark, leftIndent=12, spaceAfter=3)
    caption_style = ParagraphStyle('ICaption', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8, leading=11, textColor=text_muted, spaceBefore=10)

    story = []

    title = analysis_data.get("title", "Startup Venture")
    founder_name = founder_data.get("name") or founder_data.get("full_name", "Sarah Lin")
    founder_email = founder_data.get("email", "founder@idea2impact.io")
    industry = analysis_data.get("industry", "Technology & AI")
    tagline = analysis_data.get("tagline", "Autonomous enterprise intelligence.")

    invest = analysis_data.get("investment_required", {})
    scope = analysis_data.get("project_scope", {})
    deep = analysis_data.get("deep_explanation", {})
    roadmap = analysis_data.get("execution_roadmap", [])

    ask = invest.get("total_ask", "$750,000")
    stage = invest.get("stage", "Seed Round")
    runway = invest.get("runway_months", 18)
    valuation = invest.get("valuation_range", "$4.5M - $6.0M Post-Money")

    story.append(Paragraph(f"Idea2Impact — Venture Investment Proposal & Project Blueprint", title_style))
    story.append(Paragraph(f"<b>{title}</b>: {tagline} | Confidential Investment Memorandum", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent, spaceBefore=0, spaceAfter=10))

    # Executive Overview Table
    meta_info = [
        [Paragraph("<b>Company:</b>", body_style), Paragraph(title, body_style),
         Paragraph("<b>Founder & CEO:</b>", body_style), Paragraph(f"{founder_name}", body_style)],
        [Paragraph("<b>Contact:</b>", body_style), Paragraph(founder_email, body_style),
         Paragraph("<b>Industry / Sector:</b>", body_style), Paragraph(industry, body_style)],
        [Paragraph("<b>Funding Target:</b>", body_style), Paragraph(f"<b><font color='#2563EB'>{ask}</font></b> ({stage})", body_style),
         Paragraph("<b>Runway Target:</b>", body_style), Paragraph(f"{runway} Months Runway", body_style)],
        [Paragraph("<b>Target Valuation:</b>", body_style), Paragraph(valuation, body_style),
         Paragraph("<b>Date / Status:</b>", body_style), Paragraph(f"{datetime.now().strftime('%B %d, %Y')} • Confidential", body_style)]
    ]
    t_meta = Table(meta_info, colWidths=[100, 165, 110, 155])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 8))

    # 1. Deep Project Explanation & Thesis
    story.append(Paragraph("1. Executive Thesis & Deep Explanation", heading_style))
    story.append(Paragraph(f"<b>Elevator Pitch:</b> {deep.get('elevator_pitch', tagline)}", body_style))
    story.append(Paragraph(f"<b>Core Value Proposition:</b> {deep.get('core_value_prop', '10x productivity improvement over legacy tools.')}", body_style))
    story.append(Paragraph(f"<b>Architectural Foundation:</b> {deep.get('architectural_thesis', 'Scalable modern microservices.')}", body_style))
    story.append(Paragraph(f"<b>Monetization Model:</b> {deep.get('monetization_strategy', 'Tiered B2B SaaS subscriptions.')}", body_style))
    story.append(Paragraph(f"<b>Defensibility Moat:</b> {deep.get('defensibility_moat', 'Proprietary data ingestion and network effects.')}", body_style))
    story.append(Spacer(1, 6))

    # 2. Scope & Market Opportunity
    story.append(Paragraph("2. Project Scope & Addressable Market Sizing", heading_style))
    tam_val = scope.get("tam", "$20.0B")
    sam_val = scope.get("sam", "$5.0B")
    som_val = scope.get("som", "$200M")

    market_data = [
        [Paragraph("<b>TAM (Total Addressable Market)</b>", body_style), Paragraph(f"<b>{tam_val}</b>", body_style), Paragraph("Global total category market volume by 2030", body_style)],
        [Paragraph("<b>SAM (Serviceable Available Market)</b>", body_style), Paragraph(f"<b>{sam_val}</b>", body_style), Paragraph("Immediate target sector and geographical reach", body_style)],
        [Paragraph("<b>SOM (Serviceable Obtainable Market)</b>", body_style), Paragraph(f"<b>{som_val}</b>", body_style), Paragraph("Realistic 36-month capture based on founder GTM velocity", body_style)]
    ]
    t_market = Table(market_data, colWidths=[180, 80, 270])
    t_market.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_market)
    story.append(Spacer(1, 6))

    mvp_feats = scope.get("mvp_features", [])
    if mvp_feats:
        story.append(Paragraph("<b>MVP Scope Boundaries:</b>", body_style))
        for feat in mvp_feats:
            story.append(Paragraph(f"• {feat}", bullet_style))

    story.append(Spacer(1, 6))

    # 3. Capital Requirements & Use of Funds
    story.append(Paragraph("3. Investment Required & Fund Allocation Breakdown", heading_style))
    story.append(Paragraph(f"Seeking <b>{ask}</b> for an <b>{runway}-month runway</b> to reach critical growth inflection metrics.", body_style))

    funds = invest.get("use_of_funds", [])
    if funds:
        fund_table_data = [
            [Paragraph("<b>Budget Allocation Category</b>", body_style),
             Paragraph("<b>Share %</b>", body_style),
             Paragraph("<b>Amount</b>", body_style),
             Paragraph("<b>Strategic Purpose</b>", body_style)]
        ]
        for f in funds:
            fund_table_data.append([
                Paragraph(f.get("category", "General"), body_style),
                Paragraph(f.get("percentage", "25%"), body_style),
                Paragraph(f"<b>{f.get('amount', '$100k')}</b>", body_style),
                Paragraph(f.get("purpose", "Resource deployment"), body_style)
            ])
        t_funds = Table(fund_table_data, colWidths=[170, 50, 75, 235])
        t_funds.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), primary),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_funds)

    story.append(Spacer(1, 6))

    # 4. Phased Execution Roadmap
    story.append(Paragraph("4. 12-Month Phased Execution Roadmap to Scale", heading_style))
    if roadmap:
        road_table_data = [
            [Paragraph("<b>Phase & Timeline</b>", body_style),
             Paragraph("<b>Objective & Milestones</b>", body_style),
             Paragraph("<b>Success KPI Benchmark</b>", body_style)]
        ]
        for r in roadmap:
            p_name = r.get("phase_name", "Phase")
            p_time = r.get("timeline", "")
            p_obj = r.get("objective", "")
            p_kpi = r.get("kpi", "Milestone completed")
            road_table_data.append([
                Paragraph(f"<b>{p_name}</b><br/><font color='#64748B'>{p_time}</font>", body_style),
                Paragraph(p_obj, body_style),
                Paragraph(f"<b><font color='#16A34A'>{p_kpi}</font></b>", body_style)
            ])
        t_road = Table(road_table_data, colWidths=[150, 240, 140])
        t_road.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_road)

    story.append(Spacer(1, 8))
    story.append(Paragraph("Confidential venture memorandum shared via Idea2Impact Investor / Sharks Mode. Founder contact information verified through platform proctoring credentials. AI evaluations support human due diligence.", caption_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

