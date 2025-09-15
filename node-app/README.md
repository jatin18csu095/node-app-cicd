# assign_departments.py
# ---------------------------------------------------------
# Automated student assignment to engineering departments.
# - Input: Excel with columns: Name, Roll, Physics, Chemistry, Maths
# - Output: One Excel per department + a summary (txt + json)
# - Optional: If you set WRAPPER_URL and X_API_TOKEN, it asks the LLM
#             to write a clean narrative report from the stats.
# ---------------------------------------------------------

import argparse
import json
import os
from typing import Dict, Any, List

import pandas as pd
import requests


# =========================
# Configuration (edit if needed)
# =========================

DEPARTMENTS = {
    # Department Name : criteria lambda(row) -> bool
    "Mechanical Engineering": lambda r: (r["Physics"] > 90) and (r["Chemistry"] > 85) and (r["Maths"] > 60),
    "Computer Engineering":  lambda r: (r["Physics"] > 60) and (r["Chemistry"] > 60) and (r["Maths"] > 90),
    "Electrical Engineering": lambda r: (r["Physics"] > 95) and (r["Chemistry"] > 60) and (r["Maths"] > 90),
}

# Optional LLM wrapper (leave blank to skip)
WRAPPER_URL = ""   # e.g. "https://openai-api-wrapper-xxxxxxxx.a.run.app/api/"
X_API_TOKEN = ""   # paste the token if you want AI-written narrative
CSRFTOKEN   = ""   # keep "" if your wrapper doesn't require it


# =========================
# LLM helper (optional)
# =========================
def llm_report(stats: Dict[str, Any]) -> str:
    """
    Call the wrapper (if configured) to generate a natural-language report
    from the computed stats. Falls back to a local template if not configured.
    """
    # If wrapper not configured, fall back
    if not WRAPPER_URL or not X_API_TOKEN:
        return (
            "AI Narrative (local fallback):\n"
            f"- Total students processed: {stats['total_students']}\n"
            f"- Assigned counts: {', '.join([f'{k}: {v}' for k, v in stats['assigned_counts'].items()])}\n"
            f"- Unassigned: {stats['unassigned_count']}\n"
            "Observations: The distribution reflects the defined thresholds. "
            "Consider adjusting cut-offs if a department receives very few students."
        )

    # Prepare a compact table-like string for the model
    lines = []
    for d, rows in stats["departments_preview"].items():
        header = f"[{d}]"
        body = "\n".join([f" - {r['Name']} (Roll {r['Roll']}): P{r['Physics']}, C{r['Chemistry']}, M{r['Maths']}"
                          for r in rows])
        if not body:
            body = " - (no preview)"
        lines.append(f"{header}\n{body}")

    tableish = "\n".join(lines)

    system = {
        "role": "system",
        "content": "You are an expert academic administrator who writes concise, neutral summaries."
    }
    prompt = (
        "Write a clear 1–2 paragraph report for department heads based on the following stats.\n"
        f"Total students: {stats['total_students']}\n"
        f"Assigned counts: {json.dumps(stats['assigned_counts'])}\n"
        f"Unassigned count: {stats['unassigned_count']}\n\n"
        "Preview of first few assigned students by department:\n"
        f"{tableish}\n\n"
        "Highlight any notable skew (e.g., too few students meeting certain cut-offs) "
        "and suggest whether criteria might be tuned."
    )
    user = {"role": "user", "content": prompt}

    payload = {
        "messages": [system, user],
        "model": "gpt-4",
        "max_tokens": "400",
        "temperature": "0.4",
        "top_p": "1"
    }
    headers = {
        "x-api-token": X_API_TOKEN,
        "Content-Type": "application/json",
    }
    if CSRFTOKEN:
        headers["Cookie"] = f"csrftoken={CSRFTOKEN}"

    try:
        resp = requests.post(WRAPPER_URL, headers=headers, data=json.dumps(payload), timeout=60)
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        # Safe fallback
        return (
            "AI Narrative (wrapper unavailable):\n"
            f"Error calling wrapper: {e}\n\n"
            f"Total students: {stats['total_students']}\n"
            f"Assigned counts: {stats['assigned_counts']}\n"
            f"Unassigned: {stats['unassigned_count']}\n"
        )


# =========================
# Core logic
# =========================
REQUIRED_COLUMNS = ["Name", "Roll", "Physics", "Chemistry", "Maths"]

def validate_columns(df: pd.DataFrame):
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Input file is missing columns: {missing}. "
                         f"Expected columns: {REQUIRED_COLUMNS}")


def assign_students(df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    """Return a dict: department -> DataFrame of eligible students."""
    out = {}
    for dept, predicate in DEPARTMENTS.items():
        mask = df.apply(predicate, axis=1)
        out[dept] = df[mask].copy()
    return out


def build_stats(df: pd.DataFrame, assignments: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
    assigned_counts = {dept: len(ddf) for dept, ddf in assignments.items()}
    assigned_rolls = set()
    for ddf in assignments.values():
        assigned_rolls.update(ddf["Roll"].tolist())

    unassigned = df[~df["Roll"].isin(assigned_rolls)].copy()

    # small preview (first 3 per department)
    preview: Dict[str, List[Dict[str, Any]]] = {}
    for dept, ddf in assignments.items():
        preview[dept] = ddf[["Name", "Roll", "Physics", "Chemistry", "Maths"]].head(3).to_dict("records")

    return {
        "total_students": int(len(df)),
        "assigned_counts": assigned_counts,
        "unassigned_count": int(len(unassigned)),
        "departments_preview": preview,
    }


def main():
    parser = argparse.ArgumentParser(description="Automated student assignment to engineering departments")
    parser.add_argument("-i", "--input", required=True, help="Path to input Excel (e.g., students.xlsx)")
    parser.add_argument("-o", "--outdir", default="output_departments", help="Directory to write results")
    parser.add_argument("--report_name", default="summary_report", help="Base name for report files")
    args = parser.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    # 1) Read
    df = pd.read_excel(args.input)
    validate_columns(df)

    # 2) Assign
    assignments = assign_students(df)

    # 3) Write one Excel per department
    for dept, ddf in assignments.items():
        out_path = os.path.join(args.outdir, f"{dept.replace(' ', '_')}.xlsx")
        ddf.to_excel(out_path, index=False)

    # 4) Stats + narrative
    stats = build_stats(df, assignments)

    # Save JSON stats
    json_path = os.path.join(args.outdir, f"{args.report_name}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)

    # Narrative (AI if configured, else local)
    narrative = llm_report(stats)
    txt_path = os.path.join(args.outdir, f"{args.report_name}.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(narrative)

    print("=== DONE ===")
    print(f"- Department files written to: {os.path.abspath(args.outdir)}")
    print(f"- Stats JSON: {json_path}")
    print(f"- Report (txt): {txt_path}")


if __name__ == "__main__":
    main()




# 1) Install dependencies (once)
pip install pandas requests openpyxl

# 2) Run (no LLM narrative — purely local)
python assign_departments.py -i students.xlsx -o out

# 3) (Optional) Enable the AI-written narrative:
#    Open the script and set:
#       WRAPPER_URL = "https://openai-api-wrapper-xxxx.a.run.app/api/"
#       X_API_TOKEN = "<your_token>"
#    Then re-run:
python assign_departments.py -i students.xlsx -o out


