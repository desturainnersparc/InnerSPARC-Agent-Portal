import sqlite3
import json

for path in ('db.sqlite3', 'innersparc/db.sqlite3'):
    try:
        conn = sqlite3.connect(path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        rows = [r[0] for r in cur.fetchall()]
        print(f"Tables in {path}:")
        print(json.dumps(rows, indent=2))
    except Exception as e:
        print(f"Error connecting to {path}: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass
