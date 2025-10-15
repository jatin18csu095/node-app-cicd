#!/usr/bin/env python3
"""
Oracle Schema Summary (owner-or-synonyms fallback)
--------------------------------------------------
• If OWNER_FILTER is set and that owner has tables, report those.
• If not, discover tables via PUBLIC/USER SYNONYMS and report the
  underlying targets (grouped across owners).
• Includes SIZE_MB/GB when dictionary access allows; otherwise rows/list only.
• Exports CSV + JSON.

Requires: pip install oracledb pandas
"""

import time, json
import pandas as pd
import oracledb

# ============== CONFIG ==============
HOST        = "p2ehowld8001"
PORT        = 1526
SERVICE     = "GIFTARC"
USER        = "x292151"
PASSWORD    = "your_password_here"

# If you want to *force* a schema first, put it here, e.g. "GIFTARC" / "GIFTARCHIVE".
# If that owner has no tables visible, the script automatically falls back to synonyms.
OWNER_FILTER = "GIFTARC"      # or None

ROW_MODE = "stats"            # "stats" uses NUM_ROWS; "exact" does COUNT(*) (slower)
OUT_PREFIX = "oracle_schema_summary"
# ====================================

SYSTEM_OWNERS = {
    "SYS","SYSTEM","XDB","MDSYS","CTXSYS","ORDSYS","DBSNMP","OUTLN","WMSYS","LBACSYS",
    "OLAPSYS","APPQOSSYS","ORDPLUGINS","SI_INFORMTN_SCHEMA","DVSYS","GSMADMIN_INTERNAL",
    "AUDSYS","OJVMSYS","REMOTE_SCHEDULER_AGENT","DVF","GGSYS","SYSBACKUP","SYSDG","SYSKM",
    "ANONYMOUS","PUBLIC"
}

def connect():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    return oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)

def try_owner_with_sizes(conn, owner):
    """Returns df and size_mode. Raises only on fatal connection issues."""
    sql = """
    SELECT
      t.owner,
      t.table_name,
      t.num_rows,
      t.last_analyzed,
      ROUND(NVL(SUM(s.bytes),0)/1024/1024, 2) AS size_mb
    FROM ALL_TABLES t
    LEFT JOIN ALL_SEGMENTS s
      ON s.owner = t.owner
     AND s.segment_name = t.table_name
     AND s.segment_type IN ('TABLE','TABLE PARTITION','TABLE SUBPARTITION')
    WHERE t.owner = :owner
    GROUP BY t.owner, t.table_name, t.num_rows, t.last_analyzed
    ORDER BY size_mb DESC NULLS LAST, t.table_name
    """
    try:
        cur = conn.cursor()
        cur.execute(sql, owner=owner)
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]
        df = pd.DataFrame(rows, columns=cols)
        if not df.empty:
            df["SIZE_GB"] = (pd.to_numeric(df["SIZE_MB"], errors="coerce").fillna(0) / 1024).round(3)
            return df, "sizes"
        # owner exists but no tables visible
        return pd.DataFrame(columns=["OWNER","TABLE_NAME","NUM_ROWS","LAST_ANALYZED","SIZE_MB","SIZE_GB"]), "sizes"
    except oracledb.DatabaseError:
        # no dictionary privilege -> caller will handle fallback
        return pd.DataFrame(columns=["OWNER","TABLE_NAME","NUM_ROWS","LAST_ANALYZED","SIZE_MB","SIZE_GB"]), "blocked"

def try_owner_rows_only(conn, owner):
    cur = conn.cursor()
    cur.execute("""
        SELECT owner, table_name, num_rows, last_analyzed
        FROM ALL_TABLES
        WHERE owner = :owner
        ORDER BY table_name
    """, owner=owner)
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    df = pd.DataFrame(rows, columns=cols)
    if df.empty:
        return df
    df["SIZE_MB"] = pd.NA
    df["SIZE_GB"] = pd.NA
    return df

