"""
Portfolio / GitHub critic service.

Uses the public GitHub REST API (no auth token needed for basic analysis —
60 req/hour rate limit on unauthenticated calls, sufficient for this use case).

Scoring is fully heuristic and deterministic — no LLM, no randomness.
Critique is recruiter-realistic: focuses on the signals a tech hiring manager
actually checks (deployments, README quality, recency, diversity, metrics).
"""
import logging
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

_GH_API = "https://api.github.com"
_HEADERS = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
_TIMEOUT = 10.0


# ---------------------------------------------------------------------------
# GitHub helpers (async)
# ---------------------------------------------------------------------------

async def _gh_get(path: str) -> Optional[Any]:
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(f"{_GH_API}{path}", headers=_HEADERS)
            if r.status_code == 200:
                return r.json()
            logger.warning(f"GitHub API {path} → {r.status_code}")
            return None
    except Exception as exc:
        logger.warning(f"GitHub request failed: {exc}")
        return None


def _extract_github_username(url: str) -> Optional[str]:
    """Parse a GitHub profile or repo URL and return the username."""
    if not url:
        return None
    url = url.strip().rstrip("/")
    parsed = urlparse(url)
    if "github.com" not in (parsed.netloc or ""):
        # Try treating it as a bare username
        if re.match(r'^[a-zA-Z0-9\-]+$', url):
            return url
        return None
    parts = parsed.path.strip("/").split("/")
    return parts[0] if parts else None


# ---------------------------------------------------------------------------
# Heuristic scorers
# ---------------------------------------------------------------------------

def _readme_quality(readme_content: str) -> Dict[str, Any]:
    """Score a README on recruiter-relevant signals (0-100)."""
    if not readme_content:
        return {"score": 0, "issues": ["No README found"], "strengths": []}

    text = readme_content
    word_count = len(text.split())
    issues: List[str] = []
    strengths: List[str] = []
    score = 40  # baseline for having a README

    if word_count < 100:
        issues.append("README is too short — add project purpose, setup, and usage")
    else:
        strengths.append("README has sufficient content depth")
        score += 10

    if re.search(r'!\[.*?\]\(.*?\)', text):
        strengths.append("Contains images / diagrams — great for visual scanning")
        score += 10
    else:
        issues.append("No images or architecture diagrams — add a screenshot or diagram")

    if re.search(r'```', text):
        strengths.append("Has code examples")
        score += 10
    else:
        issues.append("Add code snippets for quick setup / usage")

    if re.search(r'(installation|getting started|setup|how to run)', text, re.I):
        strengths.append("Clear setup instructions")
        score += 10
    else:
        issues.append("Missing setup/installation instructions")

    if re.search(r'(deploy|live demo|hosted at|production)', text, re.I):
        strengths.append("Links to live deployment")
        score += 10
    else:
        issues.append("Add a live demo or deployment link")

    if re.search(r'(license|mit|apache|gpl)', text, re.I):
        score += 5

    return {"score": min(score, 100), "issues": issues, "strengths": strengths}


