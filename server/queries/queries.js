import { get } from "http";

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

  deleteSubscription: `DELETE FROM subscriptions WHERE user_id = $1 AND author_id = $2 RETURNING *`,

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

  approveAdminRequest: `WITH updated_request AS (
  UPDATE admin_requests
  SET status = 'approved'
  WHERE id = $1
  RETURNING user_id
),
updated_user AS (
  UPDATE users
  SET isadmin = TRUE
  WHERE id = (SELECT user_id FROM updated_request)
  RETURNING name, email
)
SELECT name, email FROM updated_user`,

  rejectAdminRequest: `WITH updated_request AS (
  UPDATE admin_requests
  SET status = 'rejected'
  WHERE id = $1
  RETURNING user_id
),
updated_user AS (
  UPDATE users
  SET isadmin = FALSE
  WHERE id = (SELECT user_id FROM updated_request)
  RETURNING name, email
)
SELECT name, email FROM updated_user`,
};
