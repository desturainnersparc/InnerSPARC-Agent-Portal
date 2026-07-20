import sqlite3

def has_column(cur, table, column):
    cur.execute(f"PRAGMA table_info('{table}')")
    return any(r[1]==column for r in cur.fetchall())

con = sqlite3.connect('db.sqlite3')
cur = con.cursor()
try:
    # app_userprofile.admin_role
    if not has_column(cur, 'app_userprofile', 'admin_role'):
        print('Adding admin_role to app_userprofile')
        cur.execute("ALTER TABLE app_userprofile ADD COLUMN admin_role varchar(20) NOT NULL DEFAULT 'administrator';")
    else:
        print('admin_role already exists')

    # app_onboardingprofile.application_review_decision
    if not has_column(cur, 'app_onboardingprofile', 'application_review_decision'):
        print('Adding application_review_decision to app_onboardingprofile')
        cur.execute("ALTER TABLE app_onboardingprofile ADD COLUMN application_review_decision varchar(20) NOT NULL DEFAULT '';")
    else:
        print('application_review_decision already exists')

    # app_onboardingprofile.application_reviewed_at
    if not has_column(cur, 'app_onboardingprofile', 'application_reviewed_at'):
        print('Adding application_reviewed_at to app_onboardingprofile')
        cur.execute("ALTER TABLE app_onboardingprofile ADD COLUMN application_reviewed_at datetime NULL;")
    else:
        print('application_reviewed_at already exists')

    # app_onboardingprofile.application_reviewer_name
    if not has_column(cur, 'app_onboardingprofile', 'application_reviewer_name'):
        print('Adding application_reviewer_name to app_onboardingprofile')
        cur.execute("ALTER TABLE app_onboardingprofile ADD COLUMN application_reviewer_name varchar(255) NOT NULL DEFAULT '';")
    else:
        print('application_reviewer_name already exists')

    con.commit()
    print('Done')
finally:
    con.close()
