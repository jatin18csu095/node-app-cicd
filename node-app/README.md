#!/usr/bin/env python3
"""
STAGING schema summary (final, JSON-safe)
- Summarizes all tables in STAGING
- Adds NUM_ROWS and LAST_ANALYZED
- Adds SIZE_MB / SIZE_GB when accessible
- Exports clean CSV + JSON (timestamp-safe)
"""

import time
import json
import pandas as pd
import oracledb

# ----------------- CONFIGS -----------------
HOST      = "p2ehowld8001"
PORT      = 1526
SERVICE   = "GIFTARC"
USER      = "x292151"
PASSWORD  = "tue2943"

OWNER     = "STAGING"           # target schema
OUT_PREFIX = "staging_summary"  # output prefix
# ------------------------------------------


def connect():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    return oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)


def fetch_alltables(conn, owner: str) -> pd.DataFrame:
    sql = """
        SELECT owner, table_name, num_rows, last_analyzed
        FROM ALL_TABLES
        WHERE owner = :owner
        ORDER BY table_name
    """
    with conn.cursor() as cur:
        cur.execute(sql, owner=owner.upper())
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
    return pd.DataFrame(rows, columns=cols)


def try_add_sizes(conn, df: pd.DataFrame) -> pd.DataFrame:
    df["SIZE_MB"] = pd.NA
    df["SIZE_GB"] = pd.NA
    if df.empty:
        return df
    try:
        names = df["TABLE_NAME"].unique().tolist()
        binds = {"owner": df["OWNER"].iloc[0]}
        placeholders = []
        for i, name in enumerate(names):
            k = f"n{i}"
            binds[k] = name
            placeholders.append(f":{k}")

        sql = f"""
            SELECT segment_name, ROUND(SUM(bytes)/1024/1024, 2) AS size_mb
            FROM ALL_SEGMENTS
            WHERE owner = :owner
              AND segment_type IN ('TABLE','TABLE PARTITION','TABLE SUBPARTITION')
              AND segment_name IN ({", ".join(placeholders)})
            GROUP BY segment_name
        """
        with conn.cursor() as cur:
            cur.execute(sql, binds)
            size_map = {seg: float(mb) for seg, mb in cur.fetchall()}
        df["SIZE_MB"] = df["TABLE_NAME"].map(size_map)
        df["SIZE_GB"] = (pd.to_numeric(df["SIZE_MB"], errors="coerce").fillna(0)/1024).round(3)
    except oracledb.DatabaseError:
        pass
    return df


def json_safe(value):
    """Convert Timestamp/NaT/float32 objects to JSON-safe types."""
    if pd.isna(value):
        return None
    if hasattr(value, "isoformat"):  # datetime or Timestamp
        return value.isoformat()
    if isinstance(value, (float, int, str)):
        return value
    return str(value)


def summarize_and_export(owner: str, df: pd.DataFrame):
    df = df.copy()
    df["NUM_ROWS"] = pd.to_numeric(df["NUM_ROWS"], errors="coerce").fillna(0).astype(int)
    df["SIZE_MB"] = pd.to_numeric(df["SIZE_MB"], errors="coerce").fillna(0)
    df["SIZE_GB"] = pd.to_numeric(df["SIZE_GB"], errors="coerce").fillna(0)

    total_tables = len(df)
    total_rows = int(df["NUM_ROWS"].sum())
    total_mb = float(df["SIZE_MB"].sum())
    total_gb = round(total_mb / 1024, 3) if total_mb else None

    print("\n===== STAGING SCHEMA SUMMARY =====")
    print(f"Schema / Owner   : {owner}")
    print(f"Total Tables     : {total_tables}")
    print(f"Total Rows       : {total_rows:,}")
    if total_gb:
        print(f"Total Size (MB)  : {round(total_mb, 2)}")
        print(f"Total Size (GB)  : {total_gb}")
    else:
        print("Total Size       : N/A (size view not permitted)")
    print("==================================\n")

    show = df.sort_values("NUM_ROWS", ascending=False)
    print("Top 10 tables (by row count):")
    for _, r in show.head(10).iterrows():
        print(f"  {r['TABLE_NAME']:<40} rows={r['NUM_ROWS']:>10}  size={r['SIZE_MB']} MB")

    # Export
    ts = time.strftime("%Y%m%d_%H%M%S")
    csv_path = f"{OUT_PREFIX}_{owner}_{ts}.csv"
    json_path = f"{OUT_PREFIX}_{owner}_{ts}.json"

    df_out = df[["OWNER","TABLE_NAME","NUM_ROWS","LAST_ANALYZED","SIZE_MB","SIZE_GB"]]
    df_out.to_csv(csv_path, index=False)

    data = {
        "generated_at": int(time.time()),
        "owner": owner,
        "table_count": total_tables,
        "total_rows": total_rows,
        "total_size_mb": round(total_mb, 2) if total_mb else None,
        "total_size_gb": total_gb,
        "tables": [
            {
                "OWNER": json_safe(row["OWNER"]),
                "TABLE_NAME": json_safe(row["TABLE_NAME"]),
                "NUM_ROWS": json_safe(row["NUM_ROWS"]),
                "LAST_ANALYZED": json_safe(row["LAST_ANALYZED"]),
                "SIZE_MB": json_safe(row["SIZE_MB"]),
                "SIZE_GB": json_safe(row["SIZE_GB"]),
            }
            for _, row in df_out.iterrows()
        ],
    }

    with open(json_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"\n✅ Wrote:\n  {csv_path}\n  {json_path}\n")


def main():
    print("Connecting to Oracle…")
    conn = connect()
    try:
        print(f"Connected as: {USER}")
        df = fetch_alltables(conn, OWNER)
        if df.empty:
            print(f"\n⚠️ No tables returned for schema '{OWNER}'. Check privileges.")
            return
        df = try_add_sizes(conn, df)
        summarize_and_export(OWNER, df)
    finally:
        conn.close()


if __name__ == "__main__":
    main()