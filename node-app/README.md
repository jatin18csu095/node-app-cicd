#!/usr/bin/env python3
"""
STAGING schema summary (robust, read-only)

- Summarizes tables in the STAGING schema only
- Always returns table list + NUM_ROWS (from ALL_TABLES) if permitted
- Adds SIZE_MB / SIZE_GB (from ALL_SEGMENTS) when permitted
- Prints a concise console summary and exports CSV + JSON
"""

import time
import json
import pandas as pd
import oracledb

# ----------------- CONFIG: EDIT THESE -----------------
HOST      = "p2ehowld8001"
PORT      = 1526
SERVICE   = "GIFTARC"
USER      = "x292151"
PASSWORD  = "your_password_here"

OWNER     = "STAGING"           # <-- target schema
OUT_PREFIX = "staging_summary"  # file name prefix for exports
# ------------------------------------------------------


def connect():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    return oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)


def fetch_alltables(conn, owner: str) -> pd.DataFrame:
    """
    Base metadata from ALL_TABLES.
    Columns returned: OWNER, TABLE_NAME, NUM_ROWS, LAST_ANALYZED
    """
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
    """
    Optional enrichment from ALL_SEGMENTS. If blocked by privileges,
    just return df with empty SIZE_* columns.
    """
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
        df["SIZE_GB"] = (pd.to_numeric(df["SIZE_MB"], errors="coerce")
                         .fillna(0) / 1024).round(3)
    except oracledb.DatabaseError:
        # No dictionary privilege -> leave sizes empty
        pass

    return df


def summarize_and_export(owner: str, df: pd.DataFrame):
    # Normalize + safe totals
    if "NUM_ROWS" not in df.columns:
        df["NUM_ROWS"] = pd.NA
    if "SIZE_MB" not in df.columns:
        df["SIZE_MB"] = pd.NA
    if "SIZE_GB" not in df.columns:
        df["SIZE_GB"] = pd.NA

    total_tables = len(df)
    total_rows = int(pd.to_numeric(df["NUM_ROWS"], errors="coerce").fillna(0).sum())
    total_mb = float(pd.to_numeric(df["SIZE_MB"], errors="coerce").fillna(0).sum())
    total_gb = round(total_mb / 1024, 3) if total_mb else None

    print("\n===== STAGING SCHEMA SUMMARY =====")
    print(f"Schema / Owner   : {owner}")
    print(f"Total Tables     : {total_tables}")
    print(f"Total Rows       : {total_rows:,}")
    if total_gb is not None:
        print(f"Total Size (MB)  : {round(total_mb, 2)}")
        print(f"Total Size (GB)  : {total_gb}")
    else:
        print("Total Size       : N/A (size view not permitted)")
    print("==================================\n")

    # Top 10 largest by size (or by name if size not available)
    show = df.copy()
    show["SIZE_MB_NUM"] = pd.to_numeric(show["SIZE_MB"], errors="coerce").fillna(0)
    if show["SIZE_MB_NUM"].sum() > 0:
        show = show.sort_values("SIZE_MB_NUM", ascending=False)
        print("Top 10 tables by size:")
    else:
        show = show.sort_values("TABLE_NAME")
        print("First 10 tables (size not available):")
    for _, r in show.head(10).iterrows():
        size_str = f"{r['SIZE_MB']} MB" if pd.notna(r["SIZE_MB"]) else "N/A"
        rows_str = str(int(r["NUM_ROWS"])) if pd.notna(r["NUM_ROWS"]) else "N/A"
        print(f"  {r['TABLE_NAME']:<40} rows={rows_str:>10}  size={size_str}")

    # Export CSV + JSON
    out = df[["OWNER","TABLE_NAME","NUM_ROWS","LAST_ANALYZED","SIZE_MB","SIZE_GB"]]
    ts = time.strftime("%Y%m%d_%H%M%S")
    csv_path = f"{OUT_PREFIX}_{owner}_{ts}.csv"
    json_path = f"{OUT_PREFIX}_{owner}_{ts}.json"

    out.to_csv(csv_path, index=False)
    with open(json_path, "w") as f:
        json.dump({
            "generated_at": int(time.time()),
            "owner": owner,
            "table_count": total_tables,
            "total_rows": total_rows,
            "total_size_mb": round(total_mb, 2) if total_mb else None,
            "total_size_gb": total_gb,
            "tables": out.fillna("").to_dict(orient="records")
        }, f, indent=2)

    print(f"\n✅ Wrote:\n  {csv_path}\n  {json_path}\n")


def main():
    print("Connecting to Oracle…")
    conn = connect()
    try:
        print(f"Connected as: {USER}")
        df = fetch_alltables(conn, OWNER)
        if df.empty:
            print(f"\n⚠️  No tables returned for schema '{OWNER}'.")
            print("   - Double-check the schema name (uppercase).")
            print("   - Ensure your user can read ALL_TABLES for that schema.")
            return

        df = try_add_sizes(conn, df)
        summarize_and_export(OWNER, df)

    finally:
        try: conn.close()
        except: pass


if __name__ == "__main__":
    main()