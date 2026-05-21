"""
Semantic similarity via pure-Python TF-IDF vectorization.

Why no external model/library?
  • Render free tier has 512 MB RAM — sentence-transformers alone is ~400 MB
  • No cold-start model download on first request
  • Zero new dependencies — uses only Python stdlib (re, math, collections)
  • TF-IDF cosine similarity is well-studied, deterministic, and explainable

Scaling path: swap compute_similarity() for an OpenAI / Cohere embedding call
once the project moves to a paid tier or gains a vector DB.
"""
import math
import re
from collections import Counter
from typing import Dict, List, Tuple

# ---------------------------------------------------------------------------
# Tokenization
# ---------------------------------------------------------------------------

_STOP_WORDS = frozenset({
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "to", "of", "in", "for", "on",
    "with", "at", "by", "from", "as", "or", "and", "but", "if", "than",
    "that", "this", "it", "its", "our", "we", "you", "i", "my", "your",
    "their", "not", "no", "so", "up", "out", "about", "also", "which",
    "what", "when", "who", "how", "all", "each", "both", "more", "other",
    "than", "then", "them", "they", "he", "she", "his", "her", "us",
})


def _tokenize(text: str) -> List[str]:
    """Lowercase + extract word tokens, strip stop-words."""
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9\+\#\.]*", text.lower())
    return [t for t in tokens if t not in _STOP_WORDS and len(t) > 1]


# ---------------------------------------------------------------------------
# TF-IDF engine
# ---------------------------------------------------------------------------

def _build_tfidf_vectors(documents: List[str]) -> List[Dict[str, float]]:
    """
    Build L2-normalised TF-IDF vectors for a corpus.
    Each vector is a sparse dict {term: weight}.
    """
    tokenized = [_tokenize(doc) for doc in documents]
    N = len(tokenized)

    # Document frequency
    df: Counter = Counter()
    for tokens in tokenized:
        df.update(set(tokens))

    # Smoothed IDF: log((N+1)/(df+1)) + 1
    idf = {
        term: math.log((N + 1) / (count + 1)) + 1
        for term, count in df.items()
    }

    vectors: List[Dict[str, float]] = []
    for tokens in tokenized:
        tf = Counter(tokens)
        total = max(len(tokens), 1)
        raw_vec = {
            term: (count / total) * idf[term]
            for term, count in tf.items()
        }
        # L2 normalise so dot-product == cosine similarity
        norm = math.sqrt(sum(v * v for v in raw_vec.values())) or 1.0
        vectors.append({term: val / norm for term, val in raw_vec.items()})

    return vectors


def _dot(vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
    """Dot product of two sparse (L2-normalised) vectors = cosine similarity."""
    # Iterate the shorter dict to save cycles
    if len(vec_a) > len(vec_b):
        vec_a, vec_b = vec_b, vec_a
    return sum(vec_a.get(term, 0.0) * val for term, val in vec_b.items())


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_similarity(text_a: str, text_b: str) -> float:
    """
    Return semantic similarity in [0, 1] between two texts.

    Uses the *overlap coefficient* (|A∩B| / min(|A|, |B|)) rather than
    TF-IDF cosine.  Why: with only 2 documents in the corpus, TF-IDF's IDF
    term *penalises* shared vocabulary (treating "appeared in both" as
    "common, unimportant"), which is exactly backwards for pairwise
    similarity.  The overlap coefficient directly rewards shared vocabulary
    and handles length asymmetry well (resume vs. JD are rarely equal length).
    """
    if not text_a or not text_b:
        return 0.0
    toks_a = set(_tokenize(text_a))
    toks_b = set(_tokenize(text_b))
    if not toks_a or not toks_b:
        return 0.0
    intersection = len(toks_a & toks_b)
    score = intersection / min(len(toks_a), len(toks_b))
    return round(min(max(score, 0.0), 1.0), 4)


def rank_by_similarity(
    query: str, candidates: List[str]
) -> List[Tuple[int, float]]:
    """
    Rank *candidates* by semantic similarity to *query*.

    Returns a list of (original_index, similarity_score) sorted descending.
    """
    if not candidates or not query:
        return []

    all_texts = [query] + candidates
    vecs = _build_tfidf_vectors(all_texts)
    query_vec = vecs[0]

    scored = [
        (i, round(min(max(_dot(query_vec, vecs[i + 1]), 0.0), 1.0), 4))
        for i in range(len(candidates))
    ]
    return sorted(scored, key=lambda x: x[1], reverse=True)
