python - <<'PY'
import oracledb
dsn="p2ehowld8001:1526/GIFTARC"
conn=oracledb.connect(user="x292151", password="your_password", dsn=dsn)
cur=conn.cursor()
print("Current user:", conn.username)
print("\nSchemas that look like GIFT*:")
for (u,) in cur.execute("SELECT username FROM all_users WHERE username LIKE 'GIFT%' ORDER BY username"):
    print("  ", u)
conn.close()
PY