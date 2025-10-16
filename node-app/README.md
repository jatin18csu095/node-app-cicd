#!/usr/bin/env python3
"""
STAGING schema summary (tables + rows + size + column data types)

- Summarizes tables in the STAGING schema (NUM_ROWS, LAST_ANALYZED, SIZE_MB/GB if permitted)
- Exports a full column schema with data types from ALL_TAB_COLUMNS
- JSON-safe (handles Oracle timestamps cleanly)
- Read-only; safe to run on client DB

Requirements:
  pip install oracledb pandas
"""

import time
import json
import pandas as pd
import oracledb

# ----------------- CONFIG: EDIT THESE -----------------
HOST       = "p2ehowld8001"
PORT       = 1526
SERVICE    = "GIFTARC"
USER       = "x292151"
PASSWORD   = "your_password_here"

OWNER      = "STAGING"             # target schema (UPPERCASE)
OUT_PREFIX = "staging_summary"     # file name prefix for exports
# ------------------------------------------------------


def connect():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    return oracledb.connect(user=USER, password=PASSWORD, dsn=dsn)


def fetch_alltables(conn, owner: str) -> pd.DataFrame:
    """
    Base metadata from ALL_TABLES.
    Returns: OWNER, TABLE_NAME, NUM_ROWS, LAST_ANALYZED
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
    Optional enrichment from ALL_SEGMENTS.
    If blocked by privileges, size columns remain empty.
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
            key = f"n{i}"
            binds[key] = name
            placeholders.append(f":{key}")

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


def fetch_columns(conn, owner: str) -> pd.DataFrame:
    """
    Column-level schema from ALL_TAB_COLUMNS.
    Returns:
      OWNER, TABLE_NAME, COLUMN_ID, COLUMN_NAME, DATA_TYPE, DATA_LENGTH,
      DATA_PRECISION, DATA_SCALE, NULLABLE, DATA_DEFAULT
    """
    sql = """
        SELECT
            owner,
            table_name,
            column_id,
            column_name,
            data_type,
            data_length,
            data_precision,
            data_scale,
            nullable,
            data_default
        FROM ALL_TAB_COLUMNS
        WHERE owner = :owner
        ORDER BY table_name, column_id
    """
    try:
        with conn.cursor() as cur:
            cur.execute(sql, owner=owner.upper())
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
        return pd.DataFrame(rows, columns=cols)
    except oracledb.DatabaseError:
        # If blocked, return an empty frame with expected columns
        cols = ["OWNER","TABLE_NAME","COLUMN_ID","COLUMN_NAME","DATA_TYPE",
                "DATA_LENGTH","DATA_PRECISION","DATA_SCALE","NULLABLE","DATA_DEFAULT"]
        return pd.DataFrame(columns=cols)


def json_safe(value):
    """Convert Timestamp/NaT and non-serializable pandas types to JSON-safe types."""
    if pd.isna(value):
        return None
    # datetime or pandas Timestamp
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    # plain types
    if isinstance(value, (float, int, str, bool)):
        return value
    return str(value)


def export_table_summary(owner: str, df: pd.DataFrame, ts: str):
    df = df.copy()
    # Normalize types for math/printing
    df["NUM_ROWS"] = pd.to_numeric(df["NUM_ROWS"], errors="coerce").fillna(0).astype(int)
    df["SIZE_MB"]  = pd.to_numeric(df["SIZE_MB"],  errors="coerce").fillna(0)
    df["SIZE_GB"]  = pd.to_numeric(df["SIZE_GB"],  errors="coerce").fillna(0)

    total_tables = len(df)
    total_rows   = int(df["NUM_ROWS"].sum())
    total_mb     = float(df["SIZE_MB"].sum())
    total_gb     = round(total_mb / 1024, 3) if total_mb else None

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
        size_str = f"{r['SIZE_MB']:.2f} MB" if r["SIZE_MB"] else "N/A"
        print(f"  {r['TABLE_NAME']:<40} rows={r['NUM_ROWS']:>10}  size={size_str}")

    # Export table summary
    csv_path  = f"{OUT_PREFIX}_{owner}_{ts}.csv"
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
                "OWNER":         json_safe(row["OWNER"]),
                "TABLE_NAME":    json_safe(row["TABLE_NAME"]),
                "NUM_ROWS":      json_safe(row["NUM_ROWS"]),
                "LAST_ANALYZED": json_safe(row["LAST_ANALYZED"]),
                "SIZE_MB":       json_safe(row["SIZE_MB"]),
                "SIZE_GB":       json_safe(row["SIZE_GB"]),
            }
            for _, row in df_out.iterrows()
        ],
    }
    with open(json_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"\nWrote table summary:\n  {csv_path}\n  {json_path}")


def export_column_schema(owner: str, df_cols: pd.DataFrame, ts: str):
    """
    Exports the column-level schema as CSV + JSON.
    If df_cols is empty (no access), prints a clear note.
    """
    if df_cols.empty:
        print("\nColumn schema not available (no access to ALL_TAB_COLUMNS).")
        return

    # Export columns CSV
    cols_csv  = f"{OUT_PREFIX}_{owner}_columns_{ts}.csv"
    cols_json = f"{OUT_PREFIX}_{owner}_columns_{ts}.json"

    df_cols.to_csv(cols_csv, index=False)

    # JSON-safe conversion
    records = []
    for _, row in df_cols.iterrows():
        records.append({
            "OWNER":          json_safe(row.get("OWNER")),
            "TABLE_NAME":     json_safe(row.get("TABLE_NAME")),
            "COLUMN_ID":      json_safe(row.get("COLUMN_ID")),
            "COLUMN_NAME":    json_safe(row.get("COLUMN_NAME")),
            "DATA_TYPE":      json_safe(row.get("DATA_TYPE")),
            "DATA_LENGTH":    json_safe(row.get("DATA_LENGTH")),
            "DATA_PRECISION": json_safe(row.get("DATA_PRECISION")),
            "DATA_SCALE":     json_safe(row.get("DATA_SCALE")),
            "NULLABLE":       json_safe(row.get("NULLABLE")),
            "DATA_DEFAULT":   json_safe(row.get("DATA_DEFAULT")),
        })

    with open(cols_json, "w") as f:
        json.dump({
            "generated_at": int(time.time()),
            "owner": owner,
            "column_count": len(records),
            "columns": records
        }, f, indent=2)

    print(f"Wrote column schema:\n  {cols_csv}\n  {cols_json}\n")


def main():
    print("Connecting to Oracle…")
    conn = connect()
    try:
        print(f"Connected as: {USER}")
        # Tables summary
        tables_df = fetch_alltables(conn, OWNER)
        if tables_df.empty:
            print(f"\nNo tables returned for schema '{OWNER}'. Check privileges or schema name.")
            return
        tables_df = try_add_sizes(conn, tables_df)

        ts = time.strftime("%Y%m%d_%H%M%S")
        export_table_summary(OWNER, tables_df, ts)

        # Column data types
        cols_df = fetch_columns(conn, OWNER)
        export_column_schema(OWNER, cols_df, ts)

    finally:
        try:
            conn.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()