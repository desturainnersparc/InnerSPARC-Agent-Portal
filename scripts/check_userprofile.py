import sqlite3, json
con = sqlite3.connect('db.sqlite3')
cur = con.cursor()
cur.execute("PRAGMA table_info('app_userprofile')")
rows = cur.fetchall()
print(json.dumps(rows, indent=2))
con.close()
