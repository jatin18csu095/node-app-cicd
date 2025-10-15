#!/usr/bin/env python3
"""
Oracle Schema Summary (resilient)
- Summarizes a schema's tables with size (MB/GB) when permitted, else rows-only
- Owner can be forced via OWNER_FILTER, or auto-guessed from synonyms
- Exports CSV and JSON
- Read-only; safe for production
"""

import json
import time
import oracledb
import pandas as pd

# ---------------- CONFIG: EDIT THESE ----------------
HOST        = "p2ehowld8001"
PORT        = 1526
SERVICE     = "GIFTARC"
USER        = "x292151"
PASSWORD    = "your_password_here"

# If you know the schema, set it here (recommended): e.g. "GIFTARC" or "GIFTARCHIVE"
OWNER_FILTER = "GIFTARC"          # set to None to auto-detect

# When sizes are not permitted, choose row mode:
ROW_MODE = "stats"                # "stats" uses NUM_ROWS; "exact" does COUNT(*) per table (slower)
OUT_PREFIX = "oracle_schema_summary"
# ----------------------------------------------------


SYSTEM_OWNERS = {
    "SYS","SYSTEM","XDB","MDSYS","CTXSYS","ORDSYS","DBSNMP","OUTLN","WMSYS","LBACSYS",
    "OLAPSYS","APPQOSSYS","ORDPLUGINS","SI_INFORMTN_SCHEMA","DVSYS","GSMADMIN_INTERNAL",
    "AUDSYS","OJVMSYS","REMOTE_SCHEDULER_AGENT","DVF","GGSYS","SYSBACKUP","SYSDG","SYSKM",
    "ANONYMOUS","PUBLIC"
}


def connect():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    return oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)


def current_user(conn) -> str:
    with conn.cursor() as cur:
        cur.execute("SELECT USER FROM dual")
        return cur.fetchone()[0].upper()


