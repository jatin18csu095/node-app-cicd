$code = @'
import oracledb

DSN = "p2ehowld8001:1526/GIFTARC"
USER = "x292151"
PASS = "your_password_here"

conn = oracledb.connect(user=USER, password=PASS, dsn=DSN)
print("Connected. Current user:", conn.username)

cur = conn.cursor()

# 1) What owners do we see in ALL_TABLES? (fast & usually permitted)
owners = []
try:
    for row in cur.execute("SELECT DISTINCT owner FROM all_tables ORDER BY owner"):
        owners.append(row[0])
    print("\nOwners visible in ALL_TABLES (first 20):", owners[:20])
except Exception as e:
    print("\n[Info] Could not read ALL_TABLES owners:", e)

# 2) Any schemas that look like GIFT*?
try:
    print("\nSchemas like GIFT%:")
    for (u,) in cur.execute("SELECT username FROM all_users WHERE username LIKE 'GIFT%' ORDER BY username"):
        print("  ", u)
except Exception as e:
    print("\n[Info] Could not read ALL_USERS:", e)

# 3) Sample table counts per owner (top 10 by table count)
try:
    print("\nTop owners by table count (up to 10):")
    for owner, cnt in cur.execute("""
        SELECT owner, COUNT(*) AS c
        FROM all_tables
        GROUP BY owner
        ORDER BY c DESC FETCH FIRST 10 ROWS ONLY
    """):
        print(f"  {owner:30} {cnt}")
except Exception as e:
    print("\n[Info] Could not aggregate ALL_TABLES:", e)

conn.close()
'@

python -c $code