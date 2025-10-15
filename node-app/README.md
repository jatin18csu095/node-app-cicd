#!/usr/bin/env python3
"""
Oracle Owner Probe + Summary (rows-only, no special grants)
- Connects to Oracle using the config below
- Probes which OWNER/schema has tables (tries USER, GIFTARC, GIFTARCHIVE)
- Prints table counts for each candidate
- Exports CSV/JSON summary for the first owner that returns tables
- Read-only; does not modify data

Requires: pip install oracledb pandas
"""

import time, json
import pandas as pd
import oracledb

# ------------------ CONFIG: EDIT THESE ------------------
HOST     = "p2ehowld8001"
PORT     = 1526
SERVICE  = "GIFTARC"     # service name from your screenshot
USER     = "x292151"
PASSWORD = "YOUR_PASSWORD"

# If you already know the exact owner, put it here to force only that:
FORCE_OWNER = None        # e.g. "GIFTARCHIVE" or "GIFTARC", else leave None
OUT_PREFIX  = "oracle_summary"
# -------------------------------------------------------


def connect():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    return oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)


def current_user(conn) -> str:
    with conn.cursor() as cur:
        cur.execute("SELECT USER FROM dual")
        return cur.fetchone()[0]


def fetch_rows_only(conn, owner_upper: str) -> pd.DataFrame:
    """
    Rows-only summary (no sizes) using ALL_TABLES.
    Works without access to ALL_SEGMENTS.
    """
    sql = """
    SELECT owner, table_name, num_rows, last_analyzed,
           CAST(NULL AS NUMBER) AS size_mb
    FROM ALL_TABLES
    WHERE owner = :owner
    ORDER BY table_name
    """
    with conn.cursor() as cur:
        cur.execute(sql, owner=owner_upper)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
    return pd.DataFrame(rows, columns=cols)


def summarize_to_files(df: pd.DataFrame, owner_label: str, mode_note: str):
    # standardize columns
    for c in ["OWNER","TABLE_NAME","NUM_ROWS","LAST_ANALYZED","SIZE_MB"]:
        if c not in df.columns: df[c] = pd.NA
    # for compatibility with your other scripts, add ROWS + source
    df["ROWS"] = df["NUM_ROWS"]
    df["ROWS_SOURCE"] = "STATS"  # from NUM_ROWS; exact counts not used in this probe

    total_tables = len(df)
    total_rows   = int(df["ROWS"].fillna(0).sum())

    print("\n=== OWNER SUMMARY ===")
    print(f"Owner         : {owner_label}")
    print(f"Tables        : {total_tables}")
    print(f"Total rows    : {total_rows:,}")
    print(f"Size mode     : rows-only (no segment access)\n")

    csv_path  = f"{OUT_PREFIX}_{owner_label}_stats_rows_only.csv"
    json_path = f"{OUT_PREFIX}_{owner_label}_stats_rows_only.json"

    # order columns
    out = df[["OWNER","TABLE_NAME","ROWS","ROWS_SOURCE","LAST_ANALYZED","SIZE_MB","NUM_ROWS"]]
    out.to_csv(csv_path, index=False)

    with open(json_path, "w") as f:
        json.dump({
            "generated_at": int(time.time()),
            "owner": owner_label,
            "row_mode": "stats",
            "size_mode": "rows_only",
            "table_count": total_tables,
            "total_rows": total_rows,
            "tables": out.fillna("").to_dict(orient="records"),
            "note": mode_note
        }, f, indent=2)

    print(f"Files written:\n  {csv_path}\n  {json_path}\n")


def main():
    conn = connect()
    try:
        me = current_user(conn).upper()
        print(f"Connected. Current user: {me}")

        # decide candidates
        if FORCE_OWNER:
            candidates = [FORCE_OWNER.upper()]
        else:
            candidates = [me, "GIFTARC", "GIFTARCHIVE"]
            # keep unique, preserve order
            seen, uniq = set(), []
            for c in candidates:
                if c not in seen:
                    seen.add(c); uniq.append(c)
            candidates = uniq

        print("\nProbing owners (rows-only):", ", ".join(candidates))

        first_with_tables = None
        last_error = None

        for owner in candidates:
            try:
                df = fetch_rows_only(conn, owner)
                count = len(df)
                print(f"  - {owner:<15} tables={count}")
                if count > 0 and first_with_tables is None:
                    first_with_tables = (owner, df)
            except oracledb.DatabaseError as e:
                # capture errors like ORA-00942/01031 silently; still report later
                last_error = str(e)
                print(f"  - {owner:<15} (query failed: {last_error.splitlines()[-1]})")

        if first_with_tables:
            owner, df = first_with_tables
            summarize_to_files(df, owner, "Rows-only probe (ALL_TABLES).")
        else:
            print("\nNo tables found under tested owners using ALL_TABLES.")
            print("Next steps:")
            print("  1) Verify the exact schema/owner name with DBA.")
            print("  2) If the data is in another schema, ensure your user has SELECT on that schema’s tables.")
            print("  3) If you also need sizes, request SELECT_CATALOG_ROLE (access to ALL_SEGMENTS).")
            if last_error:
                print("\nLast Oracle error seen:", last_error)

    finally:
        try: conn.close()
        except: pass


if __name__ == "__main__":
    main()