#!/usr/bin/env python3
"""
Oracle Database Summary Script
--------------------------------
This script connects to an existing Oracle Database and generates
a high-level summary of tables present in the schema. It includes:

 - Table name
 - Row count (estimated or exact)
 - Last analyzed date
 - Table size in MB
 - Total row and size summary

It is read-only — it does not create or modify any data.

Dependencies:
    pip install oracledb pandas
"""

import json
import time
import pandas as pd
import oracledb

# -------------------------------------------------------------------
# Configuration section — update these values for your environment
# -------------------------------------------------------------------

HOST = "your-db-host"       # e.g., "10.12.34.56" or "db.example.com"
PORT = 1521
SERVICE = "PRODDB"          # Oracle service name (not SID)
USER = "MIG_USER"
PASSWORD = "Password123"

OWNER = None                # Leave None for current schema; else specify e.g. "HR"
MODE = "stats"              # "stats" = NUM_ROWS (fast), "exact" = COUNT(*) (slow)
OUT_PREFIX = "oracle_summary"
# -------------------------------------------------------------------


def get_connection():
    """Establish a connection to the Oracle database."""
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    return oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)


def fetch_table_summary(conn, owner=None):
    """Fetch metadata for all tables with row estimates and size in MB."""
    with conn.cursor() as cur:
        if owner:
            query = """
                WITH t AS (
                    SELECT owner, table_name, num_rows, last_analyzed
                    FROM ALL_TABLES WHERE UPPER(owner) = :owner
                ),
                s AS (
                    SELECT owner, segment_name AS table_name, SUM(bytes) AS bytes
                    FROM ALL_SEGMENTS
                    WHERE UPPER(owner) = :owner
                      AND segment_type IN ('TABLE','TABLE PARTITION','TABLE SUBPARTITION')
                    GROUP BY owner, segment_name
                )
                SELECT t.owner, t.table_name, t.num_rows, t.last_analyzed,
                       ROUND(NVL(s.bytes,0)/1024/1024,2) AS size_mb
                FROM t LEFT JOIN s
                ON s.owner = t.owner AND s.table_name = t.table_name
                ORDER BY size_mb DESC NULLS LAST, t.table_name
            """
            cur.execute(query, owner=owner.upper())
        else:
            query = """
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
                FROM t LEFT JOIN s ON s.table_name = t.table_name
                ORDER BY size_mb DESC NULLS LAST, t.table_name
            """
            cur.execute(query)
        data = cur.fetchall()
        columns = [col[0] for col in cur.description]
    return pd.DataFrame(data, columns=columns)


def count_rows_exact(conn, owner, df):
    """Get exact row count using COUNT(*) for each table."""
    results = []
    with conn.cursor() as cur:
        for _, row in df.iterrows():
            table_name = row["TABLE_NAME"]
            fq_table = f"\"{owner.upper()}\".\"{table_name}\"" if owner else f"\"{table_name}\""
            try:
                cur.execute(f"SELECT COUNT(*) FROM {fq_table}")
                results.append(cur.fetchone()[0])
            except Exception as err:
                print(f"⚠️  Skipping {table_name}: {err}")
                results.append(None)
    return pd.Series(results, index=df.index, name="ROWS")


def summarize(df, owner_label, mode):
    """Print summary and save to CSV/JSON."""
    for col in ["OWNER", "TABLE_NAME", "ROWS", "ROWS_SOURCE", "LAST_ANALYZED", "SIZE_MB", "NUM_ROWS"]:
        if col not in df.columns:
            df[col] = pd.NA
    df = df[["OWNER", "TABLE_NAME", "ROWS", "ROWS_SOURCE", "LAST_ANALYZED", "SIZE_MB", "NUM_ROWS"]]

    total_tables = len(df)
    total_rows = int(df["ROWS"].fillna(0).sum())
    total_size = round(df["SIZE_MB"].fillna(0).sum(), 2)

    print("\n==============================")
    print("     ORACLE DATABASE SUMMARY  ")
    print("==============================")
    print(f"Schema/Owner : {owner_label}")
    print(f"Row Mode     : {mode.upper()}")
    print(f"Tables       : {total_tables}")
    print(f"Total Rows   : {total_rows:,}")
    print(f"Total Size   : {total_size} MB\n")

    top_tables = df.sort_values("SIZE_MB", ascending=False).head(10)
    if not top_tables.empty:
        print("Top 10 Largest Tables:")
        for _, r in top_tables.iterrows():
            print(f"  {r['TABLE_NAME']:<30} Rows: {str(r['ROWS']):>10}   Size_MB: {r['SIZE_MB']}")

    csv_file = f"{OUT_PREFIX}_{owner_label}_{mode}.csv"
    json_file = f"{OUT_PREFIX}_{owner_label}_{mode}.json"

    df.to_csv(csv_file, index=False)
    with open(json_file, "w") as f:
        json.dump({
            "generated_at": int(time.time()),
            "owner": owner_label,
            "mode": mode,
            "table_count": total_tables,
            "total_rows": total_rows,
            "total_size_mb": total_size,
            "tables": df.fillna("").to_dict(orient="records")
        }, f, indent=2)

    print(f"\n✅ Output generated:\n  - {csv_file}\n  - {json_file}\n")


def main():
    """Main entry point."""
    conn = get_connection()
    try:
        df = fetch_table_summary(conn, OWNER)

        if MODE.lower() == "exact":
            df["ROWS"] = count_rows_exact(conn, OWNER, df)
            df["ROWS_SOURCE"] = "EXACT"
        else:
            df["ROWS"] = df["NUM_ROWS"]
            df["ROWS_SOURCE"] = "STATS"

        owner_label = OWNER.upper() if OWNER else (df["OWNER"].iloc[0] if not df.empty else USER).upper()
        summarize(df, owner_label, MODE.lower())

    finally:
        try:
            conn.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()