#!/usr/bin/env python3
"""
Local Oracle -> Summary PoC
- Connects to Oracle Free in Docker
- Safely drops/creates demo tables (avoids ORA-00955)
- Inserts sample rows
- Gathers stats so NUM_ROWS is populated
- Prints a DB summary and writes oracle_db_summary.csv
"""

import oracledb
import pandas as pd

# ---- connection settings (match your Docker container) ----
HOST = "localhost"
PORT = 1521
SERVICE = "FREEPDB1"
USER = "APP"
PASS = "AppPassw0rd1!"

# ---------------- helpers ----------------
def safe_drop_table(cur, name: str):
    """Drop table if it exists (ignore ORA-00942)."""
    cur.execute(f"""
    BEGIN
      EXECUTE IMMEDIATE 'DROP TABLE {name} CASCADE CONSTRAINTS PURGE';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLCODE != -942 THEN RAISE; END IF; -- table or view does not exist
    END;""")

def safe_drop_view(cur, name: str):
    """Drop view if it exists (ignore ORA-00942)."""
    cur.execute(f"""
    BEGIN
      EXECUTE IMMEDIATE 'DROP VIEW {name}';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLCODE != -942 THEN RAISE; END IF;
    END;""")

def safe_drop_synonym(cur, name: str):
    """Drop synonym if it exists (ignore ORA-1434)."""
    cur.execute(f"""
    BEGIN
      EXECUTE IMMEDIATE 'DROP SYNONYM {name}';
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLCODE NOT IN (-1434, -01434) THEN RAISE; END IF; -- synonym does not exist
    END;""")

def gather_schema_stats(cur):
    cur.execute("""
    BEGIN
      DBMS_STATS.GATHER_SCHEMA_STATS(
        ownname => USER,
        estimate_percent => 5,
        method_opt => 'FOR ALL COLUMNS SIZE AUTO',
        no_invalidate => FALSE
      );
    END;""")

# ---------------- main ----------------
def main():
    dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
    conn = oracledb.connect(user=USER, password=PASS, dsn=dsn)
    cur = conn.cursor()
    print("✅ Connected to Oracle Free (Docker)\n")

    # Clean up anything that might already exist
    for obj in ("ORDERS", "CUSTOMERS"):
        safe_drop_view(cur, obj)
        safe_drop_synonym(cur, obj)
        safe_drop_table(cur, obj)
    conn.commit()

    # Re-create demo tables
    cur.execute("""
    CREATE TABLE customers (
      customer_id NUMBER PRIMARY KEY,
      name        VARCHAR2(100),
      email       VARCHAR2(200),
      created_at  DATE
    )""")

    cur.execute("""
    CREATE TABLE orders (
      order_id    NUMBER PRIMARY KEY,
      customer_id NUMBER REFERENCES customers(customer_id),
      amount      NUMBER(12,2),
      status      VARCHAR2(20),
      order_ts    DATE
    )""")

    # Insert sample data
    cur.executemany(
        "INSERT INTO customers VALUES (:1,:2,:3,SYSDATE)",
        [(i, f"Cust {i}", f"cust{i}@example.com") for i in range(1, 101)]
    )
    cur.executemany(
        "INSERT INTO orders VALUES (:1,:2,:3,:4,SYSDATE)",
        [(i, (i % 100) + 1, float((i % 50) + 1) * 10, "PAID") for i in range(1, 1001)]
    )
    conn.commit()

    # Gather stats so NUM_ROWS is populated
    gather_schema_stats(cur)
    conn.commit()

    # Summary (fast: uses NUM_ROWS from stats + table size)
    sql = """
    SELECT
      ut.table_name,
      ut.num_rows                         AS rows_est,
      TRUNC(ut.last_analyzed)             AS last_analyzed,
      ROUND(NVL(us.bytes,0)/1024/1024,2)  AS size_mb
    FROM   user_tables ut
    LEFT JOIN user_segments us
           ON us.segment_name = ut.table_name
          AND us.segment_type IN ('TABLE','TABLE PARTITION','TABLE SUBPARTITION')
    ORDER BY size_mb DESC NULLS LAST, ut.table_name
    """
    df = pd.read_sql(sql, conn)

    # Print summary
    print("=== LOCAL ORACLE SUMMARY ===")
    print(df.to_string(index=False))
    total_tables = len(df)
    total_rows_est = int(df["ROWS_EST"].fillna(0).sum())
    total_size_mb = round(df["SIZE_MB"].fillna(0).sum(), 2)
    print(f"\nTotal tables: {total_tables}")
    print(f"Total rows (est): {total_rows_est}")
    print(f"Total size (MB): {total_size_mb}")

    # Save CSV report
    out = "oracle_db_summary.csv"
    df.to_csv(out, index=False)
    print(f"\n✅ Summary saved as {out}")

    conn.close()

if __name__ == "__main__":
    main()