
BEGIN;

-- ==========================================
-- 1. SEED LIKES (250 records)
-- ==========================================

WITH user_list AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY email) AS user_num
    FROM users
    WHERE email IN (
        SELECT i || '@' || i || '.' || i
        FROM generate_series(1, 10) AS i
    )
),
post_list AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY created_at, id) AS post_num
    FROM posts
)
INSERT INTO likes (user_id, post_id)
SELECT
    u.id,
    p.id
FROM user_list u
CROSS JOIN post_list p
WHERE (u.user_num + p.post_num) % 2 = 0
ON CONFLICT (user_id, post_id) DO NOTHING;


-- ==========================================
-- 2. SEED SUBSCRIPTIONS (50 records)
-- Each user subscribes to 5 other users
-- ==========================================

WITH user_list AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY email) AS user_num
    FROM users
    WHERE email IN (
        SELECT i || '@' || i || '.' || i
        FROM generate_series(1, 10) AS i
    )
)
INSERT INTO subscriptions (user_id, author_id)
SELECT
    u.id,
    author.id
FROM user_list u
CROSS JOIN generate_series(1, 5) AS s(offset_num)
JOIN user_list author
    ON author.user_num =
       ((u.user_num + s.offset_num - 1) % 10) + 1
WHERE u.id <> author.id
ON CONFLICT (user_id, author_id) DO NOTHING;


-- ==========================================
-- 3. SEED ADMIN REQUESTS (20 records)
-- Two requests per user
-- ==========================================

WITH user_list AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY email) AS user_num
    FROM users
    WHERE email IN (
        SELECT i || '@' || i || '.' || i
        FROM generate_series(1, 10) AS i
    )
),
request_data AS (
    SELECT
        u.id AS user_id,
        u.user_num,
        r.request_num,
        CASE
            WHEN r.request_num = 1 THEN
                'I want to contribute to community management and moderation.'
            ELSE
                'I would like to help manage content and support platform users.'
        END AS reason,
        (ARRAY[
            'pending'::request_status,
            'approved'::request_status,
            'rejected'::request_status
        ])[
            1 + ((u.user_num + r.request_num) % 3)
        ] AS status
    FROM user_list u
    CROSS JOIN generate_series(1, 2) AS r(request_num)
)
INSERT INTO admin_requests (
    user_id,
    reason,
    status
)
SELECT
    r.user_id,
    r.reason,
    r.status
FROM request_data r
WHERE NOT EXISTS (
    SELECT 1
    FROM admin_requests existing
    WHERE existing.user_id = r.user_id
      AND existing.reason = r.reason
);

COMMIT;
