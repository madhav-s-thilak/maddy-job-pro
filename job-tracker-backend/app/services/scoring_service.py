"""
Recruiter-style AI scoring engine.

Scoring is 100% deterministic — no LLM calls, no random values.
Every score is a weighted blend of three measurable signals:

  Signal               Weight  What it measures
  ─────────────────────────────────────────────────────────────────────
  Semantic similarity   45 %   TF-IDF cosine similarity of full texts
  Skill overlap         40 %   Fraction of JD skills present in resume
  Keyword density       15 %   Fraction of JD vocab found in resume

Scaling path: replace compute_similarity() with an OpenAI embedding call
for true semantic understanding once a vector DB is in place.
"""
import re
from typing import Any, Dict, List

from app.services.embedding_service import compute_similarity
from app.services.skill_extractor import extract_skills, get_skill_overlap

# ---------------------------------------------------------------------------
# Weights (must sum to 1.0)
# ---------------------------------------------------------------------------
_W_SEMANTIC = 0.30   # overlap-coefficient — solid signal, not dominant
_W_SKILL = 0.50     # explicit skill matching — most actionable for recruiters
_W_KEYWORD = 0.20   # keyword density — catches domain language beyond skill list

assert abs(_W_SEMANTIC + _W_SKILL + _W_KEYWORD - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _keyword_density(resume: str, jd: str) -> float:
    """
    Fraction of *meaningful* JD words that appear somewhere in the resume.
    Ignores stop-words to avoid inflating the score with common filler.
    """
    if not jd or not resume:
        return 0.0

    _STOP = frozenset({
        "the", "a", "an", "is", "are", "was", "were", "be", "been",
        "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "shall", "to", "of", "in",
        "for", "on", "with", "at", "by", "from", "as", "or", "and",
        "but", "if", "than", "that", "this", "it", "its", "we", "you",
        "i", "my", "your", "their", "not", "no", "also", "which",
    })

    jd_words = {
        w for w in re.findall(r"[a-z][a-z0-9]*", jd.lower())
        if w not in _STOP and len(w) > 2
    }
    if not jd_words:
        return 0.0

    resume_lower = resume.lower()
    matched = sum(1 for w in jd_words if re.search(r'\b' + re.escape(w) + r'\b', resume_lower))
    return matched / len(jd_words)


def _grade(score: int) -> str:
    if score >= 85:
        return "A"
    if score >= 70:
        return "B"
    if score >= 55:
        return "C"
    if score >= 40:
        return "D"
    return "F"


def _recommendations(
    score: int,
    missing: List[str],
    matched: List[str],
    semantic: float,
    kw_density: float,
) -> List[str]:
    recs: List[str] = []

    if missing:
        top = ", ".join(missing[:3])
        recs.append(f"Highlight or add experience with: {top}")

    if semantic < 0.25:
        recs.append(
            "Mirror the job description's language — recruiters and ATS scan for exact phrasing"
        )

    if kw_density < 0.35:
        recs.append(
            "Increase keyword alignment — weave key JD terms into your bullet points naturally"
        )

    if score < 60 and matched:
        top_m = ", ".join(matched[:3])
        recs.append(f"Lead with your strongest matching skills: {top_m}")

    if score >= 75:
        recs.append(
            "Strong match — quantify achievements with specific impact metrics (%, $, time saved)"
        )

    if not missing and score < 70:
        recs.append(
            "Skills look aligned — deepen bullet-point descriptions to match the JD's scope and scale"
        )

    return (recs[:5] if recs
            else ["Profile shows good alignment — refine descriptions for ATS keyword optimisation"])


def _summary(score: int, role: str, company: str) -> str:
    role_str = f" for {role}" if role else ""
    co_str = f" at {company}" if company else ""
    if score >= 80:
        return f"Excellent match{role_str}{co_str}. Recruiter is likely to shortlist."
    if score >= 65:
        return f"Good fit{role_str}{co_str}. Tailoring 2–3 bullet points will strengthen the application."
    if score >= 50:
        return f"Partial match{role_str}{co_str}. Consider addressing skill gaps before applying."
    return f"Low match{role_str}{co_str}. Significant tailoring or upskilling is recommended."


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def score_resume_against_job(
    resume_text: str,
    job_description: str,
    job_company: str = "",
    job_role: str = "",
) -> Dict[str, Any]:
    """
    Compute a recruiter-style compatibility score.

    Returns a structured dict ready to be serialised as JSON:
      match_score    int   0–100 weighted composite
      grade          str   A / B / C / D / F
      semantic_score float TF-IDF cosine similarity (0–100 %)
      skill_score    float skill overlap ratio (0–100 %)
      keyword_score  float keyword density ratio (0–100 %)
      strong_matches list  skills present in both resume and JD
      missing_skills list  JD skills absent from resume
      resume_skills  list  all skills found in resume
      jd_skills      list  all skills found in job description
      recommendations list actionable improvement suggestions
      summary        str   one-sentence recruiter-perspective verdict
    """
    if not resume_text or not job_description:
        return {
            "match_score": 0,
            "grade": "N/A",
            "semantic_score": 0.0,
            "skill_score": 0.0,
            "keyword_score": 0.0,
            "strong_matches": [],
            "missing_skills": [],
            "resume_skills": [],
            "jd_skills": [],
            "recommendations": ["Provide both a resume and a job description to generate a score."],
            "summary": "Insufficient data for analysis.",
        }

    # --- Signal 1: semantic similarity ----------------------------------------
    semantic_sim = compute_similarity(resume_text, job_description)

    # --- Signal 2: skill overlap -----------------------------------------------
    resume_skills = extract_skills(resume_text)
    jd_skills = extract_skills(job_description)
    overlap = get_skill_overlap(resume_skills, jd_skills)

    # --- Signal 3: keyword density ---------------------------------------------
    kw_density = _keyword_density(resume_text, job_description)

    # --- Weighted composite ----------------------------------------------------
    raw = (
        semantic_sim * _W_SEMANTIC
        + overlap["overlap_ratio"] * _W_SKILL
        + kw_density * _W_KEYWORD
    )
    match_score = max(0, min(100, round(raw * 100)))

    return {
        "match_score": match_score,
        "grade": _grade(match_score),
        "semantic_score": round(semantic_sim * 100, 1),
        "skill_score": round(overlap["overlap_ratio"] * 100, 1),
        "keyword_score": round(kw_density * 100, 1),
        "strong_matches": overlap["matched"][:12],
        "missing_skills": overlap["missing"][:10],
        "resume_skills": resume_skills[:20],
        "jd_skills": jd_skills[:20],
        "recommendations": _recommendations(
            match_score,
            overlap["missing"],
            overlap["matched"],
            semantic_sim,
            kw_density,
        ),
        "summary": _summary(match_score, job_role, job_company),
    }
