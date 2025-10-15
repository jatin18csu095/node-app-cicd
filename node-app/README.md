#!/usr/bin/env python3
"""
Synonym-driven Oracle Summary (works with limited privileges)
-------------------------------------------------------------
- Lists USER + PUBLIC synonyms visible to the current user
- Resolves target owner/table (the real objects behind synonyms)
- Optionally adds object_type (ALL_OBJECTS) and size (ALL_SEGMENTS) when permitted
- Exports CSV + JSON; prints a compact console summary
- Read-only; no DML/DDL

Requires:
  pip install oracledb pandas
"""

import oracledb
import pandas as pd
import json
import time

# ---------------- CONFIG ----------------
HOST      = "p2ehowld8001"
PORT      = 1526
SERVICE   = "GIFTARC"
USER      = "x292151"
PASSWORD  = "your_password_here"

OUT_PREFIX = "oracle_synonym_summary"

# Set to True to try to fetch object type from ALL_OBJECTS (often allowed)
ENRICH_OBJECT_TYPE = True

# Set to True to try to fetch table sizes from ALL_SEGMENTS (often blocked)
ENRICH_TABLE_SIZE  = True

# No row counting by default (safe/fast). If you later want exact counts,
# set COUNT_MODE to "exact" (will run COUNT(*) per table; can be slow).
COUNT_MODE = "none"   # "none" or "exact"
# ----------------------------------------


def connect():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    return oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)


def current_user(conn) -> str:
    with conn.cursor() as cur:
        cur.execute("SELECT USER FROM dual")
        return cur.fetchone()[0]


