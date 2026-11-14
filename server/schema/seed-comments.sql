
BEGIN;

-- Temporary mapping of newly inserted parent comments
CREATE TEMP TABLE seed_parent_comments (
    post_id UUID,
    comment_num INTEGER,
    comment_id UUID
) ON COMMIT DROP;

-- 1. Insert 5 top-level comments on every post
WITH post_list AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY created_at, id) AS post_num
    FROM posts
),
user_list AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY email) AS user_num
    FROM users
    WHERE email IN (
        SELECT i || '@' || i || '.' || i
        FROM generate_series(1, 10) AS i
    )
),
inserted AS (
    INSERT INTO comments (
        user_id,
        post_id,
        content
    )
    SELECT
        u.id,
        p.id,
        'SEED|' || c.comment_num || '|This is a great post! Really enjoyed reading it.'
    FROM post_list p
    CROSS JOIN generate_series(1, 5) AS c(comment_num)
    JOIN user_list u
      ON u.user_num = ((p.post_num + c.comment_num - 2) % 10) + 1
    RETURNING id, post_id, content
)
INSERT INTO seed_parent_comments (
    post_id,
    comment_num,
    comment_id
)
SELECT
    post_id,
    split_part(content, '|', 2)::INTEGER,
    id
FROM inserted;


-- 2. Insert 5 nested replies on every post
WITH post_list AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY created_at, id) AS post_num
    FROM posts
),
user_list AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY email) AS user_num
    FROM users
    WHERE email IN (
        SELECT i || '@' || i || '.' || i
        FROM generate_series(1, 10) AS i
    )
)
INSERT INTO comments (
    user_id,
    post_id,
    parent_id,
    content
)
SELECT
    u.id,
    p.id,
    parent.comment_id,
    CASE c.reply_num
        WHEN 6 THEN 'Absolutely! I completely agree with you.'
        WHEN 7 THEN 'Thanks for sharing this perspective!'
        WHEN 8 THEN 'That is a really interesting point.'
        WHEN 9 THEN 'I had a similar experience. Great post!'
        ELSE 'Looking forward to more posts like this!'
    END

FROM post_list p
CROSS JOIN generate_series(6, 10) AS c(reply_num)

JOIN seed_parent_comments parent
    ON parent.post_id = p.id
   AND parent.comment_num = c.reply_num - 5

JOIN user_list u
    ON u.user_num = ((p.post_num + c.reply_num - 2) % 10) + 1;

COMMIT;
