export const queries = {
  checkUser: `SELECT * FROM users WHERE email = $1`,
  getUser: `SELECT id,name,email,isadmin,avatar,is_verified,created_at FROM users WHERE id = $1`,
  createUser: `INSERT INTO users (email, name, is_verified) VALUES ($1, $2, $3) RETURNING *`,
  createUserWithPassword: `INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *`,
  createOtp: `UPDATE users SET otp = $1 WHERE email = $2`,
  makeVerified: `UPDATE users SET is_verified = true WHERE email = $1 RETURNING *`,
  getUserInBackendById: `SELECT * FROM users WHERE id = $1`,
  updateProfile: `UPDATE users SET name = $1, password = $2 WHERE id = $3 RETURNING *`,
  updateAvatar: `UPDATE users SET avatar = $1 WHERE id = $2 RETURNING *`,
  addPost: `INSERT INTO posts (user_id, title, description, content, image, tags, category) VALUES ($1, $2, $3, $4, $5, $6::text[], $7) RETURNING *`,

  addScheduledPost: `INSERT INTO posts (user_id, title, description, content, image, tags, category, is_scheduled,scheduled_at) VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9) RETURNING *`,

  getAllPosts: `SELECT
    posts.id,
    posts.title,
    posts.description,
    posts.image,
    posts.views,
    posts.tags,
    posts.category,
    posts.created_at,
    users.name AS author_name,
    users.email AS author_email,
    users.avatar AS author_avatar
FROM posts 
    JOIN users ON posts.user_id = users.id
    WHERE posts.is_scheduled = false`,
  getPostsCount: `SELECT COUNT(*) FROM posts where is_scheduled = false`,
  getFilteredPosts: {
    Latest: `ORDER BY posts.created_at DESC LIMIT $1 OFFSET $2`,
    Oldest: `ORDER BY posts.created_at ASC LIMIT $1 OFFSET $2`,
    "Most Popular": `ORDER BY posts.views DESC LIMIT $1 OFFSET $2`,
  },
  getPostById: `SELECT
    posts.*,
    users.id AS author_id,
    users.name AS author_name,
    users.email AS author_email,
    users.avatar AS author_avatar
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.id = $1 AND posts.is_scheduled = false`,

  increasePostViews: `UPDATE posts SET views = views + 1 WHERE id = $1 RETURNING *`,
  filterPostByCategory: `SELECT
    posts.id,
    posts.title,
    posts.description,
    posts.image,
    posts.views,
    posts.tags,
    posts.category,
    posts.created_at,
    users.name AS author_name,
    users.email AS author_email,
    users.avatar AS author_avatar
FROM posts
    JOIN users ON posts.user_id = users.id where posts.category = $1 AND posts.is_scheduled = false`,

  // New query for counting filtered posts
  getFilteredPostsCount: `SELECT COUNT(*) FROM posts WHERE category = $1 AND is_scheduled = false`,

  // New sorting options for filtered posts
  getFilteredPostsSorting: {
    Latest: `ORDER BY posts.created_at DESC LIMIT $2 OFFSET $3`,
    Oldest: `ORDER BY posts.created_at ASC LIMIT $2 OFFSET $3`,
    "Most Popular": `ORDER BY posts.views DESC LIMIT $2 OFFSET $3`,
  },

  searchPost: `SELECT
    posts.id,
    posts.title,
    posts.description,
    posts.image,
    posts.views,
    posts.tags,
    posts.category,
    posts.created_at,
    users.name AS author_name,
    users.email AS author_email,
    users.avatar AS author_avatar
FROM posts
    JOIN users ON posts.user_id = users.id where posts.title ILIKE '%' || $1 || '%' OR posts.description ILIKE '%' || $1 || '%'`,

  searchPostCount: `SELECT COUNT(*) FROM posts 
                    JOIN users ON posts.user_id = users.id 
                    WHERE (posts.title ILIKE $1 OR posts.description ILIKE $1)
AND posts.is_scheduled = false`,

  searchPostWithPagination: `SELECT
    posts.id,
    posts.title,
    posts.description,
    posts.image,
    posts.views,
    posts.tags,
    posts.category,
    posts.created_at,
    users.name AS author_name,
    users.email AS author_email,
    users.avatar AS author_avatar
    FROM posts
    JOIN users ON posts.user_id = users.id 
    WHERE posts.title ILIKE $1 OR posts.description ILIKE $1`,

  // Sorting options for search results
  getSearchPostsSorting: {
    Latest: `ORDER BY posts.created_at DESC LIMIT $2 OFFSET $3`,
    Oldest: `ORDER BY posts.created_at ASC LIMIT $2 OFFSET $3`,
    "Most Popular": `ORDER BY posts.views DESC LIMIT $2 OFFSET $3`,
  },

  addComment: `WITH inserted_comment AS (
  INSERT INTO comments (user_id, post_id, parent_id, content)
  VALUES ($1, $2, $3, $4)
  RETURNING *
)
SELECT 
  inserted_comment.*, 
  users.name AS user_name, 
  users.avatar AS user_avatar
FROM inserted_comment
JOIN users ON inserted_comment.user_id = users.id`,

  getCommentsByPostId: `SELECT 
  comments.*,
  users.name AS user_name,
  users.avatar AS user_avatar
FROM comments
JOIN users ON comments.user_id = users.id
WHERE comments.post_id = $1`,

  checkSubscription: `SELECT * FROM subscriptions WHERE user_id = $1 AND author_id = $2`,
  addSubscription: `INSERT INTO subscriptions (user_id, author_id) VALUES ($1, $2) RETURNING *`,
  deleteSubscription: `DELETE FROM subscriptions WHERE user_id = $1 AND author_id = $2 RETURNING *`,

  getSubscribers: `SELECT users.email
FROM subscriptions
    JOIN users ON subscriptions.user_id = users.id
WHERE
    subscriptions.author_id = $1`,

  checkLike: `SELECT * FROM likes WHERE user_id = $1 AND post_id = $2`,
  addLike: `INSERT INTO likes (user_id, post_id) VALUES ($1, $2) RETURNING *`,
  deleteLike: `DELETE FROM likes WHERE user_id = $1 AND post_id = $2 RETURNING *`,

  ReallyAddScheduledPost: `WITH updated_posts AS (
  UPDATE posts
  SET is_scheduled = false, created_at = NOW()
  WHERE scheduled_at <= NOW() AND is_scheduled = true
  RETURNING *
)
SELECT 
  updated_posts.*,
  users.name AS author_name,
  users.email AS author_email,
  users.avatar AS author_avatar
FROM updated_posts
JOIN users ON updated_posts.user_id = users.id`,

  getScheduledPosts: `SELECT * FROM posts WHERE is_scheduled = true AND scheduled_At >= NOW() ORDER BY scheduled_at ASC`,

  getYourPosts: `SELECT
    posts.id,
    posts.title,
    posts.description,
    posts.image,
    posts.views,
    posts.tags,
    posts.category,
    posts.created_at,
    posts.is_scheduled,
    posts.scheduled_at,
    users.name AS author_name,
    users.email AS author_email,
    users.avatar AS author_avatar
FROM posts 
    JOIN users ON posts.user_id = users.id
    WHERE posts.user_id = $1 order by posts.created_at DESC`,

  deletePost: `DELETE FROM posts WHERE id = $1 RETURNING *`,

  getLikedPosts: `SELECT
    posts.id,
    posts.title,
    posts.description,
    posts.image,
    posts.views,
    posts.tags,
    posts.category,
    posts.created_at,
    users.name AS author_name,
    users.email AS author_email,
    users.avatar AS author_avatar
FROM likes
JOIN posts ON likes.post_id = posts.id
JOIN users ON posts.user_id = users.id
WHERE likes.user_id = $1 order by posts.created_at DESC`,

  getSubscriptions: `SELECT 
  users.id,
  users.name,
  users.avatar,
  users.created_at as member_since,
  subscriptions.created_at
FROM subscriptions 
JOIN users ON subscriptions.author_id = users.id
WHERE subscriptions.user_id = $1`,

  createAdminRequest: `INSERT INTO admin_requests (user_id, reason) VALUES ($1, $2) RETURNING *`,
  getAdminRequests: `SELECT 
    admin_requests.id AS request_id,
    admin_requests.reason,
    admin_requests.created_at AS request_created_at,
    admin_requests.updated_at AS request_updated_at,
    users.id AS user_id,
    users.name,
    users.email,
    users.avatar,
    users.created_at AS user_created_at
FROM admin_requests
JOIN users ON admin_requests.user_id = users.id 
WHERE admin_requests.status = 'pending'`,

  // ---- Admin-request review: run inside ONE transaction (see admin.routes.js) ----
  // 1. lock the request row so two admins cannot review it at the same time
  lockPendingAdminRequest: `SELECT id, user_id FROM admin_requests
WHERE id = $1 AND status = 'pending'
FOR UPDATE`,
  // 2. record the decision
  setAdminRequestStatus: `UPDATE admin_requests SET status = $1 WHERE id = $2`,
  // 3. approve only: grant the privilege
  promoteUser: `UPDATE users SET isadmin = TRUE WHERE id = $1 RETURNING name, email`,
  // 4. approve only: close the user's other pending requests, they are now redundant
  closeSiblingAdminRequests: `UPDATE admin_requests SET status = 'approved'
WHERE user_id = $1 AND status = 'pending' AND id <> $2`,
  getUserForRequest: `SELECT name, email FROM users WHERE id = $1`,
  getAdminRequestState: `SELECT ar.status AS request_status, u.isadmin AS user_is_admin
FROM admin_requests ar JOIN users u ON u.id = ar.user_id WHERE ar.id = $1`,
};

