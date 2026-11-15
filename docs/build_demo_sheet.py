#!/usr/bin/env python3
"""Fill the one-page Demo Sheet (docx template + equivalent PDF) from one data set.
usage (from the repo root): python3 docs/build_demo_sheet.py <commit-hash> "<lab section>"
Regenerates docs/Demo_Sheet_Group26.docx and .pdf (needs google-chrome-stable and pdfinfo).
Line numbers in the tables refer to the final commit; re-check them if those files change.
"""
import sys, re, zipfile, shutil, subprocess, html, os, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = ROOT + '/DBMS_Project_Demo_Sheet_One_Page.docx'
OUT_DOCX = ROOT + '/docs/Demo_Sheet_Group26.docx'
OUT_HTML = os.path.join(tempfile.gettempdir(), 'demo_sheet.html')
OUT_PDF = ROOT + '/docs/Demo_Sheet_Group26.pdf'

COMMIT = sys.argv[1] if len(sys.argv) > 1 else '[COMMIT HASH: fill after tagging final]'
LAB = sys.argv[2] if len(sys.argv) > 2 else '[lab section]'

team = [
    'Group 26 / ' + LAB,
    'Atiksh Gupta 2024A8PS0500H; Sudhansh Khandelwal 2024AAPS0255H; '
    'J. Bhanu Srikar 2024AAPS0241H; Nihal Ahmed Khan T A 2024A8PS0512H',
    'github.com/atikx/Pingora-DBMS  |  tag: final  |  commit: ' + COMMIT,
]
stack = [
    'PostgreSQL 17; Node.js + Express (pg pool); React (Vite, TypeScript); Redis; Docker Compose; pgAdmin',
    '6 tables + 6 views (users, posts, likes, comments, subscriptions, admin_requests)',
    '851 rows: 10 users, 50 posts, 500 comments, 221 likes, 50 subscriptions, 20 admin requests',
]
workflows = [
    ['1', 'Review an admin request (approval)',
     'TRANSACTION: atomic change across tables, row lock (SELECT ... FOR UPDATE), ROLLBACK demo; updated_at trigger fires',
     'admin_requests, users',
     'Admin > Admin Requests > Approve: BEGIN; lock pending request; status = approved; users.isadmin = TRUE; close '
     "user's other pending requests; COMMIT. \"Test rollback\" runs the same statements, then fails: ROLLBACK, "
     'request stays pending, user unchanged.'],
    ['2', 'Admin analytics dashboard (Reports)',
     'COMPLEX RETRIEVAL / REPORTING: 5 views, CTE, window functions, NOT EXISTS, self-join, aggregation',
     'users, posts, likes, comments, subscriptions, admin_requests (via views post_stats, author_leaderboard, '
     'trending_posts, user_activity_summary, admin_request_overview)',
     'Admin > Reports > Analytics: GET /reports runs 9 SQL reports. Like a post, press Refresh: Likes total and the '
     "author's leaderboard row change (read live from the DB)."],
    ['3', 'Integrity Lab (constraint enforcement)',
     'INTEGRITY: UNIQUE, CHECK, NOT NULL, FOREIGN KEY, ENUM and the last-admin TRIGGER; each run inside BEGIN ... ROLLBACK',
     'likes, subscriptions, posts, comments, admin_requests, users',
     'Admin > Reports > Integrity Lab > Run it: the DB rejects the bad write (SQLSTATE 23505 / 23514 / 23502 / 23503 / '
     '22P02 / 23001 + constraint name); data unchanged. In normal use, liking twice returns HTTP 409 (UNIQUE).'],
]
queries = [
    ['1', 'Monthly activity trend (posts, comments, likes)', 'CTE, UNION ALL, DATE_TRUNC, FILTER (conditional aggregation), GROUP BY',
     'server/queries/queries.js : 295', 'Workflow 2: Reports > Monthly activity (chart)'],
    ['2', 'Followers who never liked the author they follow', 'Joins, NOT EXISTS (correlated subquery)',
     'server/queries/queries.js : 316', 'Workflow 2: Reports > Inactive followers'],
    ['3', 'Mutual followers', 'Self-join on the M:N table subscriptions',
     'server/queries/queries.js : 332', 'Workflow 2: Reports > Mutual followers'],
    ['4', 'Authors with 5+ posts and average views >= 1000', 'Multi-table join, GROUP BY, HAVING, derived table',
     'server/schema/queries_demo.sql : 8', 'pgAdmin; same idea in Reports > Author leaderboard (queries.js : 247)'],
    ['5', 'Top post per category and lead over runner-up', 'CTE, RANK() and LEAD() window functions, PARTITION BY',
     'server/schema/queries_demo.sql : 65', 'pgAdmin; Reports > Trending (queries.js : 269, view trending_posts)'],
    ['6', 'Full nested comment tree of a post', 'Recursive CTE over self-referencing FK, array path ordering',
     'server/schema/queries_demo.sql : 85; views.sql : 72', 'pgAdmin; view comment_threads'],
]
features = [
    ['1', 'Transaction', 'approveAdminRequest / rejectAdminRequest (BEGIN, FOR UPDATE, COMMIT, ROLLBACK)',
     'server/routes/admin.routes.js : 306 (BEGIN 313, COMMIT 339)', 'Atomic approval across admin_requests and users; Test rollback proves nothing is half-applied'],
    ['2', 'Trigger', 'prevent_last_admin_loss + trg_users_keep_last_admin_update / _delete',
     'server/schema/schema.sql : 178, 195, 201', 'Blocks demoting or deleting the last admin (locks other admins; SQLSTATE 23001)'],
    ['3', 'Trigger', 'set_updated_at + trg_users / posts / comments / admin_requests_updated_at',
     'server/schema/schema.sql : 148, 155-169', 'Keeps updated_at correct without relying on the application'],
    ['4', 'Views (6)', 'post_stats, author_leaderboard, trending_posts, comment_threads, admin_request_overview, user_activity_summary',
     'server/schema/views.sql : 11-114', 'Reusable report logic read by the Reports page (counts without row multiplication)'],
    ['5', 'Indexes (15)', 'idx_posts_title_trgm (GIN trigram), idx_posts_published_created (partial), idx_posts_scheduled_at, ...',
     'server/schema/schema.sql : 102-142', 'ILIKE search 29 ms to 0.5 ms and feed 4.8 ms to 0.03 ms on 50,000 posts (EXPLAIN ANALYZE)'],
]

