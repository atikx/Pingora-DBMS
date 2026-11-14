-- ============================================================
-- Pingora: showcase queries for the viva
-- Run after schema.sql, views.sql and seed.sql.
-- Each query states the business question and the DBMS concept it shows.
-- ============================================================


-- Q1. Which authors are consistently popular?
--     Concepts: JOIN, GROUP BY, aggregates, HAVING, pre-aggregated derived table.
--     Authors with at least 5 posts and an average of 1000+ views per post.
--     Likers are counted in a separate derived table: joining likes directly to
--     posts would repeat each post once per like and inflate COUNT and SUM.
SELECT u.name                    AS author,
       COUNT(*)                  AS posts,
       SUM(p.views)              AS total_views,
       ROUND(AVG(p.views))       AS avg_views_per_post,
       lk.distinct_likers
FROM users u
JOIN posts p ON p.user_id = u.id AND p.is_scheduled = FALSE
JOIN (
    SELECT p2.user_id, COUNT(DISTINCT l.user_id) AS distinct_likers
    FROM posts p2
    JOIN likes l ON l.post_id = p2.id
    GROUP BY p2.user_id
) lk ON lk.user_id = u.id
GROUP BY u.id, u.name, lk.distinct_likers
HAVING COUNT(*) >= 5 AND AVG(p.views) >= 1000
ORDER BY avg_views_per_post DESC;


-- Q2. Which posts are liked more than the average post?
--     Concepts: scalar subquery inside HAVING, derived table.
--     (Compare each post's like count with the average like count over all posts.)
SELECT p.title, p.category, COUNT(l.id) AS likes
FROM posts p
LEFT JOIN likes l ON l.post_id = p.id
WHERE p.is_scheduled = FALSE
GROUP BY p.id, p.title, p.category
HAVING COUNT(l.id) > (
        SELECT AVG(cnt)
        FROM (SELECT COUNT(*) AS cnt FROM likes GROUP BY post_id) per_post
)
ORDER BY likes DESC, p.title
LIMIT 10;


-- Q3. Which followers have never liked a single post by the author they follow?
--     Concepts: NOT EXISTS (anti-join), correlated subquery.
--     Useful for a "re-engage your followers" report.
SELECT sub.name  AS follower,
       auth.name AS author
FROM subscriptions s
JOIN users sub  ON sub.id  = s.user_id
JOIN users auth ON auth.id = s.author_id
WHERE NOT EXISTS (
        SELECT 1
        FROM likes l
        JOIN posts p ON p.id = l.post_id
        WHERE l.user_id = s.user_id
          AND p.user_id = s.author_id
)
ORDER BY author, follower;


-- Q4. What is the most-viewed post in each category, and how does it compare to the runner-up?
--     Concepts: window functions (RANK, LEAD), PARTITION BY, CTE.
WITH ranked AS (
    SELECT p.category,
           p.title,
           p.views,
           u.name AS author,
           RANK() OVER (PARTITION BY p.category ORDER BY p.views DESC) AS rnk,
           LEAD(p.views) OVER (PARTITION BY p.category ORDER BY p.views DESC) AS runner_up_views
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.is_scheduled = FALSE
)
SELECT category, title, author, views, runner_up_views,
       views - runner_up_views AS lead_over_runner_up
FROM ranked
WHERE rnk = 1
ORDER BY views DESC;


-- Q5. Show the full comment thread of the most-commented post, indented by depth.
--     Concepts: recursive CTE over a self-referencing table, ARRAY path ordering.
WITH RECURSIVE target AS (
    SELECT post_id FROM comments GROUP BY post_id ORDER BY COUNT(*) DESC, post_id LIMIT 1
),
thread AS (
    SELECT c.id, c.post_id, c.parent_id, c.user_id, c.content, c.created_at,
           0 AS depth,
           ARRAY[c.created_at::text || c.id::text] AS path
    FROM comments c
    WHERE c.post_id = (SELECT post_id FROM target) AND c.parent_id IS NULL
    UNION ALL
    SELECT ch.id, ch.post_id, ch.parent_id, ch.user_id, ch.content, ch.created_at,
           t.depth + 1,
           t.path || (ch.created_at::text || ch.id::text)
    FROM comments ch
    JOIN thread t ON ch.parent_id = t.id
)
SELECT repeat('    ', depth) || '↳ ' || u.name || ': ' || t.content AS thread
FROM thread t
JOIN users u ON u.id = t.user_id
ORDER BY t.path;


-- Q6. How is activity trending month by month?
--     Concepts: CTE, UNION ALL, DATE_TRUNC, conditional aggregation with FILTER.
WITH events AS (
    SELECT DATE_TRUNC('month', created_at) AS month, 'post'    AS kind FROM posts
    UNION ALL
    SELECT DATE_TRUNC('month', created_at),           'comment'         FROM comments
    UNION ALL
    SELECT DATE_TRUNC('month', created_at),           'like'            FROM likes
)
SELECT TO_CHAR(month, 'YYYY-MM')                    AS month,
       COUNT(*) FILTER (WHERE kind = 'post')        AS posts,
       COUNT(*) FILTER (WHERE kind = 'comment')     AS comments,
       COUNT(*) FILTER (WHERE kind = 'like')        AS likes,
       COUNT(*)                                     AS total_events
FROM events
GROUP BY month
ORDER BY month;


-- Q7. Which categories hold the most engaged audience?
--     Concepts: joins across four tables, pre-aggregation to avoid row multiplication,
--     computed ratio, reuse of a VIEW (post_stats).
SELECT category,
       COUNT(*)                                       AS posts,
       SUM(like_count)                                AS likes,
       SUM(comment_count)                             AS comments,
       ROUND(SUM(like_count + comment_count)::numeric / COUNT(*), 1) AS interactions_per_post
FROM post_stats
GROUP BY category
ORDER BY interactions_per_post DESC;


-- Q8. Mutual followers: pairs of users who follow each other.
--     Concepts: self-join on a many-to-many relation, ordering of pair to avoid duplicates.
SELECT a.name AS user_a, b.name AS user_b
FROM subscriptions s1
JOIN subscriptions s2 ON s2.user_id = s1.author_id AND s2.author_id = s1.user_id
JOIN users a ON a.id = s1.user_id
JOIN users b ON b.id = s1.author_id
WHERE s1.user_id < s1.author_id
ORDER BY user_a, user_b;
