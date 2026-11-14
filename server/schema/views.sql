-- ============================================================
-- Pingora: SQL views
-- Run after schema.sql.  Safe to re-run (CREATE OR REPLACE).
-- Each view pre-aggregates in a subquery so that joining likes
-- and comments together does not multiply rows (fan-out).
-- ============================================================

-- 1. post_stats --------------------------------------------------
-- One row per published post with author, like/comment counts
-- and a simple engagement score.
CREATE OR REPLACE VIEW post_stats AS
SELECT
    p.id            AS post_id,
    p.title,
    p.category,
    p.views,
    p.created_at,
    u.id            AS author_id,
    u.name          AS author_name,
    COALESCE(l.like_count, 0)    AS like_count,
    COALESCE(c.comment_count, 0) AS comment_count,
    p.views + 5 * COALESCE(l.like_count, 0) + 3 * COALESCE(c.comment_count, 0) AS engagement_score
FROM posts p
JOIN users u ON u.id = p.user_id
LEFT JOIN (
    SELECT post_id, COUNT(*) AS like_count FROM likes GROUP BY post_id
) l ON l.post_id = p.id
LEFT JOIN (
    SELECT post_id, COUNT(*) AS comment_count FROM comments GROUP BY post_id
) c ON c.post_id = p.id
WHERE p.is_scheduled = FALSE;

-- 2. author_leaderboard -----------------------------------------
-- Aggregates post_stats per author (a view built on a view) and
-- adds subscriber counts.  Ranked with a window function.
CREATE OR REPLACE VIEW author_leaderboard AS
SELECT
    u.id   AS author_id,
    u.name AS author_name,
    COUNT(ps.post_id)                    AS post_count,
    COALESCE(SUM(ps.views), 0)           AS total_views,
    COALESCE(SUM(ps.like_count), 0)      AS total_likes,
    COALESCE(SUM(ps.comment_count), 0)   AS total_comments,
    COALESCE(s.subscriber_count, 0)      AS subscriber_count,
    RANK() OVER (ORDER BY COALESCE(SUM(ps.engagement_score), 0) DESC) AS engagement_rank
FROM users u
JOIN post_stats ps ON ps.author_id = u.id
LEFT JOIN (
    SELECT author_id, COUNT(*) AS subscriber_count FROM subscriptions GROUP BY author_id
) s ON s.author_id = u.id
GROUP BY u.id, u.name, s.subscriber_count;

-- 3. trending_posts ----------------------------------------------
-- Top 5 posts per category published in the last 30 days.
CREATE OR REPLACE VIEW trending_posts AS
SELECT *
FROM (
    SELECT
        ps.*,
        ROW_NUMBER() OVER (
            PARTITION BY ps.category
            ORDER BY ps.engagement_score DESC, ps.created_at DESC
        ) AS category_rank
    FROM post_stats ps
    WHERE ps.created_at >= NOW() - INTERVAL '30 days'
) ranked
WHERE category_rank <= 5;

-- 4. comment_threads ---------------------------------------------
-- Flattens the self-referencing comments table into an ordered
-- thread tree using a recursive CTE.
CREATE OR REPLACE VIEW comment_threads AS
WITH RECURSIVE thread AS (
    SELECT
        c.id, c.post_id, c.parent_id, c.user_id, c.content, c.created_at,
        0 AS depth,
        ARRAY[c.created_at::text || c.id::text] AS sort_path
    FROM comments c
    WHERE c.parent_id IS NULL
    UNION ALL
    SELECT
        ch.id, ch.post_id, ch.parent_id, ch.user_id, ch.content, ch.created_at,
        t.depth + 1,
        t.sort_path || (ch.created_at::text || ch.id::text)
    FROM comments ch
    JOIN thread t ON ch.parent_id = t.id
)
SELECT
    t.id AS comment_id, t.post_id, t.parent_id, t.depth,
    u.name AS commenter_name, t.content, t.created_at
FROM thread t
JOIN users u ON u.id = t.user_id
ORDER BY t.post_id, t.sort_path;

-- 5. admin_request_overview --------------------------------------
-- Admin request queue with requester details and how long each
-- request has been waiting.
CREATE OR REPLACE VIEW admin_request_overview AS
SELECT
    ar.id AS request_id,
    ar.status,
    ar.reason,
    ar.created_at AS requested_at,
    u.id AS user_id,
    u.name,
    u.email,
    u.isadmin AS is_currently_admin,
    CASE WHEN ar.status = 'pending' THEN NOW() - ar.created_at END AS waiting_for
FROM admin_requests ar
JOIN users u ON u.id = ar.user_id;

-- 6. user_activity_summary ---------------------------------------
-- Per-user engagement footprint, using correlated scalar subqueries.
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT
    u.id AS user_id,
    u.name,
    u.email,
    u.isadmin,
    (SELECT COUNT(*) FROM posts         p WHERE p.user_id = u.id)         AS posts_written,
    (SELECT COUNT(*) FROM comments      c WHERE c.user_id = u.id)         AS comments_written,
    (SELECT COUNT(*) FROM likes         l WHERE l.user_id = u.id)         AS likes_given,
    (SELECT COUNT(*) FROM subscriptions s WHERE s.user_id = u.id)         AS following_count,
    (SELECT COUNT(*) FROM subscriptions s WHERE s.author_id = u.id)       AS follower_count
FROM users u;