def _repo_quality(repo: Dict) -> int:
    """Heuristic quality score for a single repo (0-100)."""
    score = 0
    if repo.get("description"):       score += 15
    if repo.get("homepage"):          score += 15  # live deployment
    if (repo.get("stargazers_count") or 0) > 0:  score += 10
    if not repo.get("fork"):          score += 10  # original work
    if repo.get("topics"):            score += 10  # well-tagged
    if (repo.get("open_issues_count") or 0) < 5:  score += 5
    # Language diversity not measurable per-repo, handled at profile level
    return min(score, 65)  # README contributes the rest


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def analyze_github_portfolio(github_url: str) -> Dict[str, Any]:
    """
    Analyse a GitHub profile and return recruiter-style critique.

    Returns:
        username          str
        profile_score     int 0-100 overall portfolio score
        total_repos       int
        languages         list detected programming languages
        top_repos         list top-5 repos by heuristic quality
        readme_analyses   list README quality per analysed repo
        strengths         list positive signals
        weaknesses        list areas to improve
        recommendations   list actionable next steps
    """
    username = _extract_github_username(github_url)
    if not username:
        return {
            "error": "Invalid GitHub URL or username. Example: https://github.com/username",
            "profile_score": 0,
        }

    # Fetch profile + repos in parallel (via sequential calls — keep it simple)
    profile = await _gh_get(f"/users/{username}")
    if not profile:
        return {
            "error": f"GitHub user '{username}' not found or API rate limited.",
            "profile_score": 0,
        }

    repos_data = await _gh_get(f"/users/{username}/repos?per_page=30&sort=updated")
    repos = repos_data or []

    # Filter out forks for quality analysis
    original_repos = [r for r in repos if not r.get("fork")]

    # Language breakdown
    lang_counter: Dict[str, int] = {}
    for repo in original_repos:
        lang = repo.get("language")
        if lang:
            lang_counter[lang] = lang_counter.get(lang, 0) + 1
    languages = sorted(lang_counter, key=lang_counter.get, reverse=True)[:6]

    # Score top repos
    scored_repos = sorted(original_repos, key=_repo_quality, reverse=True)[:5]

    # Fetch README for top 3 repos
    readme_analyses: List[Dict] = []
    for repo in scored_repos[:3]:
        readme_data = await _gh_get(f"/repos/{username}/{repo['name']}/readme")
        if readme_data and readme_data.get("content"):
            import base64
            try:
                content = base64.b64decode(readme_data["content"]).decode("utf-8", errors="replace")
            except Exception:
                content = ""
        else:
            content = ""
        rq = _readme_quality(content)
        readme_analyses.append({
            "repo": repo["name"],
            "readme_score": rq["score"],
            "issues": rq["issues"],
            "strengths": rq["strengths"],
        })

    # Profile-level scoring
    strengths: List[str] = []
    weaknesses: List[str] = []
    recommendations: List[str] = []
    score = 0

    # Bio / profile completeness
    if profile.get("bio"):
        strengths.append("Profile bio is set — good for recruiter first impressions")
        score += 8
    else:
        weaknesses.append("No GitHub bio — add a 1-line description of what you build")
        recommendations.append("Add a clear bio: 'Backend engineer building AI-powered APIs'")

    if profile.get("blog"):
        strengths.append("Portfolio/website linked in profile")
        score += 8
    else:
        weaknesses.append("No website linked — add your portfolio URL to GitHub profile")

    # Repo quantity + quality
    n_original = len(original_repos)
    if n_original >= 10:
        strengths.append(f"{n_original} original repos — demonstrates consistent output")
        score += 15
    elif n_original >= 4:
        strengths.append(f"{n_original} original repos")
        score += 8
    else:
        weaknesses.append("Very few original repos — aim for 6+ visible projects")
        recommendations.append("Publish 3-5 complete projects with full README and live demo")

    # Deployment
    deployed = sum(1 for r in original_repos if r.get("homepage"))
    if deployed >= 2:
        strengths.append(f"{deployed} repos have live deployment links")
        score += 15
    elif deployed == 1:
        strengths.append("At least one project is deployed")
        score += 7
    else:
        weaknesses.append("No deployed projects visible in GitHub")
        recommendations.append("Deploy your best project to Vercel / Render and link it from the repo")

    # README quality from analysed repos
    avg_readme = (
        sum(r["readme_score"] for r in readme_analyses) / len(readme_analyses)
        if readme_analyses else 0
    )
    if avg_readme >= 70:
        strengths.append("Strong README quality across analysed repos")
        score += 15
    elif avg_readme >= 40:
        score += 8
        recommendations.append("Improve README quality: add screenshots, setup steps, and live demo links")
    else:
        weaknesses.append("Weak README quality — recruiters scan READMEs first")
        recommendations.append("Rewrite your top-3 READMEs with: overview, demo GIF, setup, tech stack")

    # Language diversity
    if len(languages) >= 3:
        strengths.append(f"Demonstrates breadth: {', '.join(languages[:3])}")
        score += 10
    elif languages:
        score += 5

    # Stars (social proof)
    total_stars = sum(r.get("stargazers_count", 0) for r in original_repos)
    if total_stars >= 10:
        strengths.append(f"{total_stars} total stars — community recognition")
        score += 10

    # Profile picture
    if profile.get("avatar_url") and "gravatar" not in profile.get("avatar_url", ""):
        score += 5

    profile_score = min(score, 100)

    top_repos_out = [
        {
            "name": r["name"],
            "description": r.get("description") or "",
            "language": r.get("language") or "Unknown",
            "stars": r.get("stargazers_count", 0),
            "url": r.get("html_url", ""),
            "homepage": r.get("homepage") or "",
            "quality_score": _repo_quality(r),
        }
        for r in scored_repos
    ]

    return {
        "username": username,
        "profile_score": profile_score,
        "total_repos": len(repos),
        "original_repos": n_original,
        "languages": languages,
        "top_repos": top_repos_out,
        "readme_analyses": readme_analyses,
        "strengths": strengths[:6],
        "weaknesses": weaknesses[:6],
        "recommendations": recommendations[:5],
        "profile_url": f"https://github.com/{username}",
    }
