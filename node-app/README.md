#!/usr/bin/env python3
"""
Oracle Accessible Summary (no DBA grants required)
- If your schema owns tables -> summarizes them.
- Else, discovers tables reachable via PUBLIC/USER synonyms and summarizes those.
- Uses COUNT(*) through synonyms so it works even without ALL_SEGMENTS/ALL_TABLES access.
- Read-only; creates CSV/JSON outputs you can send to the team.

Requires: pip install oracledb pandas
"""

import time, json
import pandas as pd
import oracledb

# ------------- EDIT THESE -------------
HOST     = "p2ehowld8001"
PORT     = 1526
SERVICE  = "GIFTARC"
USER     = "x292151"
PASSWORD = "your_password_here"
OUT_PREFIX = "oracle_accessible_summary"
# --------------------------------------


def conn_open():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    return oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)

def current_user(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT USER FROM dual")
        return cur.fetchone()[0].upper()

def user_tables(conn):
    """Return DataFrame of tables you OWN (USER_TABLES)."""
    sql = """
    SELECT table_name
    FROM USER_TABLES
    ORDER BY table_name
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
    return pd.DataFrame(rows, columns=["TABLE_NAME"])

def accessible_synonyms(conn):
    """
    Return synonyms you can use (PUBLIC + your own user), with their target owner/table.
    Avoids DBA grants.
    """
    sql = """
    SELECT owner, synonym_name, table_owner, table_name
    FROM ALL_SYNONYMS
    WHERE owner IN (USER, 'PUBLIC')
    ORDER BY owner, synonym_name
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
    return pd.DataFrame(rows, columns=["SYN_OWNER","SYNONYM_NAME","TABLE_OWNER","TABLE_NAME"])

def count_via_name(conn, name):
    """Exact count using SELECT COUNT(*) FROM <name> (name can be a synonym)."""
    with conn.cursor() as cur:
        cur.execute(f'SELECT /*+ FULL(t) */ COUNT(*) FROM "{name}" t')
        return cur.fetchone()[0]

def safe_count_table(conn, owner, table):
    """Exact count using quoted owner.table; returns None if no privilege."""
    fq = f'"{owner}"."{table}"'
    with conn.cursor() as cur:
        try:
            cur.execute(f'SELECT /*+ FULL(t) */ COUNT(*) FROM {fq} t')
            return cur.fetchone()[0], None
        except Exception as e:
            return None, str(e)

def summarize_owned(conn, me):
    """Summarize tables you own."""
    df_names = user_tables(conn)
    rows = []
    for _, r in df_names.iterrows():
        t = r["TABLE_NAME"]
        try:
            cnt = count_via_name(conn, t)  # from own schema
            rows.append({"OWNER": me, "TABLE_NAME": t, "ROWS": cnt, "ROWS_SOURCE": "EXACT", "SIZE_MB": None})
        except Exception as e:
            rows.append({"OWNER": me, "TABLE_NAME": t, "ROWS": None, "ROWS_SOURCE": f"ERROR: {e}", "SIZE_MB": None})
    return pd.DataFrame(rows)

def summarize_via_synonyms(conn, me):
    """Summarize tables accessible through synonyms (PUBLIC + USER)."""
    syn = accessible_synonyms(conn)
    if syn.empty:
        return pd.DataFrame(columns=["OWNER","TABLE_NAME","ROWS","ROWS_SOURCE","SIZE_MB","SYNONYM"])

    # De-duplicate synonyms pointing to same owner.table, prefer USER synonyms over PUBLIC
    syn["KEY"] = syn["TABLE_OWNER"].fillna("") + "." + syn["TABLE_NAME"].fillna("")
    syn = syn.dropna(subset=["TABLE_OWNER","TABLE_NAME"])
    syn = syn.sort_values(by=["SYN_OWNER"], key=lambda s: s.eq('PUBLIC'))  # USER first, then PUBLIC
    syn = syn.drop_duplicates(subset=["KEY"], keep="first")

    rows = []
    for _, r in syn.iterrows():
        o = r["TABLE_OWNER"].upper()
        t = r["TABLE_NAME"].upper()
        cnt, err = safe_count_table(conn, o, t)
        rows.append({
            "OWNER": o,
            "TABLE_NAME": t,
            "ROWS": cnt,
            "ROWS_SOURCE": "EXACT" if err is None else f"ERROR: {err}",
            "SIZE_MB": None,
            "SYNONYM": r["SYNONYM_NAME"]
        })
    return pd.DataFrame(rows)

def write_outputs(owner_label, df, mode_note):
    df = df[["OWNER","TABLE_NAME","ROWS","ROWS_SOURCE","SIZE_MB"] + ([c for c in df.columns if c=="SYNONYM"])]
    total_tables = len(df)
    total_rows = int(pd.to_numeric(df["ROWS"], errors="coerce").fillna(0).sum())

    print("\n=== ACCESSIBLE DATA SUMMARY ===")
    print(f"Owner label   : {owner_label}")
    print(f"Tables        : {total_tables}")
    print(f"Total rows    : {total_rows:,}")
    print(f"Size mode     : N/A (no dictionary grants)")
    print(f"Note          : {mode_note}\n")

    csv_path  = f"{OUT_PREFIX}_{owner_label}_exact_rows_only.csv"
    json_path = f"{OUT_PREFIX}_{owner_label}_exact_rows_only.json"

    df.to_csv(csv_path, index=False)
    with open(json_path, "w") as f:
        json.dump({
            "generated_at": int(time.time()),
            "owner_label": owner_label,
            "row_mode": "exact",
            "size_mode": "rows_only",
            "table_count": total_tables,
            "total_rows": total_rows,
            "tables": df.fillna("").to_dict(orient="records"),
            "note": mode_note
        }, f, indent=2)

    print(f"Outputs written:\n  {csv_path}\n  {json_path}\n")

def main():
    conn = conn_open()
    try:
        me = current_user(conn)
        print(f"Connected as: {me}")

        # 1) Try owned tables
        df_owned = summarize_owned(conn, me)
        if not df_owned.empty and df_owned["TABLE_NAME"].nunique() > 0:
            # Filter out all None rows only
            if df_owned["ROWS"].notna().any():
                write_outputs(me, df_owned, "Direct tables in your schema (USER_TABLES).")
                return

        # 2) Try synonyms
        print("No owned tables found or not accessible; checking synonyms (PUBLIC + USER)...")
        df_syn = summarize_via_synonyms(conn, me)
        if not df_syn.empty and df_syn["ROWS"].notna().any():
            write_outputs("via_synonyms", df_syn, "Tables reached via synonyms you can SELECT.")
            return

        print("\nNo accessible tables found via USER_TABLES or synonyms.")
        print("Ask DBA which schema owns the GiftArchive tables, and/or to grant you SELECT on them.")
        print("If you also need table sizes, ask for SELECT_CATALOG_ROLE (access to ALL_SEGMENTS).")

    finally:
        try: conn.close()
        except: pass

if __name__ == "__main__":
    main()