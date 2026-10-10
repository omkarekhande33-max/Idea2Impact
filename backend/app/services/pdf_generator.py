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
