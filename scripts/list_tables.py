import sqlite3
import json

conn = sqlite3.connect('db.sqlite3')
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
rows = [r[0] for r in cur.fetchall()]
print(json.dumps(rows, indent=2))
p