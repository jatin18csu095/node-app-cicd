#!/usr/bin/env python3
"""
Oracle Table Lister (robust)
- Lists direct tables visible to the user (USER_TABLES + ALL_TABLES)
- Lists PUBLIC/USER synonyms and shows their targets
- Prints first 50 names
- Writes compact and detailed CSV/JSON outputs
"""

import json
import time
import pandas as pd
import oracledb

# ---------- CONFIG: edit these ----------
HOST     = "p2ehowld8001"
PORT     = 1526
SERVICE  = "GIFTARC"
USER     = "x292151"
PASSWORD = "your_password_here"
OUT_PREFIX = "oracle_table_list"
# ----------------------------------------


def connect():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    return oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)


def fetch_direct_tables(conn) -> pd.DataFrame:
    """
    Directly visible tables (owns or accessible).
    Returns columns: OWNER, NAME, SOURCE, TARGET_OWNER, TARGET_TABLE
    """
    with conn.cursor() as cur:
        rows = []
        # USER_TABLES (own schema)
        cur.execute("SELECT USER AS owner, table_name FROM USER_TABLES")
        rows += [(r[0], r[1], "DIRECT", None, None) for r in cur.fetchall()]
        # ALL_TABLES (may require extra grants; if it fails we just skip)
        try:
            cur.execute("SELECT owner, table_name FROM ALL_TABLES")
            rows += [(r[0], r[1], "DIRECT", None, None) for r in cur.fetchall()]
        except Exception as e:
            print(f"[Info] Skipping ALL_TABLES (not accessible): {e}")
        df = pd.DataFrame(rows, columns=["OWNER", "NAME", "SOURCE", "TARGET_OWNER", "TARGET_TABLE"])
        # De-duplicate DISPLAY entries
        df.drop_duplicates(subset=["OWNER", "NAME", "SOURCE"], inplace=True)
        df.reset_index(drop=True, inplace=True)
        return df


def fetch_synonym_tables(conn) -> pd.DataFrame:
    """
    PUBLIC/USER synonyms you can see.
    Returns columns: OWNER (synonym owner), NAME (synonym name), SOURCE='SYNONYM',
                     TARGET_OWNER, TARGET_TABLE
    """
    with conn.cursor() as cur:
        try:
            cur.execute("""
                SELECT owner, synonym_name, table_owner, table_name
                FROM ALL_SYNONYMS
                WHERE owner IN (USER, 'PUBLIC')
            """)
            rows = cur.fetchall()
        except Exception as e:
            print(f"[Info] Skipping ALL_SYNONYMS (not accessible): {e}")
            return pd.DataFrame(columns=["OWNER","NAME","SOURCE","TARGET_OWNER","TARGET_TABLE"])

    df = pd.DataFrame(rows, columns=["OWNER","NAME","TARGET_OWNER","TARGET_TABLE"])
    df["SOURCE"] = "SYNONYM"
    # Prefer USER synonyms over PUBLIC when both point to same target
    df["_rank"] = (df["OWNER"] == "PUBLIC").astype(int)  # USER=0, PUBLIC=1
    df.sort_values(by=["TARGET_OWNER","TARGET_TABLE","_rank","OWNER","NAME"], inplace=True, kind="stable")
    df = df.drop_duplicates(subset=["TARGET_OWNER","TARGET_TABLE"], keep="first")
    df.drop(columns=["_rank"], inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df[["OWNER","NAME","SOURCE","TARGET_OWNER","TARGET_TABLE"]]


def save_outputs(df_compact: pd.DataFrame, df_detail: pd.DataFrame):
    ts_suffix = time.strftime("%Y%m%d_%H%M%S")

    # Compact (OWNER, NAME, SOURCE)
    compact_csv  = f"{OUT_PREFIX}_compact_{ts_suffix}.csv"
    compact_json = f"{OUT_PREFIX}_compact_{ts_suffix}.json"
    df_compact.to_csv(compact_csv, index=False)
    df_compact.to_json(compact_json, orient="records", indent=2)

    # Detailed (+ TARGET_OWNER, TARGET_TABLE for synonyms)
    detail_csv  = f"{OUT_PREFIX}_detailed_{ts_suffix}.csv"
    detail_json = f"{OUT_PREFIX}_detailed_{ts_suffix}.json"
    df_detail.to_csv(detail_csv, index=False)
    df_detail.to_json(detail_json, orient="records", indent=2)

    print(f"\n✅ Exported:")
    print(f"  {compact_csv}")
    print(f"  {compact_json}")
    print(f"  {detail_csv}")
    print(f"  {detail_json}\n")


def main():
    print("Connecting to Oracle...")
    conn = connect()
    print(f"Connected as: {USER}\n")

    df_direct  = fetch_direct_tables(conn)
    print(f"Found {len(df_direct)} direct tables.")

    df_syn     = fetch_synonym_tables(conn)
    print(f"Found {len(df_syn)} synonym mappings.\n")

    # Build compact and detailed sets
    df_detail = pd.concat([df_direct, df_syn], ignore_index=True)
    # Compact list is just display names; ensure uniqueness
    df_compact = df_detail[["OWNER","NAME","SOURCE"]].drop_duplicates().reset_index(drop=True)

    # Print first 50 for a quick look
    print("=== SAMPLE (first 50) ===")
    for _, r in df_compact.head(50).iterrows():
        print(f"{r['OWNER']:<15} {r['NAME']:<40} {r['SOURCE']}")
    print("...")

    save_outputs(df_compact, df_detail)
    conn.close()


if __name__ == "__main__":
    main()