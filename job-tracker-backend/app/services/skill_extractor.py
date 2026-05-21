"""
Skill extraction from free-form text using a curated keyword dictionary.
No external dependencies — pure Python regex matching.
"""
import re
from typing import List, Dict

# Canonical skill dictionary organized by domain
_SKILLS: Dict[str, List[str]] = {
    "languages": [
        "python", "javascript", "typescript", "java", "c++", "c#", "go",
        "golang", "rust", "ruby", "php", "swift", "kotlin", "scala", "r",
        "matlab", "dart", "elixir", "haskell", "perl", "bash", "shell",
    ],
    "web_frontend": [
        "react", "vue", "angular", "next.js", "nuxt", "svelte", "html",
        "css", "tailwind", "bootstrap", "sass", "less", "webpack", "vite",
        "redux", "graphql", "jquery", "d3.js",
    ],
    "web_backend": [
        "fastapi", "django", "flask", "express", "node.js", "spring",
        "rails", "laravel", "asp.net", "nestjs", "gin", "fiber",
        "rest api", "grpc", "websocket", "microservices",
    ],
    "databases": [
        "postgresql", "mysql", "mongodb", "redis", "sqlite", "cassandra",
        "elasticsearch", "dynamodb", "supabase", "firebase", "neo4j",
        "oracle", "sql server", "bigquery", "snowflake",
    ],
    "cloud_devops": [
        "aws", "azure", "gcp", "google cloud", "docker", "kubernetes",
        "terraform", "ansible", "ci/cd", "github actions", "jenkins",
        "nginx", "apache", "linux", "unix", "helm", "prometheus", "grafana",
    ],
    "ai_ml": [
        "machine learning", "deep learning", "nlp", "computer vision",
        "tensorflow", "pytorch", "scikit-learn", "hugging face", "langchain",
        "openai", "llm", "transformers", "bert", "gpt", "rag",
        "vector database", "embeddings", "fine-tuning", "reinforcement learning",
        "data science", "feature engineering", "model deployment",
    ],
    "data_engineering": [
        "pandas", "numpy", "spark", "kafka", "airflow", "dbt", "tableau",
        "power bi", "looker", "sql", "etl", "data pipeline", "hadoop",
        "databricks", "mlflow",
    ],
    "tools_practices": [
        "git", "agile", "scrum", "jira", "api design", "tdd", "testing",
        "unit testing", "integration testing", "code review", "system design",
        "object oriented", "functional programming", "design patterns",
    ],
    "soft_skills": [
        "leadership", "communication", "teamwork", "problem solving",
        "collaboration", "mentoring", "project management",
        "stakeholder management", "cross-functional",
    ],
}

# Flat set for O(1) lookup; patterns built once at module load (lightweight)
_ALL_SKILLS: List[str] = sorted(
    {skill for group in _SKILLS.values() for skill in group}
)

# Pre-compile one pattern per skill for performance
_PATTERNS = {
    skill: re.compile(r'\b' + re.escape(skill) + r'\b', re.IGNORECASE)
    for skill in _ALL_SKILLS
}


def extract_skills(text: str) -> List[str]:
    """Return a sorted list of recognized skills found in *text*."""
    if not text:
        return []
    return sorted({skill for skill, pat in _PATTERNS.items() if pat.search(text)})


def get_skill_overlap(skills_a: List[str], skills_b: List[str]) -> Dict:
    """
    Compare two skill lists and return overlap metrics.

    Returns:
        matched       — skills present in both
        missing       — skills in B but not in A (gaps for A to fill)
        extra         — skills in A but not in B (bonus for A)
        overlap_ratio — len(matched) / len(B), 0–1
    """
    set_a = set(skills_a)
    set_b = set(skills_b)
    matched = sorted(set_a & set_b)
    missing = sorted(set_b - set_a)
    extra = sorted(set_a - set_b)
    overlap_ratio = len(matched) / len(set_b) if set_b else 0.0
    return {
        "matched": matched,
        "missing": missing,
        "extra": extra,
        "overlap_ratio": round(overlap_ratio, 4),
    }
