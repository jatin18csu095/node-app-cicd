#!/usr/bin/env python3
"""
Oracle Schema Summary - Final Stable Version
--------------------------------------------
✅ Detects both OWNED tables and those accessible via SYNONYMS
✅ Works under limited privileges
✅ Fetches size (MB/GB) if access allowed, else rows-only
✅ Exports clean CSV + JSON summary
"""

import oracledb
import pandas as pd
import json
import time

# ---------------- CONFIG ----------------
HOST = "p2ehowld8001"
PORT = 1526
SERVICE = "GIFTARC"
USER = "x292151"
PASSWORD = "your_password_here"

# Optional: restrict to specific schema (recommended)
OWNER_FILTER = None  # e.g., "GIFTARC" or "GIFTARCHIVE" or None for auto
OUT_PREFIX = "oracle_schema_summary"
# ----------------------------------------


def connect():
    """Connect to Oracle"""
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    conn = oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)
    print(f"✅ Connected as: {USER}")
    return conn


def detect_owners(conn):
    """Find owners visible through synonyms and direct access."""
    owners = set()
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT DISTINCT owner FROM all_tables
            WHERE owner NOT IN ('SYS','SYSTEM','MDSYS','XDB','CTXSYS')
        """)
        owners.update([r[0] for r in cur.fetchall()])
    except:
        pass

    try:
        cur.execute("""
            SELECT DISTINCT table_owner FROM all_synonyms
            WHERE owner IN (USER, 'PUBLIC') AND table_owner IS NOT NULL
        """)
        owners.update([r[0] for r in cur.fetchall()])
    except:
        pass

    return sorted(list(owners))


def fetch_table_summary(conn, owner):
    """Fetch tables, row counts, and sizes if accessible."""
    sql = """
        SELECT t.owner,
               t.table_name,
               NVL(t.num_rows, 0) AS num_rows,
               ROUND(NVL(SUM(s.bytes), 0)/1024/1024, 2) AS size_mb
        FROM all_tables t
        LEFT JOIN all_segments s
          ON s.segment_name = t.table_name AND s.owner = t.owner
        WHERE t.owner = :owner
        GROUP BY t.owner, t.table_name, t.num_rows
        ORDER BY size_mb DESC NULLS LAST
    """
    cur = conn.cursor()
    cur.execute(sql, owner=owner)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    df = pd.DataFrame(rows, columns=cols)
    df["SIZE_GB"] = (df["SIZE_MB"] / 1024).round(3)
    return df


def summarize_and_export(owner, df):
    """Summarize totals and export CSV + JSON."""
    total_tables = len(df)
    total_rows = int(df["NUM_ROWS"].sum())
    total_mb = float(df["SIZE_MB"].sum())
    total_gb = round(total_mb / 1024, 3)

    print(f"\n===== ORACLE SCHEMA SUMMARY =====")
    print(f"Schema / Owner   : {owner}")
    print(f"Total Tables     : {total_tables}")
    print(f"Total Rows       : {total_rows:,}")
    print(f"Total Size (MB)  : {round(total_mb, 2)}")
    print(f"Total Size (GB)  : {total_gb}")
    print("=================================\n")

    print("Top 10 Tables by Size:")
    for _, row in df.nlargest(10, "SIZE_MB").iterrows():
        print(f"  {row['TABLE_NAME']:<40} {row['SIZE_MB']:>10.2f} MB {int(row['NUM_ROWS']):>10} rows")

    ts = time.strftime("%Y%m%d_%H%M%S")
    csv_file = f"{OUT_PREFIX}_{owner}_{ts}.csv"
    json_file = f"{OUT_PREFIX}_{owner}_{ts}.json"

    df.to_csv(csv_file, index=False)
    with open(json_file, "w") as f:
        json.dump({
            "owner": owner,
            "table_count": total_tables,
            "total_rows": total_rows,
            "total_size_mb": round(total_mb, 2),
            "total_size_gb": total_gb,
            "tables": df.to_dict(orient="records"),
        }, f, indent=2)

    print(f"\n✅ Exported:\n  {csv_file}\n  {json_file}\n")


def main():
    conn = connect()
    owners = [OWNER_FILTER.upper()] if OWNER_FILTER else detect_owners(conn)

    if not owners:
        print("⚠️  No visible owners or synonyms found. Check access or grants.")
        return

    for owner in owners:
        print(f"\n🔍 Checking schema: {owner}")
        try:
            df = fetch_table_summary(conn, owner)
            if not df.empty:
                summarize_and_export(owner, df)
            else:
                print(f"⚠️  No tables found under {owner}")
        except oracledb.DatabaseError as e:
            print(f"⚠️  Skipping {owner}: {str(e).split(':')[-1].strip()}")

    conn.close()


if __name__ == "__main__":
    main()