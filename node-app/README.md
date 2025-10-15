#!/usr/bin/env python3
"""
Oracle Table Lister (Read-only)
--------------------------------
This script connects to Oracle and lists all accessible tables for the user.
It checks:
 - USER_TABLES (tables you own)
 - ALL_TABLES (tables you can query)
 - PUBLIC/USER SYNONYMS (tables linked via synonyms)

Outputs:
 - Prints first 50 table names to console
 - Saves complete list to CSV + JSON
"""

import pandas as pd
import json
import oracledb
import time

# ----------- CONFIG (edit these) ------------
HOST     = "p2ehowld8001"
PORT     = 1526
SERVICE  = "GIFTARC"
USER     = "x292151"
PASSWORD = "your_password_here"
OUT_PREFIX = "oracle_table_list"
# --------------------------------------------


def connect():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    conn = oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)
    return conn


def fetch_all_tables(conn):
    """Fetch all accessible tables using USER_TABLES + ALL_TABLES."""
    with conn.cursor() as cur:
        try:
            # ALL_TABLES might need SELECT ANY DICTIONARY, but try anyway
            cur.execute("""
                SELECT owner, table_name, 'ALL_TABLES' AS SOURCE
                FROM ALL_TABLES
                UNION
                SELECT USER AS owner, table_name, 'USER_TABLES' AS SOURCE
                FROM USER_TABLES
                ORDER BY owner, table_name
            """)
            rows = cur.fetchall()
            return pd.DataFrame(rows, columns=["OWNER", "TABLE_NAME", "SOURCE"])
        except Exception as e:
            print(f"[WARN] Could not query ALL_TABLES: {e}")
            # fallback to USER_TABLES only
            cur.execute("SELECT USER AS owner, table_name, 'USER_TABLES' AS SOURCE FROM USER_TABLES ORDER BY table_name")
            rows = cur.fetchall()
            return pd.DataFrame(rows, columns=["OWNER", "TABLE_NAME", "SOURCE"])


def fetch_synonym_tables(conn):
    """Fetch tables accessible via synonyms."""
    with conn.cursor() as cur:
        try:
            cur.execute("""
                SELECT owner, synonym_name, table_owner, table_name
                FROM ALL_SYNONYMS
                WHERE owner IN (USER, 'PUBLIC')
                ORDER BY owner, synonym_name
            """)
            rows = cur.fetchall()
            return pd.DataFrame(rows, columns=["SYN_OWNER", "SYNONYM_NAME", "TABLE_OWNER", "TABLE_NAME"])
        except Exception as e:
            print(f"[WARN] Could not query ALL_SYNONYMS: {e}")
            return pd.DataFrame(columns=["SYN_OWNER", "SYNONYM_NAME", "TABLE_OWNER", "TABLE_NAME"])


def main():
    print("🔗 Connecting to Oracle...")
    conn = connect()
    print(f"✅ Connected as: {USER}")

    # Get tables from both sources
    df_tables = fetch_all_tables(conn)
    df_syn = fetch_synonym_tables(conn)

    print(f"\n📦 Found {len(df_tables)} tables directly visible.")
    print(f"🔗 Found {len(df_syn)} synonym links.\n")

    # Combine into a single DataFrame
    if not df_syn.empty:
        df_syn = df_syn.rename(columns={
            "SYN_OWNER": "OWNER",
            "SYNONYM_NAME": "TABLE_NAME"
        })
        df_syn["SOURCE"] = "SYNONYM"
        df_combined = pd.concat([df_tables, df_syn[["OWNER","TABLE_NAME","SOURCE"]]], ignore_index=True)
    else:
        df_combined = df_tables

    df_combined.drop_duplicates(subset=["OWNER", "TABLE_NAME"], inplace=True)
    df_combined.reset_index(drop=True, inplace=True)

    # Save to files
    csv_file = f"{OUT_PREFIX}_all_tables.csv"
    json_file = f"{OUT_PREFIX}_all_tables.json"
    df_combined.to_csv(csv_file, index=False)
    df_combined.to_json(json_file, orient="records", indent=2)

    # Display top results
    print("=== SAMPLE TABLE LIST (first 50) ===")
    for i, row in df_combined.head(50).iterrows():
        print(f"{row['OWNER']:<15} {row['TABLE_NAME']:<40} {row['SOURCE']}")
    print("...")

    print(f"\n✅ Exported full list to:\n  {csv_file}\n  {json_file}")

    conn.close()


if __name__ == "__main__":
    main()