def fetch_synonyms(conn) -> pd.DataFrame:
    """
    Return visible USER + PUBLIC synonyms with target resolution.
    Columns: SYN_OWNER, SYNONYM_NAME, TARGET_OWNER, TARGET_NAME
    """
    sql = """
        SELECT owner, synonym_name, table_owner, table_name
        FROM ALL_SYNONYMS
        WHERE owner IN (USER, 'PUBLIC') AND table_owner IS NOT NULL
    """
    with conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()

    df = pd.DataFrame(rows, columns=["SYN_OWNER", "SYNONYM_NAME", "TARGET_OWNER", "TARGET_NAME"])
    # Normalize to uppercase strings
    for c in df.columns:
        df[c] = df[c].astype(str).str.upper()

    # Prefer USER synonyms over PUBLIC when both point to same target
    df["_rank"] = (df["SYN_OWNER"] == "PUBLIC").astype(int)  # USER=0, PUBLIC=1
    df.sort_values(["TARGET_OWNER", "TARGET_NAME", "_rank", "SYN_OWNER", "SYNONYM_NAME"],
                   inplace=True, kind="stable")
    df = df.drop_duplicates(subset=["TARGET_OWNER", "TARGET_NAME"], keep="first")
    df.drop(columns=["_rank"], inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df


def enrich_object_type(conn, df: pd.DataFrame) -> pd.DataFrame:
    """
    Add OBJECT_TYPE from ALL_OBJECTS where possible.
    If blocked, return df unchanged.
    """
    try:
        # Build an IN-list safely: query by owner, then name
        owners = sorted(df["TARGET_OWNER"].unique())
        out = []
        with conn.cursor() as cur:
            for owner in owners:
                names = df.loc[df["TARGET_OWNER"] == owner, "TARGET_NAME"].unique().tolist()
                if not names:
                    continue
                # Use a temporary table approach avoided; instead run batched IN clause
                # Build bind params :n0, :n1, ...
                bind_map = {"owner": owner}
                placeholders = []
                for i, name in enumerate(names):
                    key = f"n{i}"
                    bind_map[key] = name
                    placeholders.append(f":{key}")
                sql = f"""
                    SELECT owner, object_name, object_type
                    FROM ALL_OBJECTS
                    WHERE owner = :owner AND object_name IN ({", ".join(placeholders)})
                """
                cur.execute(sql, bind_map)
                out.extend(cur.fetchall())
        if not out:
            return df
        type_map = {(r[0], r[1]): r[2] for r in out}  # (owner,name) -> type
        df["OBJECT_TYPE"] = [type_map.get((o, n)) for o, n in zip(df["TARGET_OWNER"], df["TARGET_NAME"])]
        return df
    except Exception:
        # No privilege or blocked view
        return df


def enrich_table_sizes(conn, df: pd.DataFrame) -> pd.DataFrame:
    """
    Add SIZE_MB and SIZE_GB using ALL_SEGMENTS for table-like segments.
    If blocked, returns df unchanged with empty size columns.
    """
    df["SIZE_MB"] = pd.NA
    df["SIZE_GB"] = pd.NA
    try:
        owners = sorted(df["TARGET_OWNER"].unique())
        with conn.cursor() as cur:
            for owner in owners:
                names = df.loc[df["TARGET_OWNER"] == owner, "TARGET_NAME"].unique().tolist()
                if not names:
                    continue
                bind_map = {"owner": owner}
                placeholders = []
                for i, name in enumerate(names):
                    key = f"n{i}"
                    bind_map[key] = name
                    placeholders.append(f":{key}")
                sql = f"""
                    SELECT segment_name, ROUND(SUM(bytes)/1024/1024, 2) AS size_mb
                    FROM ALL_SEGMENTS
                    WHERE owner = :owner
                      AND segment_type IN ('TABLE','TABLE PARTITION','TABLE SUBPARTITION')
                      AND segment_name IN ({", ".join(placeholders)})
                    GROUP BY segment_name
                """
                cur.execute(sql, bind_map)
                size_rows = cur.fetchall()
                size_map = {r[0]: float(r[1]) for r in size_rows}
                mask = df["TARGET_OWNER"] == owner
                df.loc[mask, "SIZE_MB"] = df.loc[mask, "TARGET_NAME"].map(size_map)
        df["SIZE_GB"] = (pd.to_numeric(df["SIZE_MB"], errors="coerce").fillna(0) / 1024).round(3)
        return df
    except Exception:
        # No dictionary privilege; leave sizes empty
        return df


def add_counts_exact(conn, df: pd.DataFrame) -> pd.DataFrame:
    """Optional exact row counts via COUNT(*) with quoted owner.table."""
    rows = []
    with conn.cursor() as cur:
        for _, r in df.iterrows():
            owner = r["TARGET_OWNER"]
            name  = r["TARGET_NAME"]
            fq = f"\"{owner}\".\"{name}\""
            try:
                cur.execute(f"SELECT /*+ FULL(t) */ COUNT(*) FROM {fq} t")
                rows.append(cur.fetchone()[0])
            except Exception:
                rows.append(None)
    df["ROWS"] = rows
    df["ROWS_SOURCE"] = "EXACT"
    return df


def main():
    print("Connecting to Oracle...")
    conn = connect()
    try:
        me = current_user(conn)
        print(f"Connected as: {me}")

        print("\nDiscovering synonyms (USER + PUBLIC)...")
        df = fetch_synonyms(conn)
        total_syn = len(df)
        unique_owners = sorted(df["TARGET_OWNER"].unique().tolist())
        print(f"Found {total_syn} unique target objects reachable via synonyms.")
        print(f"Target owners discovered: {', '.join(unique_owners[:10])}{'...' if len(unique_owners)>10 else ''}")

        # Optional enrichments
        if ENRICH_OBJECT_TYPE:
            df = enrich_object_type(conn, df)
        if ENRICH_TABLE_SIZE:
            df = enrich_table_sizes(conn, df)

        if COUNT_MODE.lower() == "exact":
            print("Counting rows with COUNT(*) (this may take time)...")
            df = add_counts_exact(conn, df)
        else:
            df["ROWS"] = pd.NA
            df["ROWS_SOURCE"] = "NONE"

        # Console summary
        per_owner = df.groupby("TARGET_OWNER").size().reset_index(name="OBJECT_COUNT")
        per_owner = per_owner.sort_values("OBJECT_COUNT", ascending=False)
        total_objects = int(per_owner["OBJECT_COUNT"].sum())

        total_mb = float(pd.to_numeric(df["SIZE_MB"], errors="coerce").fillna(0).sum())
        total_gb = round(total_mb/1024, 3) if total_mb else None

        print("\n=== SYNONYM-DRIVEN SUMMARY ===")
        print(f"Total reachable objects (via synonyms): {total_objects}")
        print(f"Distinct target owners: {len(per_owner)}")
        if total_gb is not None:
            print(f"Approx total table storage (MB/GB): {round(total_mb,2)} MB  /  {total_gb} GB")
        else:
            print("Approx total table storage: N/A (size view not permitted or targets not tables)")
        print("\nTop owners by object count:")
        for _, r in per_owner.head(10).iterrows():
            print(f"  {r['TARGET_OWNER']:<25} {int(r['OBJECT_COUNT']):>8}")

        # Save outputs
        ts = time.strftime("%Y%m%d_%H%M%S")
        detail_cols = ["SYN_OWNER","SYNONYM_NAME","TARGET_OWNER","TARGET_NAME",
                       "OBJECT_TYPE","SIZE_MB","SIZE_GB","ROWS","ROWS_SOURCE"]
        for c in detail_cols:
            if c not in df.columns:
                df[c] = pd.NA
        detail = df[detail_cols]

        csv_path  = f"{OUT_PREFIX}_detail_{ts}.csv"
        json_path = f"{OUT_PREFIX}_detail_{ts}.json"
        detail.to_csv(csv_path, index=False)
        with open(json_path, "w") as f:
            json.dump({
                "generated_at": int(time.time()),
                "user": me,
                "synonym_count": total_syn,
                "object_count": total_objects,
                "target_owners": per_owner.to_dict(orient="records"),
                "size_total_mb": round(total_mb,2) if total_mb else None,
                "size_total_gb": total_gb,
                "objects": detail.fillna("").to_dict(orient="records")
            }, f, indent=2)

        print(f"\nWrote:\n  {csv_path}\n  {json_path}\n")

    finally:
        try:
            conn.close()
        except:
            pass


if __name__ == "__main__":
    main()