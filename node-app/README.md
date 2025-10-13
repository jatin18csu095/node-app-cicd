#!/usr/bin/env python3
import oracledb, pandas as pd

HOST = "localhost"
PORT = 1521
SERVICE = "FREEPDB1"
USER = "APP"
PASS = "AppPassw0rd1!"

dsn = oracledb.makedsn(HOST, PORT, service_name=SERVICE)
conn = oracledb.connect(user=USER, password=PASS, dsn=dsn, encoding="UTF-8")
cur = conn.cursor()
print("✅ Connected to Oracle Free (Docker)\n")

# Drop/create demo tables
cur.execute("BEGIN EXECUTE IMMEDIATE 'DROP TABLE customers'; EXCEPTION WHEN OTHERS THEN NULL; END;")
cur.execute("BEGIN EXECUTE IMMEDIATE 'DROP TABLE orders';    EXCEPTION WHEN OTHERS THEN NULL; END;")

cur.execute("""
CREATE TABLE customers (
  customer_id NUMBER PRIMARY KEY,
  name        VARCHAR2(100),
  email       VARCHAR2(200),
  created_at  DATE
)
""")

cur.execute("""
CREATE TABLE orders (
  order_id    NUMBER PRIMARY KEY,
  customer_id NUMBER REFERENCES customers(customer_id),
  amount      NUMBER(12,2),
  status      VARCHAR2(20),
  order_ts    DATE
)
""")

# Insert sample data
cur.executemany("INSERT INTO customers VALUES (:1,:2,:3,SYSDATE)",
                [(i, f'Cust {i}', f'cust{i}@example.com') for i in range(1, 101)])
cur.executemany("INSERT INTO orders VALUES (:1,:2,:3,:4,SYSDATE)",
                [(i, (i % 100) + 1, float((i % 50) + 1)*10, 'PAID') for i in range(1, 1001)])
conn.commit()

# Gather stats so NUM_ROWS is populated
cur.execute("""
BEGIN
  DBMS_STATS.GATHER_SCHEMA_STATS(
    ownname => USER,
    estimate_percent => 5,
    method_opt => 'FOR ALL COLUMNS SIZE AUTO'
  );
END;""")
conn.commit()

# Query table summary
sql = """
SELECT
  ut.table_name,
  ut.num_rows AS rows_est,
  TRUNC(ut.last_analyzed) AS last_analyzed,
  ROUND(NVL(us.bytes,0)/1024/1024,2) AS size_mb
FROM user_tables ut
LEFT JOIN user_segments us
  ON us.segment_name = ut.table_name
ORDER BY size_mb DESC NULLS LAST
"""
df = pd.read_sql(sql, conn)

print("=== LOCAL ORACLE SUMMARY ===")
print(df)
print(f"\nTotal tables: {len(df)}")
print(f"Total rows (est): {int(df['ROWS_EST'].fillna(0).sum())}")
print(f"Total size (MB): {round(df['SIZE_MB'].fillna(0).sum(),2)}")

df.to_csv("oracle_db_summary.csv", index=False)
print("\n✅ Summary saved as oracle_db_summary.csv")

conn.close()