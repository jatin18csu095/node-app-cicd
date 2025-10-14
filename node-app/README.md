#!/usr/bin/env python3
"""
Oracle DB Summary (client-side, final)
-------------------------------------
Collects a schema-level summary from an existing Oracle Database:

• Connects using credentials defined below.
• Fetches table-level rows (stats or exact), size (MB), and last_analyzed.
• Prints totals and saves both CSV + JSON summary files.

No DDL or DML — 100% read-only.

Requires: pip install oracledb pandas
"""

import time, json, pandas as pd, oracledb

# =======================
# 🔧 CONFIGURATION
# =======================
HOST        = "db-host-or-ip"     # e.g. "10.12.34.56" or "db.company.com"
PORT        = 1521
SERVICE     = "PRODDB"            # Service name (not SID)
USER        = "MIGRATION_USER"
PASSWORD    = "YourPasswordHere"

OWNER       = None                # None → current schema; or "TARGET_SCHEMA"
MODE        = "stats"             # "stats" (fast, NUM_ROWS) or "exact" (slow, COUNT(*))
OUT_PREFIX  = "oracle_summary"    # filename prefix
# =======================


def connect():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    return oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)


def fetch_tables_and_sizes(conn, owner: str | None):
    """Return DataFrame with OWNER, TABLE_NAME, NUM_ROWS, LAST_ANALYZED, SIZE_MB."""
    with conn.cursor() as cur:
        if owner:
            sql = """
            WITH t AS (
              SELECT owner, table_name, num_rows, last_analyzed
              FROM ALL_TABLES
              WHERE UPPER(owner)=:owner
            ),
            s AS (
              SELECT owner, segment_name AS table_name, SUM(bytes) AS bytes
              FROM ALL_SEGMENTS
              WHERE UPPER(owner)=:owner
                AND segment_type IN ('TABLE','TABLE PARTITION','TABLE SUBPARTITION')
              GROUP BY owner, segment_name
            )
            SELECT t.owner, t.table_name, t.num_rows, t.last_analyzed,
                   ROUND(NVL(s.bytes,0)/1024/1024,2) AS size_mb
            FROM t LEFT JOIN s
              ON s.owner=t.owner AND s.table_name=t.table_name
            ORDER BY size_mb DESC NULLS LAST, t.table_name
            """
            cur.execute(sql, owner=owner.upper())
        else:
            sql = """
            WITH t AS (
              SELECT USER AS owner, table_name, num_rows, last_analyzed
              FROM USER_TABLES
            ),
            s AS (
              SELECT segment_name AS table_name, SUM(bytes) AS bytes
              FROM USER_SEGMENTS
              WHERE segment_type IN ('TABLE','TABLE PARTITION','TABLE SUBPARTITION')
              GROUP BY segment_name
            )
            SELECT USER AS owner, t.table_name, t.num_rows, t.last_analyzed,
                   ROUND(NVL(s.bytes,0)/1024/1024,2) AS size_mb
            FROM t LEFT JOIN s ON s.table_name=t.table_name
            ORDER BY size_mb DESC NULLS LAST, t.table_name
            """
            cur.execute(sql)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
    return pd.DataFrame(rows, columns=cols)


def exact_counts(conn, owner: str | None, df: pd.DataFrame) -> pd.Series:
    """Run COUNT(*) per table (slow on big tables)."""
    counts = []
    with conn.cursor() as cur:
        for _, r in df.iterrows():
            tname = r["TABLE_NAME"]
            fq = f"\"{owner.upper()}\".\"{tname}\"" if owner else f"\"{tname}\""
            try:
                cur.execute(f"SELECT /*+ FULL(t) */ COUNT(*) FROM {fq} t")
                counts.append(cur.fetchone()[0])
            except Exception as e:
                print(f"⚠️  Skipping {fq}: {e}")
                counts.append(None)
    return pd.Series(counts, index=df.index, name="ROWS")


def summarize(df: pd.DataFrame, owner_label: str, mode: str):
    """Print summary and write CSV/JSON."""
    for c in ["OWNER","TABLE_NAME","ROWS","ROWS_SOURCE","LAST_ANALYZED","SIZE_MB","NUM_ROWS"]:
        if c not in df.columns: df[c] = pd.NA
    df = df[["OWNER","TABLE_NAME","ROWS","ROWS_SOURCE","LAST_ANALYZED","SIZE_MB","NUM_ROWS"]]

    total_tables = len(df)
    total_rows = int(df["ROWS"].fillna(0).sum())
    total_size = round(df["SIZE_MB"].fillna(0).sum(), 2)

    print("\n=== ORACLE DATABASE SUMMARY ===")
    print(f"Owner/schema  : {owner_label}")
    print(f"Row mode      : {mode.upper()}")
    print(f"Tables        : {total_tables}")
    print(f"Total rows    : {total_rows:,}")
    print(f"Total size MB : {total_size:,}\n")

    top = df.sort_values("SIZE_MB", ascending=False).head(10)[["TABLE_NAME","ROWS","SIZE_MB"]]
    if not top.empty:
        print("Top 10 largest tables:")
        for _, r in top.iterrows():
            print(f"  {r['TABLE_NAME']:<40} rows={str(r['ROWS']):>10}  size_mb={r['SIZE_MB']}")

    csv = f"{OUT_PREFIX}_{owner_label}_{mode}.csv"
    jsn = f"{OUT_PREFIX}_{owner_label}_{mode}.json"

    df.to_csv(csv, index=False)
    with open(jsn, "w") as f:
        json.dump({
            "generated_at": int(time.time()),
            "owner": owner_label,
            "mode": mode,
            "table_count": total_tables,
            "total_rows": total_rows,
            "total_size_mb": total_size,
            "tables": df.fillna("").to_dict(orient="records")
        }, f, indent=2)

    print(f"\n✅ Wrote files:\n  {csv}\n  {jsn}\n")


def main():
    conn = connect()
    try:
        df = fetch_tables_and_sizes(conn, OWNER)

        if MODE.lower() == "exact":
            df["ROWS"] = exact_counts(conn, OWNER, df)
            df["ROWS_SOURCE"] = "EXACT"
        else:
            df["ROWS"] = df["NUM_ROWS"]
            df["ROWS_SOURCE"] = "STATS"

        owner_label = OWNER.upper() if OWNER else (df["OWNER"].iloc[0] if not df.empty else USER).upper()
        summarize(df, owner_label, MODE.lower())

    finally:
        try: conn.close()
        except: pass


if __name__ == "__main__":
    main()