// ---- Admin reports: every report is a plain SQL string, mostly built on the views ----
export const reports = [
  {
    key: "author_leaderboard",
    title: "Author leaderboard",
    source: "VIEW author_leaderboard (built on post_stats)",
    concept: "View on a view, GROUP BY, RANK() window function",
    sql: `SELECT engagement_rank AS rank, author_name AS author, post_count AS posts,
       total_views, total_likes, total_comments, subscriber_count AS subscribers
FROM author_leaderboard
ORDER BY engagement_rank, author_name
LIMIT 10`,
  },
  {
    key: "top_posts",
    title: "Most engaging posts",
    source: "VIEW post_stats",
    concept: "Pre-aggregated joins (no row multiplication), computed score",
    sql: `SELECT title, category, author_name AS author, views, like_count AS likes,
       comment_count AS comments, engagement_score AS score
FROM post_stats
ORDER BY engagement_score DESC
LIMIT 10`,
  },
  {
    key: "trending",
    title: "Trending in each category (last 30 days)",
    source: "VIEW trending_posts",
    concept: "ROW_NUMBER() OVER (PARTITION BY category)",
    sql: `SELECT category, category_rank AS rank, title, author_name AS author,
       engagement_score AS score
FROM trending_posts
WHERE category_rank <= 2
ORDER BY category, category_rank`,
  },
  {
    key: "category_engagement",
    title: "Engagement by category",
    source: "VIEW post_stats",
    concept: "GROUP BY with computed ratio",
    chart: { x: "category", bars: ["likes", "comments"] },
    sql: `SELECT category,
       COUNT(*) AS posts,
       SUM(like_count) AS likes,
       SUM(comment_count) AS comments,
       ROUND(SUM(like_count + comment_count)::numeric / COUNT(*), 1) AS interactions_per_post
FROM post_stats
GROUP BY category
ORDER BY interactions_per_post DESC`,
  },
  {
    key: "monthly_activity",
    title: "Monthly activity",
    source: "tables posts, comments, likes",
    concept: "CTE, UNION ALL, DATE_TRUNC, conditional aggregation (FILTER)",
    chart: { x: "month", bars: ["posts", "comments", "likes"] },
    sql: `WITH events AS (
    SELECT DATE_TRUNC('month', created_at) AS month, 'post' AS kind FROM posts
    UNION ALL
    SELECT DATE_TRUNC('month', created_at), 'comment' FROM comments
    UNION ALL
    SELECT DATE_TRUNC('month', created_at), 'like' FROM likes
)
SELECT TO_CHAR(month, 'YYYY-MM') AS month,
       COUNT(*) FILTER (WHERE kind = 'post')    AS posts,
       COUNT(*) FILTER (WHERE kind = 'comment') AS comments,
       COUNT(*) FILTER (WHERE kind = 'like')    AS likes
FROM events
GROUP BY month
ORDER BY month`,
  },
  {
    key: "inactive_followers",
    title: "Followers who never liked the author they follow",
    source: "tables subscriptions, likes, posts, users",
    concept: "NOT EXISTS (anti-join), correlated subquery",
    sql: `SELECT sub.name AS follower, auth.name AS author
FROM subscriptions s
JOIN users sub  ON sub.id  = s.user_id
JOIN users auth ON auth.id = s.author_id
WHERE NOT EXISTS (
        SELECT 1 FROM likes l
        JOIN posts p ON p.id = l.post_id
        WHERE l.user_id = s.user_id AND p.user_id = s.author_id)
ORDER BY author, follower
LIMIT 20`,
  },
  {
    key: "mutual_followers",
    title: "Mutual followers",
    source: "table subscriptions (self-join)",
    concept: "Self-join on a many-to-many relation",
    sql: `SELECT a.name AS user_a, b.name AS user_b
FROM subscriptions s1
JOIN subscriptions s2 ON s2.user_id = s1.author_id AND s2.author_id = s1.user_id
JOIN users a ON a.id = s1.user_id
JOIN users b ON b.id = s1.author_id
WHERE s1.user_id < s1.author_id
ORDER BY user_a, user_b`,
  },
  {
    key: "most_active_users",
    title: "Most active users",
    source: "VIEW user_activity_summary",
    concept: "Correlated scalar subqueries inside a view",
    sql: `SELECT name, posts_written AS posts, comments_written AS comments,
       likes_given AS likes, following_count AS following, follower_count AS followers
FROM user_activity_summary
ORDER BY comments_written + likes_given DESC, name
LIMIT 10`,
  },
  {
    key: "admin_queue",
    title: "Admin request queue",
    source: "VIEW admin_request_overview",
    concept: "Join + CASE expression for waiting time",
    sql: `SELECT name, email, status, TO_CHAR(requested_at, 'YYYY-MM-DD') AS requested,
       COALESCE(EXTRACT(DAY FROM waiting_for)::int::text || ' days', '-') AS waiting
FROM admin_request_overview
ORDER BY (status = 'pending') DESC, requested_at DESC
LIMIT 10`,
  },
];

export const reportTotalsQuery = `SELECT
  (SELECT COUNT(*) FROM users)                                        AS users,
  (SELECT COUNT(*) FROM posts WHERE is_scheduled = FALSE)             AS posts,
  (SELECT COUNT(*) FROM comments)                                     AS comments,
  (SELECT COUNT(*) FROM likes)                                        AS likes,
  (SELECT COUNT(*) FROM subscriptions)                                AS subscriptions,
  (SELECT COUNT(*) FROM admin_requests WHERE status = 'pending')      AS pending_requests`;
