import { Router } from "express";
import { pool } from "../config/db.js";
import { authenticateAdminToken } from "../middlewares/jwtauth.js";
import { reports, reportTotalsQuery } from "../queries/queries.js";

const router = Router();
router.use(authenticateAdminToken);

// ---------------------------------------------------------------------------
// WORKFLOW: reporting.  Every report is one SQL statement (see queries.js),
// mostly reading the views created in schema/views.sql.  The response includes
// the SQL text and the DBMS concept so the page can show them during the demo.
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const [totals, ...results] = await Promise.all([
      pool.query(reportTotalsQuery),
      ...reports.map((r) => pool.query(r.sql)),
    ]);
    res.status(200).json({
      totals: totals.rows[0],
      reports: reports.map((r, i) => ({
        key: r.key,
        title: r.title,
        source: r.source,
        concept: r.concept,
        chart: r.chart || null,
        sql: r.sql,
        rows: results[i].rows,
      })),
    });
  } catch (error) {
    console.error("Error building reports:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// WORKFLOW: constraint enforcement ("Integrity Lab").
//
// Each scenario tries to break one rule.  It runs inside a transaction that is
// ALWAYS rolled back, so no data ever changes.  The point: the rejection comes
// from the DATABASE (constraint / trigger), not from JavaScript validation.
// Scenarios are fixed SQL chosen by key; nothing from the request is executed.
// ---------------------------------------------------------------------------
const KEEP_ADMIN = `(SELECT id FROM users WHERE isadmin ORDER BY created_at, id LIMIT 1)`;
const DEMOTE_ALL_BUT_ONE = `UPDATE users SET isadmin = FALSE WHERE isadmin AND id <> ${KEEP_ADMIN}`;

const scenarios = [
  {
    key: "duplicate_like",
    title: "Like the same post twice",
    rule: "UNIQUE (user_id, post_id) on likes",
    kind: "UNIQUE constraint",
    sql: [`INSERT INTO likes (user_id, post_id) SELECT user_id, post_id FROM likes LIMIT 1`],
  },
  {
    key: "self_subscribe",
    title: "Subscribe to yourself",
    rule: "CHECK (user_id <> author_id) on subscriptions",
    kind: "CHECK constraint",
    sql: [`INSERT INTO subscriptions (user_id, author_id) SELECT id, id FROM users LIMIT 1`],
  },
  {
    key: "negative_views",
    title: "Set a post's views to -5",
    rule: "CHECK (views >= 0) on posts",
    kind: "CHECK constraint",
    sql: [`UPDATE posts SET views = -5 WHERE id = (SELECT id FROM posts LIMIT 1)`],
  },
  {
    key: "schedule_without_time",
    title: "Schedule a post with no publish time",
    rule: "CHECK (is_scheduled = FALSE OR scheduled_at IS NOT NULL)",
    kind: "CHECK constraint (cross-column)",
    sql: [
      `INSERT INTO posts (user_id, title, description, content, image, is_scheduled)
       SELECT id, 'Demo', 'Demo', '{}'::jsonb, 'x', TRUE FROM users LIMIT 1`,
    ],
  },
  {
    key: "blank_comment",
    title: "Post an empty comment",
    rule: "CHECK (length(btrim(content)) > 0) on comments",
    kind: "CHECK constraint",
    sql: [
      `INSERT INTO comments (user_id, post_id, content)
       SELECT u.id, p.id, '   ' FROM users u CROSS JOIN posts p LIMIT 1`,
    ],
  },
  {
    key: "comment_without_author",
    title: "Insert a comment with no user",
    rule: "NOT NULL on comments.user_id",
    kind: "NOT NULL constraint",
    sql: [`INSERT INTO comments (post_id, content) SELECT id, 'hello' FROM posts LIMIT 1`],
  },
  {
    key: "like_missing_post",
    title: "Like a post that does not exist",
    rule: "FOREIGN KEY likes.post_id -> posts.id",
    kind: "FOREIGN KEY constraint",
    sql: [`INSERT INTO likes (user_id, post_id) SELECT id, uuid_generate_v4() FROM users LIMIT 1`],
  },
  {
    key: "bad_status",
    title: "Admin request with status 'banana'",
    rule: "ENUM request_status ('pending','approved','rejected')",
    kind: "ENUM domain",
    sql: [
      `INSERT INTO admin_requests (user_id, reason, status)
       SELECT id, 'demo', 'banana' FROM users LIMIT 1`,
    ],
  },
  {
    key: "bad_otp",
    title: "Store a 2-digit OTP",
    rule: "CHECK (otp BETWEEN 100000 AND 999999) on users",
    kind: "CHECK constraint",
    sql: [`UPDATE users SET otp = 42 WHERE id = (SELECT id FROM users LIMIT 1)`],
  },
  {
    key: "demote_last_admin",
    title: "Demote the last remaining admin",
    rule: "TRIGGER prevent_last_admin_loss (BEFORE UPDATE OF isadmin)",
    kind: "TRIGGER",
    note: "Step 1 demotes every other admin (allowed); step 2 tries to demote the last one.",
    sql: [DEMOTE_ALL_BUT_ONE, `UPDATE users SET isadmin = FALSE WHERE id = ${KEEP_ADMIN}`],
  },
  {
    key: "delete_last_admin",
    title: "Delete the last remaining admin",
    rule: "TRIGGER prevent_last_admin_loss (BEFORE DELETE)",
    kind: "TRIGGER",
    note: "Step 1 demotes every other admin (allowed); step 2 tries to delete the last one.",
    sql: [DEMOTE_ALL_BUT_ONE, `DELETE FROM users WHERE id = ${KEEP_ADMIN}`],
  },
];

router.get("/integrity-lab", (req, res) => {
  res.status(200).json(
    scenarios.map(({ key, title, rule, kind, note, sql }) => ({
      key,
      title,
      rule,
      kind,
      note: note || null,
      sql,
    }))
  );
});

router.post("/integrity-lab/run", async (req, res) => {
  const scenario = scenarios.find((s) => s.key === req.body?.scenario);
  if (!scenario) return res.status(404).json({ message: "Unknown scenario" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    try {
      for (const statement of scenario.sql) await client.query(statement);
      // No error: the database ACCEPTED the statement (should not happen).
      await client.query("ROLLBACK");
      return res.status(200).json({ rejected: false, dataChanged: false });
    } catch (err) {
      await client.query("ROLLBACK");
      return res.status(200).json({
        rejected: true,
        dataChanged: false,
        sqlstate: err.code,
        constraint: err.constraint || null,
        table: err.table || null,
        message: err.message,
        detail: err.detail || null,
      });
    }
  } catch (error) {
    console.error("integrity lab error", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
