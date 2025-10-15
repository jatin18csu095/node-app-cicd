#!/usr/bin/env python3
"""
Oracle Schema Summary (Synonyms Only, Quiet & Robust)
- Uses USER + PUBLIC synonyms you can see
- Resolves target owner/table
- Tries to add NUM_ROWS (stats) and SIZE_MB/GB when permitted
- Never crashes: all enrichments are optional
- Exports CSV + JSON and prints a concise summary
"""

import time, json
import pandas as pd
import oracledb

# ------------ CONFIG: EDIT ------------
HOST      = "p2ehowld8001"
PORT      = 1526
SERVICE   = "GIFTARC"
USER      = "x292151"
PASSWORD  = "your_password_here"

OUT_PREFIX = "oracle_summary_synonyms"
# --------------------------------------


def connect():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    return oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)


def fetch_synonym_targets(conn) -> pd.DataFrame:
    """Return distinct targets reachable via USER/PUBLIC synonyms."""
    sql = """
        SELECT owner, synonym_name, table_owner, table_name
        FROM ALL_SYNONYMS
        WHERE owner IN (USER, 'PUBLIC') AND table_owner IS NOT NULL
    """
    cur = conn.cursor()
    cur.execute(sql)
    rows = cur.fetchall()
    df = pd.DataFrame(rows, columns=["SYN_OWNER","SYN_NAME","OWNER","TABLE_NAME"])
    # prefer USER over PUBLIC when duplicates
    df["_rank"] = (df["SYN_OWNER"] == "PUBLIC").astype(int)
    df = df.sort_values(["OWNER","TABLE_NAME","_rank"]).drop_duplicates(["OWNER","TABLE_NAME"]).drop(columns="_rank")
    df = df.reset_index(drop=True)
    return df[["OWNER","TABLE_NAME","SYN_OWNER","SYN_NAME"]]


def try_add_num_rows(conn, df: pd.DataFrame) -> pd.DataFrame:
    """Optional: add NUM_ROWS from ALL_TABLES if permitted."""
    df["NUM_ROWS"] = pd.NA
    try:
        cur = conn.cursor()
        for owner in sorted(df["OWNER"].unique()):
            names = df.loc[df["OWNER"] == owner, "TABLE_NAME"].unique().tolist()
            if not names: 
                continue
            binds = {"owner": owner}
            ph = []
            for i, name in enumerate(names):
                k = f"n{i}"
                binds[k] = name
                ph.append(f":{k}")
            cur.execute(f"""
                SELECT table_name, num_rows
                FROM ALL_TABLES
                WHERE owner=:owner AND table_name IN ({", ".join(ph)})
            """, binds)
            m = {t: r for t, r in cur.fetchall()}
            mask = df["OWNER"] == owner
            df.loc[mask, "NUM_ROWS"] = df.loc[mask, "TABLE_NAME"].map(m)
        return df
    except oracledb.DatabaseError:
        # no privilege -> leave NUM_ROWS empty
        return df


def try_add_sizes(conn, df: pd.DataFrame) -> pd.DataFrame:
    """Optional: add SIZE_MB/GB from ALL_SEGMENTS if permitted."""
    df["SIZE_MB"], df["SIZE_GB"] = pd.NA, pd.NA
    try:
        cur = conn.cursor()
        for owner in sorted(df["OWNER"].unique()):
            names = df.loc[df["OWNER"] == owner, "TABLE_NAME"].unique().tolist()
            if not names:
                continue
            binds = {"owner": owner}
            ph = []
            for i, name in enumerate(names):
                k = f"n{i}"
                binds[k] = name
                ph.append(f":{k}")
            cur.execute(f"""
                SELECT segment_name, ROUND(SUM(bytes)/1024/1024, 2) AS size_mb
                FROM ALL_SEGMENTS
                WHERE owner=:owner
                  AND segment_type IN ('TABLE','TABLE PARTITION','TABLE SUBPARTITION')
                  AND segment_name IN ({", ".join(ph)})
                GROUP BY segment_name
            """, binds)
            m = {t: float(s) for t, s in cur.fetchall()}
            mask = df["OWNER"] == owner
            df.loc[mask, "SIZE_MB"] = df.loc[mask, "TABLE_NAME"].map(m)
        df["SIZE_GB"] = (pd.to_numeric(df["SIZE_MB"], errors="coerce").fillna(0) / 1024).round(3)
        return df
    except oracledb.DatabaseError:
        # no privilege -> leave sizes empty
        return df


def main():
    print("Connecting…")
    conn = connect()
    try:
        print(f"Connected as {USER}")

        # 1) Synonym-driven discovery
        df = fetch_synonym_targets(conn)
        if df.empty:
            print("No USER/PUBLIC synonyms found for this account.")
            return

        # 2) Optional enrichments (quietly skip if blocked)
        df = try_add_num_rows(conn, df)
        df = try_add_sizes(conn, df)

        # 3) Summary
        total_targets = len(df)
        owners = df["OWNER"].nunique()
        total_mb = float(pd.to_numeric(df["SIZE_MB"], errors="coerce").fillna(0).sum())
        total_gb = round(total_mb/1024, 3) if total_mb else None

        print("\n=== SYNONYM SUMMARY ===")
        print(f"Distinct target owners : {owners}")
        print(f"Objects via synonyms   : {total_targets}")
        if total_gb is not None:
            print(f"Approx total size      : {round(total_mb,2)} MB  /  {total_gb} GB")
        else:
            print("Approx total size      : N/A (size view not accessible)")
        print("\nTop owners by object count:")
        top = df.groupby("OWNER").size().sort_values(ascending=False).head(10)
        for owner, cnt in top.items():
            print(f"  {owner:<25} {cnt:>8}")

        # 4) Export
        ts = time.strftime("%Y%m%d_%H%M%S")
        detail_cols = ["OWNER","TABLE_NAME","SYN_OWNER","SYN_NAME","NUM_ROWS","SIZE_MB","SIZE_GB"]
        for c in detail_cols:
            if c not in df.columns:
                df[c] = pd.NA
        csv_path  = f"{OUT_PREFIX}_detail_{ts}.csv"
        json_path = f"{OUT_PREFIX}_detail_{ts}.json"
        df[detail_cols].to_csv(csv_path, index=False)
        with open(json_path, "w") as f:
            json.dump({
                "generated_at": int(time.time()),
                "user": USER,
                "object_count": int(total_targets),
                "owner_count": int(owners),
                "total_size_mb": round(total_mb,2) if total_mb else None,
                "total_size_gb": total_gb,
                "objects": df[detail_cols].fillna("").to_dict(orient="records")
            }, f, indent=2)
        print(f"\nWrote:\n  {csv_path}\n  {json_path}\n")

    finally:
        try: conn.close()
        except: pass


if __name__ == "__main__":
    main()