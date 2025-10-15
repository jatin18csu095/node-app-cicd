#!/usr/bin/env python3
"""
Oracle DB Schema Summary (with size in GB)
------------------------------------------
✅ Lists all tables with row count & size (MB / GB)
✅ Summarizes total schema size
✅ Exports CSV + JSON outputs
✅ Works read-only (safe for production)
"""

import pandas as pd
import json
import time
import oracledb

# ---------- CONFIG ----------
HOST     = "p2ehowld8001"
PORT     = 1526
SERVICE  = "GIFTARC"
USER     = "x292151"
PASSWORD = "your_password_here"
OUT_PREFIX = "oracle_schema_summary"
OWNER_FILTER = None    # Set schema name if known (e.g. "GIFTARC"); else None auto-detect
# ----------------------------


def connect():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    conn = oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)
    return conn


def detect_owner(conn):
    """Find top schema owner visible to this user."""
    with conn.cursor() as cur:
        cur.execute("SELECT USER FROM dual")
        me = cur.fetchone()[0]
        try:
            cur.execute("""
                SELECT DISTINCT owner FROM all_tables 
                WHERE owner NOT IN ('SYS','SYSTEM','XDB','MDSYS') FETCH FIRST 1 ROWS ONLY
            """)
            row = cur.fetchone()
            if row:
                return row[0]
        except Exception:
            pass
        return me


def fetch_schema_summary(conn, owner):
    """Return DataFrame of table sizes and row counts for the schema."""
    sql = f"""
        SELECT
            t.owner,
            t.table_name,
            t.num_rows,
            s.bytes / 1024 / 1024 AS size_mb
        FROM all_tables t
        LEFT JOIN all_segments s
        ON t.table_name = s.segment_name AND t.owner = s.owner
        WHERE t.owner = :owner
        ORDER BY s.bytes DESC NULLS LAST
    """
    with conn.cursor() as cur:
        cur.execute(sql, owner=owner)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
    df = pd.DataFrame(rows, columns=cols)
    df["size_mb"].fillna(0, inplace=True)
    df["size_gb"] = (df["size_mb"] / 1024).round(3)
    return df


def summarize_schema(df, owner):
    """Print summary and export files."""
    total_tables = len(df)
    total_rows = int(df["NUM_ROWS"].fillna(0).sum())
    total_mb = df["size_mb"].sum()
    total_gb = total_mb / 1024

    print("\n===== ORACLE SCHEMA SUMMARY =====")
    print(f"Schema / Owner   : {owner}")
    print(f"Total Tables     : {total_tables}")
    print(f"Total Rows       : {total_rows:,}")
    print(f"Total Size (MB)  : {round(total_mb, 2)} MB")
    print(f"Total Size (GB)  : {round(total_gb, 3)} GB")
    print("=================================\n")

    print("Top 10 Largest Tables:")
    for _, r in df.nlargest(10, "size_mb").iterrows():
        print(f"{r['TABLE_NAME']:<40} {r['size_mb']:>10.2f} MB {r['NUM_ROWS']:>10}")

    # Export outputs
    ts = time.strftime("%Y%m%d_%H%M%S")
    csv_file = f"{OUT_PREFIX}_{owner}_{ts}.csv"
    json_file = f"{OUT_PREFIX}_{owner}_{ts}.json"
    df.to_csv(csv_file, index=False)
    with open(json_file, "w") as f:
        json.dump({
            "generated_at": int(time.time()),
            "owner": owner,
            "table_count": total_tables,
            "total_rows": total_rows,
            "total_size_mb": round(total_mb, 2),
            "total_size_gb": round(total_gb, 3),
            "tables": df.fillna("").to_dict(orient="records")
        }, f, indent=2)

    print(f"\n✅ Exported:")
    print(f"  {csv_file}")
    print(f"  {json_file}\n")


def main():
    print("🔗 Connecting to Oracle...")
    conn = connect()
    print(f"✅ Connected as: {USER}")

    owner = OWNER_FILTER or detect_owner(conn)
    print(f"\n📂 Using schema owner: {owner}")

    df = fetch_schema_summary(conn, owner)
    if df.empty:
        print(f"\n⚠️ No tables found for schema {owner}. Check access or grants.")
    else:
        summarize_schema(df, owner)

    conn.close()


if __name__ == "__main__":
    main()