def synonym_targets(conn):
    """All targets reachable via PUBLIC/USER synonyms. Returns OWNER,TABLE_NAME,SOURCE and target owner/table."""
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT owner, synonym_name, table_owner, table_name
            FROM ALL_SYNONYMS
            WHERE owner IN (USER, 'PUBLIC') AND table_owner IS NOT NULL
        """)
    except oracledb.DatabaseError:
        return pd.DataFrame(columns=["OWNER","NAME","TARGET_OWNER","TARGET_TABLE"])
    rows = cur.fetchall()
    df = pd.DataFrame(rows, columns=["SYN_OWNER","SYN_NAME","TARGET_OWNER","TARGET_TABLE"])
    df["SYN_OWNER"] = df["SYN_OWNER"].str.upper()
    df["TARGET_OWNER"] = df["TARGET_OWNER"].str.upper()
    # prefer USER over PUBLIC for duplicate targets
    df["_rank"] = (df["SYN_OWNER"] == "PUBLIC").astype(int)
    df.sort_values(["TARGET_OWNER","TARGET_TABLE","_rank"], inplace=True, kind="stable")
    df = df.drop_duplicates(subset=["TARGET_OWNER","TARGET_TABLE"], keep="first")
    # display columns
    out = pd.DataFrame({
        "OWNER": df["TARGET_OWNER"],
        "TABLE_NAME": df["TARGET_TABLE"],
        "SOURCE": "SYNONYM"
    })
    return out

def add_rows(conn, owner, df):
    """Add a ROWS column using stats or exact as configured."""
    if ROW_MODE.lower() == "exact":
        counts = []
        cur = conn.cursor()
        for _, r in df.iterrows():
            fq = f"\"{owner}\".\"{r['TABLE_NAME']}\""
            try:
                cur.execute(f"SELECT /*+ FULL(t) */ COUNT(*) FROM {fq} t")
                counts.append(cur.fetchone()[0])
            except Exception:
                counts.append(None)
        df["ROWS"] = counts
        df["ROWS_SOURCE"] = "EXACT"
    else:
        # join to ALL_TABLES to fetch NUM_ROWS; if blocked, leave as None
        try:
            names = tuple(df["TABLE_NAME"].tolist()) or ("",)
            placeholder = ", ".join([":n"+str(i) for i in range(len(df))])
            sql = f"SELECT table_name, num_rows FROM ALL_TABLES WHERE owner=:owner AND table_name IN ({placeholder})"
            params = {"owner": owner}
            for i, name in enumerate(df["TABLE_NAME"].tolist()):
                params["n"+str(i)] = name
            cur = conn.cursor()
            cur.execute(sql, params)
            map_rows = {t: r for (t, r) in cur.fetchall()}
            df["ROWS"] = [map_rows.get(t) for t in df["TABLE_NAME"]]
            df["ROWS_SOURCE"] = "STATS"
        except oracledb.DatabaseError:
            df["ROWS"] = None
            df["ROWS_SOURCE"] = "UNKNOWN"
    return df

def summarize_and_export(owner_label, size_mode, df):
    # consistent columns
    for c in ["OWNER","TABLE_NAME","ROWS","ROWS_SOURCE","LAST_ANALYZED","SIZE_MB","SIZE_GB","NUM_ROWS"]:
        if c not in df.columns: df[c] = pd.NA

    total_tables = len(df)
    total_rows = int(pd.to_numeric(df["ROWS"], errors="coerce").fillna(0).sum())
    total_mb = float(pd.to_numeric(df["SIZE_MB"], errors="coerce").fillna(0).sum())
    total_gb = round(total_mb/1024, 3) if size_mode == "sizes" else None

    print("\n===== ORACLE SUMMARY =====")
    print(f"Scope          : {owner_label}")
    print(f"Tables         : {total_tables}")
    print(f"Total rows     : {total_rows:,}")
    print(f"Size mode      : {'Sizes included' if size_mode=='sizes' else 'Rows-only (no size access)'}")
    if size_mode == "sizes":
        print(f"Total size MB  : {round(total_mb,2)}")
        print(f"Total size GB  : {total_gb}")
    print("==========================\n")

    # top view
    df_show = df.copy()
    df_show["SIZE_MB_NUM"] = pd.to_numeric(df_show["SIZE_MB"], errors="coerce").fillna(0)
    if size_mode == "sizes":
        df_show = df_show.sort_values("SIZE_MB_NUM", ascending=False)
    else:
        df_show = df_show.sort_values(["OWNER","TABLE_NAME"])
    for _, r in df_show.head(10).iterrows():
        size_s = f"{r['SIZE_MB']} MB" if size_mode == "sizes" else "N/A"
        print(f"  {r['OWNER']}.{r['TABLE_NAME']:<35} rows={str(r['ROWS']):>10} size={size_s}")

    # export
    out = df[["OWNER","TABLE_NAME","ROWS","ROWS_SOURCE","LAST_ANALYZED","SIZE_MB","SIZE_GB","NUM_ROWS"]]
    ts = time.strftime("%Y%m%d_%H%M%S")
    csv_path = f"{OUT_PREFIX}_{owner_label}_{size_mode}_{ROW_MODE.lower()}_{ts}.csv"
    json_path = f"{OUT_PREFIX}_{owner_label}_{size_mode}_{ROW_MODE.lower()}_{ts}.json"
    out.to_csv(csv_path, index=False)
    with open(json_path, "w") as f:
        json.dump({
            "generated_at": int(time.time()),
            "scope": owner_label,
            "row_mode": ROW_MODE.lower(),
            "size_mode": size_mode,
            "table_count": total_tables,
            "total_rows": total_rows,
            "total_size_mb": round(total_mb,2) if size_mode=="sizes" else None,
            "total_size_gb": total_gb if size_mode=="sizes" else None,
            "tables": out.fillna("").to_dict(orient="records")
        }, f, indent=2)
    print(f"\nWrote:\n  {csv_path}\n  {json_path}\n")

def main():
    conn = connect()
    try:
        print(f"Connected as: {USER}")

        # 1) Try a forced owner first (if provided)
        if OWNER_FILTER:
            owner = OWNER_FILTER.upper()
            print(f"\nTrying forced owner: {owner}")
            df, size_mode = try_owner_with_sizes(conn, owner)
            if df.empty:
                # either no tables or no access; try rows-only
                df = try_owner_rows_only(conn, owner)
                if not df.empty:
                    df["SIZE_MB"], df["SIZE_GB"] = pd.NA, pd.NA
                    df = add_rows(conn, owner, df)
                    summarize_and_export(owner, "empty", df)
                    return
                else:
                    print(f"[Info] No tables visible under owner '{owner}'. Will use synonyms fallback.")

            else:
                df = add_rows(conn, owner, df)
                summarize_and_export(owner, size_mode, df)
                return

        # 2) Synonyms fallback: gather all reachable targets across owners
        print("\nUsing synonyms fallback (PUBLIC/USER)...")
        df_syn = synonym_targets(conn)
        if df_syn.empty:
            print("No synonym targets found. Ask DBA which schema owns the app tables and/or grant SELECT on them.")
            return

        # For each target owner, try to augment with sizes; otherwise just rows
        results = []
        for owner in sorted(df_syn["OWNER"].unique()):
            if owner in SYSTEM_OWNERS:
                continue
            subset = df_syn[df_syn["OWNER"] == owner][["OWNER","TABLE_NAME"]].copy().reset_index(drop=True)

            # try sizes for this owner
            df_owner_sizes, mode = try_owner_with_sizes(conn, owner)
            if not df_owner_sizes.empty:
                # keep only tables that are reachable via synonyms
                tables = set(subset["TABLE_NAME"])
                df_owner_sizes = df_owner_sizes[df_owner_sizes["TABLE_NAME"].isin(tables)].copy()
                df_owner_sizes = add_rows(conn, owner, df_owner_sizes)
                df_owner_sizes["SOURCE"] = "SYNONYM->OWNER"
                results.append(("sizes", owner, df_owner_sizes))
                continue

            # rows-only path using ALL_TABLES
            df_owner_rows = try_owner_rows_only(conn, owner)
            if not df_owner_rows.empty:
                df_owner_rows = df_owner_rows[df_owner_rows["TABLE_NAME"].isin(set(subset["TABLE_NAME"]))].copy()
                df_owner_rows["SIZE_MB"], df_owner_rows["SIZE_GB"] = pd.NA, pd.NA
                df_owner_rows = add_rows(conn, owner, df_owner_rows)
                df_owner_rows["SOURCE"] = "SYNONYM->OWNER"
                results.append(("empty", owner, df_owner_rows))
                continue

            # if even ALL_TABLES is blocked, just list names (no rows/sizes)
            subset["NUM_ROWS"] = pd.NA
            subset["LAST_ANALYZED"] = pd.NA
            subset["SIZE_MB"] = pd.NA
            subset["SIZE_GB"] = pd.NA
            subset["ROWS"] = pd.NA
            subset["ROWS_SOURCE"] = "UNKNOWN"
            subset["SOURCE"] = "SYNONYM"
            results.append(("names_only", owner, subset))

        # merge all owners into one big report
        if not results:
            print("Synonyms discovered, but none resolvable to owners with visible metadata.")
            return

        all_frames = [r[2] for r in results]
        df_all = pd.concat(all_frames, ignore_index=True)
        size_mode_final = "sizes" if any(r[0]=="sizes" for r in results) else ("empty" if any(r[0]=="empty" for r in results) else "names_only")
        summarize_and_export("SYNONYM_TARGETS", size_mode_final, df_all)

    finally:
        try: conn.close()
        except: pass

if __name__ == "__main__":
    main()