"""
AI Resume Compiler service.

Takes a master resume (LaTeX or plain text) + job description and produces
a role-specific optimised resume using Groq.

Guarantees:
  • NEVER invents experience, skills, or companies
  • NEVER modifies factual claims (dates, metrics, titles)
  • Only reorders, rewrites bullet phrasing, and adjusts emphasis
  • Scores the compiled resume vs original using the ATS engine
"""
import json
import logging
import re
from typing import Any, Dict, Tuple

from groq import Groq

from app.config import settings
from app.services.ats_service import simulate_ats
from app.services.scoring_service import score_resume_against_job

logger = logging.getLogger(__name__)


class ResumeCompilerService:
    def __init__(self):
        self._client: Groq | None = None

    @property
    def client(self) -> Groq:
        if self._client is None:
            self._client = Groq(api_key=settings.GROQ_API_KEY)
        return self._client

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _extract_key_jd_requirements(self, job_description: str) -> str:
        """Pull top-10 requirements from JD via a fast Groq call."""
        try:
            resp = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {"role": "system", "content": "Extract key requirements. Return a numbered list only."},
                    {"role": "user", "content": (
                        f"List the 10 most important skills/requirements from this job description:\n\n"
                        f"{job_description[:3000]}"
                    )},
                ],
                temperature=0.1,
                max_tokens=400,
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.warning(f"JD extraction failed: {e}")
            return job_description[:500]

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def compile_resume(
        self,
        master_resume: str,
        job_description: str,
        job_role: str = "",
        job_company: str = "",
    ) -> Dict[str, Any]:
        """
        Generate a role-tailored resume from the master resume.

        Returns:
            compiled_resume    str   optimised LaTeX resume text
            changes_made       list  bullet-point summary of changes
            original_score     dict  ATS + recruiter score of original
            compiled_score     dict  ATS + recruiter score of compiled version
            score_delta        int   compiled_score.ats - original.ats
        """
        if not master_resume or not job_description:
            return {
                "compiled_resume": "",
                "changes_made": [],
                "original_score": {},
                "compiled_score": {},
                "score_delta": 0,
                "error": "Master resume and job description are required.",
            }

        # --- Score the original first ----------------------------------------
        orig_ats = simulate_ats(master_resume, job_description)
        orig_recruiter = score_resume_against_job(master_resume, job_description, job_company, job_role)

        # --- Extract JD requirements -----------------------------------------
        jd_reqs = self._extract_key_jd_requirements(job_description)

        # --- Compile the resume ----------------------------------------------
        role_str = f" for {job_role}" if job_role else ""
        company_str = f" at {job_company}" if job_company else ""

        system_prompt = (
            "You are a senior technical recruiter and LaTeX resume specialist. "
            "Your ONLY job is to tailor an existing resume to a specific role. "
            "You MUST NOT add any experience, company, skill, or achievement that "
            "is not already present in the original resume. "
            "You may: reorder bullet points, sharpen phrasing, add JD keywords "
            "naturally, and emphasise the most relevant existing content."
        )

        user_prompt = f"""Optimise this resume{role_str}{company_str} while obeying these rules:

RULES (never violate):
1. Do NOT add companies, projects, or skills not in the original
2. Do NOT change dates, metrics, or factual claims
3. Do NOT add placeholder text like [Your Name] or [Date]
4. PRESERVE the exact LaTeX structure and packages
5. Only reword, reorder, and keyword-enhance existing content

TOP JD REQUIREMENTS:
{jd_reqs}

ORIGINAL RESUME:
{master_resume}

Return ONLY the complete optimised LaTeX code — no markdown, no explanation."""

        try:
            resp = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                max_tokens=6000,
            )
            compiled = resp.choices[0].message.content.strip()

            # Strip accidental markdown fences
            if compiled.startswith("```"):
                compiled = re.sub(r"^```[a-zA-Z]*\n?", "", compiled)
                compiled = re.sub(r"\n?```$", "", compiled)

        except Exception as exc:
            logger.error(f"Groq compilation error: {exc}")
            return {
                "compiled_resume": master_resume,
                "changes_made": [f"Compilation failed: {exc}"],
                "original_score": orig_ats,
                "compiled_score": orig_ats,
                "score_delta": 0,
            }

        # --- Generate changes summary ----------------------------------------
        changes = self._summarise_changes(master_resume, compiled, job_role)

        # --- Score compiled version ------------------------------------------
        comp_ats = simulate_ats(compiled, job_description)
        comp_recruiter = score_resume_against_job(compiled, job_description, job_company, job_role)

        return {
            "compiled_resume": compiled,
            "changes_made": changes,
            "original_score": {
                "ats_score": orig_ats["ats_score"],
                "match_score": orig_recruiter["match_score"],
                "grade": orig_recruiter["grade"],
            },
            "compiled_score": {
                "ats_score": comp_ats["ats_score"],
                "match_score": comp_recruiter["match_score"],
                "grade": comp_recruiter["grade"],
            },
            "score_delta": comp_ats["ats_score"] - orig_ats["ats_score"],
            "match_delta": comp_recruiter["match_score"] - orig_recruiter["match_score"],
            "compiled_missing_skills": comp_recruiter["missing_skills"][:6],
            "compiled_strong_matches": comp_recruiter["strong_matches"][:8],
        }

    def _summarise_changes(
        self, original: str, compiled: str, job_role: str
    ) -> list:
        """Generate a concise diff summary using Groq."""
        try:
            resp = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {"role": "system", "content": "Summarise resume changes concisely. Return 4-6 bullet points max."},
                    {"role": "user", "content": (
                        f"Summarise what changed to tailor this resume for '{job_role}'.\n\n"
                        f"ORIGINAL (first 800 chars):\n{original[:800]}\n\n"
                        f"COMPILED (first 800 chars):\n{compiled[:800]}"
                    )},
                ],
                temperature=0.2,
                max_tokens=400,
            )
            text = resp.choices[0].message.content
            lines = [l.strip().lstrip("•-* ") for l in text.splitlines() if l.strip()]
            return [l for l in lines if len(l) > 10][:6]
        except Exception:
            return [f"Resume tailored for {job_role}" if job_role else "Resume optimised for target role"]


resume_compiler = ResumeCompilerService()
