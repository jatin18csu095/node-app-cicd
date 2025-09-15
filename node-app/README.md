# hashbot.py
# -----------------------------------------------------------
# HashBot: Answer questions strictly from local policy PDFs.
# If answer is not found, reply: "I don't have this information."
#
# Features:
# - Local RAG: pypdf + TF-IDF retrieval (no token needed)
# - Optional LLM wrapper for nicer phrasing (token optional)
#
# Usage:
#   pip install pypdf scikit-learn numpy
#   python hashbot.py -d docs/ -q "How many optional leaves are granted to a Hasher?"
#   # optional: --rebuild to rebuild the index
#
# Optional wrapper (for nicer wording):
#   Set WRAPPER_URL and X_API_TOKEN below (else it stays local).
# -----------------------------------------------------------

import argparse
import os
import re
import pickle
import json
from dataclasses import dataclass
from typing import List, Tuple, Dict, Any, Optional

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

# PDF text extraction
from pypdf import PdfReader

# Optional LLM wrapper
try:
    import requests  # noqa: F401
    HAVE_REQUESTS = True
except Exception:
    HAVE_REQUESTS = False


# =============== Optional wrapper config (leave blank for local-only) ===============
WRAPPER_URL = ""   # e.g. "https://openai-api-wrapper-xxxx.a.run.app/api/"
X_API_TOKEN = ""   # paste token if you want the LLM to compose answers
CSRFTOKEN   = ""   # usually "", unless your wrapper requires a csrftoken cookie
# ===================================================================================


@dataclass
class Chunk:
    text: str
    source: str
    page: int


# ------------------------------ PDF LOADING & CHUNKING ------------------------------
def read_pdf(path: str) -> List[Tuple[int, str]]:
    """Return list of (page_number, page_text)."""
    out = []
    reader = PdfReader(path)
    for i, page in enumerate(reader.pages, start=1):
        txt = page.extract_text() or ""
        # Normalize whitespace a bit
        txt = re.sub(r"[ \t]+", " ", txt)
        txt = re.sub(r"\n{2,}", "\n", txt).strip()
        out.append((i, txt))
    return out


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 120) -> List[str]:
    """Fixed-size character chunking with overlap."""
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
        if start < 0:
            start = 0
    return chunks


def load_corpus_from_folder(folder: str) -> List[Chunk]:
    chunks: List[Chunk] = []
    for name in os.listdir(folder):
        if not name.lower().endswith(".pdf"):
            continue
        path = os.path.join(folder, name)
        for page_no, page_text in read_pdf(path):
            for ch in chunk_text(page_text):
                if ch.strip():
                    chunks.append(Chunk(text=ch.strip(), source=name, page=page_no))
    return chunks


# ------------------------------------ INDEX ------------------------------------
@dataclass
class Index:
    vectorizer: TfidfVectorizer
    matrix: Any
    chunks: List[Chunk]


def build_index(chunks: List[Chunk]) -> Index:
    corpus = [c.text for c in chunks]
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, stop_words="english")
    mat = vectorizer.fit_transform(corpus)
    return Index(vectorizer, mat, chunks)


def save_index(idx: Index, path: str):
    with open(path, "wb") as f:
        pickle.dump(idx, f)


def load_index(path: str) -> Index:
    with open(path, "rb") as f:
        return pickle.load(f)


# -------------------------------- RETRIEVAL --------------------------------
def retrieve(idx: Index, query: str, top_k: int = 5) -> List[Tuple[Chunk, float]]:
    qv = idx.vectorizer.transform([query])
    sims = linear_kernel(qv, idx.matrix).ravel()  # cosine similarity
    top = sims.argsort()[::-1][:top_k]
    results = [(idx.chunks[i], float(sims[i])) for i in top]
    return results


# ------------------------------- (Optional) LLM --------------------------------
def call_wrapper(messages: List[Dict[str, str]],
                 model: str = "gpt-4",
                 max_tokens: int = 350,
                 temperature: float = 0.2,
                 top_p: float = 1.0) -> Optional[str]:
    if not WRAPPER_URL or not X_API_TOKEN or not HAVE_REQUESTS:
        return None
    payload = {
        "messages": messages,
        "model": model,
        "max_tokens": str(max_tokens),
        "temperature": str(temperature),
        "top_p": str(top_p),
    }
    headers = {"x-api-token": X_API_TOKEN, "Content-Type": "application/json"}
    if CSRFTOKEN:
        headers["Cookie"] = f"csrftoken={CSRFTOKEN}"
    try:
        import requests
        resp = requests.post(WRAPPER_URL, headers=headers, data=json.dumps(payload), timeout=60)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception:
        return None


def compose_answer_with_context(query: str, hits: List[Tuple[Chunk, float]]) -> Optional[str]:
    """Use wrapper to write a short answer strictly from hits."""
    if not hits:
        return None
    snippets = []
    for ch, score in hits[:4]:
        tag = f"[{ch.source} p.{ch.page} | score={score:.2f}]"
        snippets.append(f"{tag}\n{ch.text}")
    context = "\n\n---\n\n".join(snippets)

    system = {
        "role": "system",
        "content": ("You are an HR assistant. Answer ONLY using the provided context. "
                    "If the answer is not explicitly present, say: \"I don't have this information.\" "
                    "Be concise and cite the source page(s).")
    }
    user = {
        "role": "user",
        "content": f"Question: {query}\n\nContext:\n{context}\n\nAnswer in 2–4 sentences."
    }
    return call_wrapper([system, user])


# --------------------------------- PIPELINE ---------------------------------
def answer_query(idx: Index, query: str,
                 min_score: float = 0.15,
                 max_snippet_chars: int = 600) -> str:
    hits = retrieve(idx, query, top_k=5)

    # If no decent matches, decline.
    if not hits or (hits[0][1] < min_score):
        return "I don't have this information."

    # Try LLM for nicer phrasing (if configured)
    llm = compose_answer_with_context(query, hits)
    if llm:
        return llm.strip()

    # Local fallback: return the best snippet + citation.
    best, score = hits[0]
    snippet = best.text[:max_snippet_chars].strip()
    return f"{snippet}\n\n(Source: {best.source}, p.{best.page})"


# ------------------------------------ CLI -----------------------------------
def main():
    ap = argparse.ArgumentParser(description="HashBot – Policy Q&A from local PDFs")
    ap.add_argument("-d", "--docs", required=True, help="Folder containing policy PDFs")
    ap.add_argument("-q", "--query", required=True, help="User question")
    ap.add_argument("--rebuild", action="store_true", help="Force re-indexing")
    ap.add_argument("--index", default=".hashbot_index.pkl", help="Index path")
    args = ap.parse_args()

    # Build or load index
    if args.rebuild or not os.path.exists(args.index):
        chunks = load_corpus_from_folder(args.docs)
        if not chunks:
            raise SystemExit("No PDFs or text found in the docs folder.")
        idx = build_index(chunks)
        save_index(idx, args.index)
        print(f"Indexed {len(chunks)} chunks from PDFs. Index saved to {args.index}")
    else:
        idx = load_index(args.index)

    # Answer
    ans = answer_query(idx, args.query)
    print("\n=== Answer ===")
    print(ans)


if __name__ == "__main__":
    main()