W = 'xmlns:w'
def esc(s): return html.escape(s, quote=False)

def row_xml(vals, widths, bold=False):
    cells = []
    for v, w in zip(vals, widths):
        cells.append(
            '<w:tc><w:tcPr><w:tcW w:type="dxa" w:w="%s"/><w:vAlign w:val="center"/></w:tcPr>'
            '<w:p><w:pPr><w:spacing w:after="10" w:before="10"/></w:pPr><w:r><w:rPr>%s<w:sz w:val="15"/></w:rPr>'
            '<w:t xml:space="preserve">%s</w:t></w:r></w:p></w:tc>' % (w, '<w:b/>' if bold else '', esc(v)))
    return '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + ''.join(cells) + '</w:tr>'

def fill_docx():
    os.makedirs(ROOT + '/docs', exist_ok=True)
    z = zipfile.ZipFile(SRC)
    doc = z.read('word/document.xml').decode('utf8')
    tables = [(m.start(), m.end()) for m in re.finditer(r'<w:tbl>.*?</w:tbl>', doc, re.S)]
    assert len(tables) == 5, len(tables)
    datas = [[team], [stack], workflows, queries, features]
    new = doc
    for (a, b), data in reversed(list(zip(tables, datas))):
        t = doc[a:b]
        rows = re.findall(r'<w:tr>.*?</w:tr>', t, re.S)
        header = rows[0]
        widths = re.findall(r'<w:tcW w:type="dxa" w:w="(\d+)"', header)
        body = ''.join(row_xml(r, widths) for r in data)
        t2 = t.replace(''.join(rows[1:]), body)
        assert t2 != t
        new = new[:a] + t2 + new[b:]
    # drop the example sentence? keep the instruction line; tighten spacing handled by 7.5pt text
    out = zipfile.ZipFile(OUT_DOCX, 'w', zipfile.ZIP_DEFLATED)
    for item in z.infolist():
        data = z.read(item.filename)
        if item.filename == 'word/document.xml':
            data = new.encode('utf8')
        out.writestr(item, data)
    out.close()

def table_html(head, rows, widths=None):
    h = '<table><tr>' + ''.join('<th>%s</th>' % esc(x) for x in head) + '</tr>'
    for r in rows:
        h += '<tr>' + ''.join('<td>%s</td>' % esc(x) for x in r) + '</tr>'
    return h + '</table>'

def build_pdf():
    page = '''<!doctype html><meta charset="utf-8"><style>
@page { size: 11in 8.5in; margin: 0.35in 0.4in 0.3in 0.4in; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 7.4pt; color:#111; margin:0; }
h1 { font-size: 15pt; margin: 0 0 1px; color:#1f3864; }
h2 { font-size: 9pt; margin: 5px 0 2px; color:#1f3864; }
p.note { margin: 0 0 3px; font-size: 7pt; color:#444; }
table { border-collapse: collapse; width: 100%; margin-bottom: 2px; table-layout: auto; }
th, td { border: 0.6px solid #555; padding: 1.5px 3px; vertical-align: middle; text-align: left; line-height: 1.18; }
th { background:#dce6f1; font-weight: 700; }
</style>
<h1>DBMS Project &mdash; Demo Sheet</h1>
<p class="note">Complete before the lab demo. Submit as a single-page PDF. All entries refer to the submitted final commit (tag <b>final</b>).</p>
''' + table_html(['Team ID / Lab section', 'Members (names and IDs)', 'GitHub repository / final commit hash'], [team]) \
      + table_html(['RDBMS and technology stack', 'Number of tables', 'Total database records'], [stack]) \
      + '<h2>A. Application workflows (at least 3)</h2>' \
      + table_html(['#', 'Workflow / purpose', 'DBMS aspect', 'Tables involved', 'UI action → database effect'], workflows) \
      + '<h2>B. Non-trivial SQL queries (at least 5)</h2>' \
      + table_html(['#', 'Query purpose', 'SQL concepts (join, group, subquery, CTE, etc.)', 'Source file : line', 'Workflow / screen'], queries) \
      + '<h2>C. Additional DBMS features (at least 3)</h2>' \
      + table_html(['#', 'Feature (transaction / view / trigger / procedure / index)', 'Object / function name', 'Source file : line', 'Purpose / effect'], features) \
      + '<p class="note" style="margin-top:3px">Setup: <b>docker compose up -d --build</b> (schema.sql, views.sql, seed.sql load automatically); login 1@1.1 / password123.</p>'
    open(OUT_HTML, 'w').write(page)
    subprocess.run(['google-chrome-stable', '--headless=new', '--no-sandbox', '--disable-gpu',
                    '--no-pdf-header-footer', '--print-to-pdf=' + OUT_PDF, 'file://' + OUT_HTML],
                   check=True, capture_output=True)

fill_docx()
build_pdf()
print(subprocess.run(['pdfinfo', OUT_PDF], capture_output=True, text=True).stdout)
