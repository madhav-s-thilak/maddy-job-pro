"""
ATS (Applicant Tracking System) simulation engine.

Fully deterministic — no LLM, no randomness.
Simulates how a real ATS parser would evaluate a resume:
  • keyword coverage against the job description
  • section quality (named sections detectable by regex)
  • formatting risk (LaTeX commands, tables, columns)
  • readability heuristics (sentence length, density)

All signals produce an explainable score with recruiter-style feedback.
"""
import re
from typing import Any, Dict, List

from app.services.skill_extractor import extract_skills, get_skill_overlap


# ---------------------------------------------------------------------------
# LaTeX / formatting helpers
# ---------------------------------------------------------------------------

def _strip_latex(text: str) -> str:
    """Remove LaTeX commands so keyword matching works on plain text."""
    text = re.sub(r'\\[a-zA-Z]+\*?(\[.*?\])?\{.*?\}', ' ', text)
    text = re.sub(r'\\[a-zA-Z]+\*?', ' ', text)
    text = re.sub(r'[{}&%$#_^~]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def _detect_sections(text: str) -> List[str]:
    """Return ATS-parseable section names found in the resume."""
    standard = [
        "experience", "education", "skills", "projects", "summary",
        "objective", "certifications", "awards", "publications",
        "work experience", "professional experience", "technical skills",
        "achievements", "volunteering",
    ]
    found = []
    text_lower = text.lower()
    for section in standard:
        if re.search(r'\b' + re.escape(section) + r'\b', text_lower):
            found.append(section)
    return found


def _formatting_risk(raw_text: str) -> str:
    """
    Estimate ATS formatting risk based on LaTeX / PDF constructs.
    Returns 'low' | 'medium' | 'high'.
    """
    risk_points = 0
    if re.search(r'\\begin\{tabular\}', raw_text):
        risk_points += 2          # Tables confuse many ATS parsers
    if re.search(r'\\begin\{multicol\}', raw_text):
        risk_points += 2          # Multi-column layouts fail parsing
    if raw_text.count('\\includegraphics') > 0:
        risk_points += 1          # Images are skipped
    if raw_text.count('\\href') > 3:
        risk_points += 1          # Too many hyperlinks
    if re.search(r'\\textcolor|\\color', raw_text):
        risk_points += 1          # Colour can trip older parsers

    if risk_points == 0:
        return "low"
    if risk_points <= 2:
        return "medium"
    return "high"


def _keyword_coverage(resume_plain: str, jd_plain: str) -> Dict:
    """Fraction of meaningful JD keywords present in the resume."""
    stop = frozenset({
        "the","a","an","is","are","was","be","been","have","has","had",
        "do","does","did","will","to","of","in","for","on","with","at",
        "by","from","or","and","if","that","this","not","we","you","i",
        "it","its","our","your","their","as","but","no","so","up","out",
    })
    jd_words = {
        w for w in re.findall(r"[a-z][a-z0-9]*", jd_plain.lower())
        if w not in stop and len(w) > 2
    }
    if not jd_words:
        return {"covered": [], "missing": [], "ratio": 0.0}

    resume_lower = resume_plain.lower()
    covered = sorted(
        w for w in jd_words
        if re.search(r'\b' + re.escape(w) + r'\b', resume_lower)
    )
    missing = sorted(jd_words - set(covered))
    return {
        "covered": covered[:30],
        "missing": missing[:20],
        "ratio": round(len(covered) / len(jd_words), 4),
    }


def _section_score(sections: List[str]) -> int:
    """Score based on presence of key resume sections (0-100)."""
    must_have = {"experience", "education", "skills"}
    nice_to_have = {"projects", "summary", "certifications", "achievements"}
    found_set = set(sections)

    score = 0
    for s in must_have:
        if any(s in f for f in found_set):
            score += 25
    for s in nice_to_have:
        if any(s in f for f in found_set):
            score += 6
    return min(score, 100)


def _readability_score(plain_text: str) -> int:
    """
    Heuristic readability score (0-100).
    Checks: average sentence length, bullet density, word count.
    """
    sentences = re.split(r'[.!?]\s+', plain_text)
    word_count = len(plain_text.split())
    avg_sent_len = word_count / max(len(sentences), 1)
    bullet_count = len(re.findall(r'^\s*[•\-\*▪]', plain_text, re.MULTILINE))

    score = 100
    if avg_sent_len > 30:   score -= 15   # Too wordy
    if avg_sent_len > 20:   score -= 10
    if word_count < 200:    score -= 20   # Too sparse
    if word_count > 1200:   score -= 10   # Too long
    if bullet_count < 5:    score -= 10   # Recruiter-unfriendly
    return max(0, score)


def _generate_ats_recommendations(
    formatting_risk: str,
    kw_ratio: float,
    sections: List[str],
    missing_keywords: List[str],
    skill_gaps: List[str],
) -> List[str]:
    recs: List[str] = []

    if formatting_risk == "high":
        recs.append("Remove multi-column layouts and tables — most ATS parsers can't handle them")
    elif formatting_risk == "medium":
        recs.append("Simplify formatting — reduce tables/columns for better ATS parsing")

    if kw_ratio < 0.5:
        top_miss = ", ".join(missing_keywords[:4])
        recs.append(f"Increase keyword density — missing common JD terms: {top_miss}")

    if "skills" not in " ".join(sections):
        recs.append("Add a dedicated 'Skills' section — ATS systems parse it explicitly")

    if "summary" not in " ".join(sections) and "objective" not in " ".join(sections):
        recs.append("Add a 2-line professional summary at the top for ATS scoring boost")

    if skill_gaps:
        recs.append(f"Bridge skill gaps: {', '.join(skill_gaps[:3])} mentioned in JD are absent")

    if kw_ratio >= 0.7:
        recs.append("Good keyword coverage — ensure all key terms appear in context, not just lists")

    return recs[:6] if recs else ["Resume appears well-optimised for ATS — keep terminology consistent"]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def simulate_ats(
    resume_text: str,
    job_description: str,
    job_role: str = "",
    job_company: str = "",
) -> Dict[str, Any]:
    """
    Full ATS simulation for a resume against a job description.

    Returns:
        ats_score         int   0–100 composite ATS readability/match score
        formatting_risk   str   low / medium / high
        keyword_coverage  int   0–100 percentage of JD keywords in resume
        sections_found    list  ATS-parseable section names detected
        section_score     int   0–100 section completeness
        readability_score int   0–100 readability heuristic
        missing_keywords  list  important JD words absent from resume
        strong_matches    list  skills in both resume and JD
        missing_skills    list  JD skills absent from resume
        recommendations   list  actionable ATS improvement tips
    """
    if not resume_text or not job_description:
        return {
            "ats_score": 0,
            "formatting_risk": "unknown",
            "keyword_coverage": 0,
            "sections_found": [],
            "section_score": 0,
            "readability_score": 0,
            "missing_keywords": [],
            "strong_matches": [],
            "missing_skills": [],
            "recommendations": ["Provide both resume and job description to run ATS simulation."],
        }

    # Prepare plain text versions
    resume_plain = _strip_latex(resume_text)
    jd_plain = _strip_latex(job_description)

    # --- Individual signals ------------------------------------------------
    formatting_risk = _formatting_risk(resume_text)
    kw_data = _keyword_coverage(resume_plain, jd_plain)
    sections = _detect_sections(resume_plain)
    sec_score = _section_score(sections)
    read_score = _readability_score(resume_plain)

    # Skill overlap (re-uses existing skill extractor)
    resume_skills = extract_skills(resume_plain)
    jd_skills = extract_skills(jd_plain)
    overlap = get_skill_overlap(resume_skills, jd_skills)

    # --- Composite ATS score -----------------------------------------------
    formatting_penalty = {"low": 0, "medium": 8, "high": 20}.get(formatting_risk, 0)
    raw = (
        kw_data["ratio"] * 0.40
        + (sec_score / 100) * 0.30
        + (read_score / 100) * 0.20
        + overlap["overlap_ratio"] * 0.10
    )
    ats_score = max(0, min(100, round(raw * 100) - formatting_penalty))

    return {
        "ats_score": ats_score,
        "formatting_risk": formatting_risk,
        "keyword_coverage": round(kw_data["ratio"] * 100),
        "sections_found": sections,
        "section_score": sec_score,
        "readability_score": read_score,
        "missing_keywords": kw_data["missing"][:15],
        "covered_keywords": kw_data["covered"][:15],
        "strong_matches": overlap["matched"][:10],
        "missing_skills": overlap["missing"][:8],
        "recommendations": _generate_ats_recommendations(
            formatting_risk,
            kw_data["ratio"],
            sections,
            kw_data["missing"],
            overlap["missing"],
        ),
    }
