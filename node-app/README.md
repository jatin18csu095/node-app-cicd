# --- Mini HashBot (core RAG logic) ---
# Load PDFs -> chunk -> TF-IDF -> retrieve -> answer or "I don't have this information."

import os, re
from typing import List, Tuple
import numpy as np
from pypdf import PdfReader
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

def read_pdf(path: str) -> List[Tuple[int, str]]:
    out = []
    r = PdfReader(path)
    for i, p in enumerate(r.pages, start=1):
        t = (p.extract_text() or "")
        t = re.sub(r"[ \t]+", " ", t)
        t = re.sub(r"\n{2,}", "\n", t).strip()
        out.append((i, t))
    return out

def chunk_text(text: str, size=900, overlap=120) -> List[str]:
    chunks, start = [], 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        start = max(0, end - overlap)
    return [c.strip() for c in chunks if c.strip()]

def load_chunks(folder: str) -> Tuple[List[str], List[Tuple[str,int]]]:
    """Return (texts, meta[source,page]) from all PDFs in folder."""
    texts, meta = [], []
    for name in os.listdir(folder):
        if name.lower().endswith(".pdf"):
            path = os.path.join(folder, name)
            for page, txt in read_pdf(path):
                for ch in chunk_text(txt):
                    texts.append(ch); meta.append((name, page))
    return texts, meta

def build_index(texts: List[str]):
    vec = TfidfVectorizer(ngram_range=(1,2), min_df=1, stop_words="english")
    mat = vec.fit_transform(texts)
    return vec, mat

def answer(query: str, vec, mat, texts: List[str], meta: List[Tuple[str,int]], min_score=0.15) -> str:
    qv = vec.transform([query])
    sims = linear_kernel(qv, mat).ravel()
    i = int(np.argmax(sims)); score = float(sims[i])
    if score < min_score:
        return "I don't have this information."
    snippet = texts[i][:600].strip()
    src, pg = meta[i]
    return f"{snippet}\n\n(Source: {src}, p.{pg})"

# --- Example usage (replace 'docs' with your folder of PDFs) ---
if __name__ == "__main__":
    folder = "docs"  # put your policy PDFs here
    texts, meta = load_chunks(folder)
    vec, mat = build_index(texts)
    q = "How many optional leaves are granted to a Hasher?"
    print("\n=== Answer ===")
    print(answer(q, vec, mat, texts, meta))