def guess_owner_from_synonyms(conn) -> str | None:
    """
    Use PUBLIC/USER synonyms to guess the most likely application owner.
    Returns top TABLE_OWNER not in SYSTEM_OWNERS, or None if not available.
    """
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_owner, COUNT(*) AS c
                FROM ALL_SYNONYMS
                WHERE owner IN (USER, 'PUBLIC') AND table_owner IS NOT NULL
                GROUP BY table_owner
                ORDER BY c DESC
            """)
            for owner, cnt in cur.fetchall():
                if owner and owner.upper() not in SYSTEM_OWNERS:
                    return owner.upper()
    except Exception:
        return None
    return None


def fetch_with_sizes(conn, owner: str) -> pd.DataFrame:
    """
    Preferred path: sizes from ALL_SEGMENTS join.
    Requires dictionary access. Raises on privilege errors; caller will catch.
    """
    sql = """
        SELECT
          t.owner,
          t.table_name,
          t.num_rows,
          t.last_analyzed,
          ROUND(NVL(SUM(s.bytes),0)/1024/1024, 2) AS size_mb
        FROM ALL_TABLES t
        LEFT JOIN ALL_SEGMENTS s
          ON s.owner = t.owner
         AND s.segment_name = t.table_name
         AND s.segment_type IN ('TABLE','TABLE PARTITION','TABLE SUBPARTITION')
        WHERE t.owner = :owner
        GROUP BY t.owner, t.table_name, t.num_rows, t.last_analyzed
        ORDER BY size_mb DESC NULLS LAST, t.table_name
    """
    with conn.cursor() as cur:
        cur.execute(sql, owner=owner)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
    df = pd.DataFrame(rows, columns=cols)
    df["SIZE_GB"] = (pd.to_numeric(df["SIZE_MB"], errors="coerce").fillna(0) / 1024).round(3)
    return df


def fetch_rows_only(conn, owner: str) -> pd.DataFrame:
    """
    Fallback when sizes are blocked. Returns NUM_ROWS + LAST_ANALYZED, size columns empty.
    """
    sql = """
        SELECT owner, table_name, num_rows, last_analyzed
        FROM ALL_TABLES
        WHERE owner = :owner
        ORDER BY table_name
    """
    with conn.cursor() as cur:
        cur.execute(sql, owner=owner)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
    df = pd.DataFrame(rows, columns=cols)
    df["SIZE_MB"] = pd.NA
    df["SIZE_GB"] = pd.NA
    return df


def exact_counts(conn, owner: str, df: pd.DataFrame) -> pd.Series:
    counts = []
    with conn.cursor() as cur:
        for _, r in df.iterrows():
            t = r["TABLE_NAME"]
            fq = f"\"{owner}\".\"{t}\""
            try:
                cur.execute(f"SELECT /*+ FULL(t) */ COUNT(*) FROM {fq} t")
                counts.append(cur.fetchone()[0])
            except Exception:
                counts.append(None)
    return pd.Series(counts, index=df.index, name="ROWS_EXACT")


def print_and_export(owner: str, df: pd.DataFrame, size_mode: str):
    # Choose rows source column
    if ROW_MODE.lower() == "exact" and size_mode != "empty":
        df["ROWS"] = exact_counts(conn, owner, df)  # will be defined in main scope
        df["ROWS_SOURCE"] = "EXACT"
    else:
        df["ROWS"] = df["NUM_ROWS"]
        df["ROWS_SOURCE"] = "STATS"

    # Totals
    total_tables = len(df)
    total_rows = int(pd.to_numeric(df["ROWS"], errors="coerce").fillna(0).sum())
    total_mb = float(pd.to_numeric(df["SIZE_MB"], errors="coerce").fillna(0).sum())
    total_gb = round(total_mb / 1024, 3) if size_mode == "sizes" else None

    # Console
    print("\n===== ORACLE SCHEMA SUMMARY =====")
    print(f"Schema / Owner   : {owner}")
    print(f"Tables           : {total_tables}")
    print(f"Total Rows       : {total_rows:,}")
    if size_mode == "sizes":
        print(f"Total Size (MB)  : {round(total_mb,2)}")
        print(f"Total Size (GB)  : {total_gb}")
    else:
        print("Total Size       : N/A (no dictionary size access)")
    print("=================================\n")

    top = df.copy()
    top["SIZE_MB_NUM"] = pd.to_numeric(top["SIZE_MB"], errors="coerce").fillna(0)
    print("Top 10 tables by size (or by name if size N/A):")
    if size_mode == "sizes":
        top = top.sort_values("SIZE_MB_NUM", ascending=False)
    else:
        top = top.sort_values("TABLE_NAME")
    for _, r in top.head(10).iterrows():
        size_str = f"{r['SIZE_MB']} MB" if size_mode == "sizes" else "N/A"
        print(f"  {r['TABLE_NAME']:<40} rows={str(r['ROWS']):>12}  size={size_str}")

    # Order columns and export
    out = df[["OWNER","TABLE_NAME","ROWS","ROWS_SOURCE","LAST_ANALYZED","SIZE_MB","SIZE_GB","NUM_ROWS"]]
    ts = time.strftime("%Y%m%d_%H%M%S")
    csv_path = f"{OUT_PREFIX}_{owner}_{size_mode}_{ROW_MODE.lower()}_{ts}.csv"
    json_path = f"{OUT_PREFIX}_{owner}_{size_mode}_{ROW_MODE.lower()}_{ts}.json"

    out.to_csv(csv_path, index=False)
    with open(json_path, "w") as f:
        json.dump({
            "generated_at": int(time.time()),
            "owner": owner,
            "row_mode": ROW_MODE.lower(),
            "size_mode": size_mode,
            "table_count": total_tables,
            "total_rows": total_rows,
            "total_size_mb": round(total_mb,2) if size_mode == "sizes" else None,
            "total_size_gb": total_gb if size_mode == "sizes" else None,
            "tables": out.fillna("").to_dict(orient="records")
        }, f, indent=2)

    print(f"\nWrote:\n  {csv_path}\n  {json_path}\n")


if __name__ == "__main__":
    print("Connecting to Oracle...")
    conn = connect()
    try:
        print(f"Connected as: {USER}")

        # Decide owner
        if OWNER_FILTER:
            owner = OWNER_FILTER.upper()
        else:
            owner = guess_owner_from_synonyms(conn) or current_user(conn)
        print(f"\nUsing schema owner: {owner}")

        # Try with sizes first
        try:
            df = fetch_with_sizes(conn, owner)
            size_mode = "sizes"
        except oracledb.DatabaseError as e:
            msg = str(e)
            # Typical: ORA-00942 / ORA-01031 etc.
            print("[Info] Size query not permitted; falling back to rows-only.")
            df = fetch_rows_only(conn, owner)
            size_mode = "empty"

        # If no rows returned (e.g., wrong owner), tell user clearly
        if df.empty:
            print(f"\nNo tables returned for owner '{owner}'.")
            print("Try setting OWNER_FILTER to the actual schema (e.g., 'GIFTARC' or 'GIFTARCHIVE').")
        else:
            print_and_export(owner, df, size_mode)

    finally:
        try:
            conn.close()
        except Exception:
            pass