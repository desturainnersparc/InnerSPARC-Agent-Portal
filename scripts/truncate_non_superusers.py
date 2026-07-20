import sqlite3
from pathlib import Path
import time

path = Path(__file__).resolve().parent.parent / 'db.sqlite3'
print('DB path:', path)
if not path.exists():
    raise FileNotFoundError(path)

for attempt in range(1, 6):
    try:
        conn = sqlite3.connect(path, timeout=30)
        conn.execute('PRAGMA foreign_keys = ON')
        conn.execute('PRAGMA busy_timeout = 30000')
        cur = conn.cursor()
        cur.execute('SELECT COUNT(*) FROM auth_user WHERE is_superuser=0')
        non_super = cur.fetchone()[0]
        print('Non-superuser count:', non_super)
        if non_super == 0:
            print('No non-superuser users to delete.')
            conn.close()
            break
        steps = [
            ('app_accountloginsecuritystate', 'DELETE FROM app_accountloginsecuritystate WHERE user_id IN (SELECT id FROM auth_user WHERE is_superuser=0)'),
            ('app_loginsecuritystate', 'DELETE FROM app_loginsecuritystate WHERE user_id IN (SELECT id FROM auth_user WHERE is_superuser=0)'),
            ('app_modulecompletion', 'DELETE FROM app_modulecompletion WHERE user_id IN (SELECT id FROM auth_user WHERE is_superuser=0)'),
            ('app_onboardingprofile', 'DELETE FROM app_onboardingprofile WHERE user_id IN (SELECT id FROM auth_user WHERE is_superuser=0)'),
            ('app_onboardingstepcompletion', 'DELETE FROM app_onboardingstepcompletion WHERE user_id IN (SELECT id FROM auth_user WHERE is_superuser=0)'),
            ('app_trainingcomment', 'DELETE FROM app_trainingcomment WHERE user_id IN (SELECT id FROM auth_user WHERE is_superuser=0)'),
            ('app_userprofile', 'DELETE FROM app_userprofile WHERE user_id IN (SELECT id FROM auth_user WHERE is_superuser=0)'),
            ('auth_user_groups', 'DELETE FROM auth_user_groups WHERE user_id IN (SELECT id FROM auth_user WHERE is_superuser=0)'),
            ('auth_user_user_permissions', 'DELETE FROM auth_user_user_permissions WHERE user_id IN (SELECT id FROM auth_user WHERE is_superuser=0)'),
            ('auth_user', 'DELETE FROM auth_user WHERE is_superuser=0'),
        ]
        for name, sql in steps:
            cur.execute(sql)
            print(f'Deleted from {name}:', cur.rowcount)
            conn.commit()
        cur.execute('SELECT COUNT(*) FROM auth_user')
        print('Remaining auth_user count:', cur.fetchone()[0])
        conn.close()
        break
    except sqlite3.OperationalError as exc:
        print('Attempt', attempt, 'locked:', exc)
        conn.close()
        if attempt == 5:
            raise
        time.sleep(2)
