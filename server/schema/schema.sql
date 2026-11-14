CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- trigram indexes for ILIKE '%text%' search

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE if not exists users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    name VARCHAR(255) DEFAULT 'John Doe',
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT,
    -- DESIGN NOTE: role is a plain boolean. A roles / user_roles pair of tables
    -- would be more extensible, but only two kinds of account exist (see report).
    isadmin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    avatar TEXT DEFAULT 'https://thumbs.dreamstime.com/b/generative-ai-young-smiling-man-avatar-man-brown-beard-mustache-hair-wearing-yellow-sweater-sweatshirt-d-vector-people-279560903.jpg',
    is_verified BOOLEAN DEFAULT FALSE,
    -- DESIGN NOTE (weak): the OTP lives on the user row, has no expiry and only
    -- one OTP can exist at a time. See the proposed otp_codes table in section 5.
    otp INTEGER,
    CONSTRAINT chk_users_email_format CHECK (position('@' in email) > 1),
    CONSTRAINT chk_users_otp_6_digits CHECK (otp IS NULL OR otp BETWEEN 100000 AND 999999)
);

CREATE TABLE if not exists posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    content JSONB NOT NULL,
    image TEXT NOT NULL,
    -- DESIGN NOTE (weak, violates 1NF): tags is a multivalued attribute stored as
    -- an array. A tags table plus a post_tags junction table is the proper design.
    tags TEXT [],
    -- DESIGN NOTE (weak): free-text category can be misspelt and duplicated
    -- ('tech' vs 'Tech'). A categories table with a FK is the proper design.
    category VARCHAR(50),
    views INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_scheduled BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_at TIMESTAMP,
    CONSTRAINT chk_posts_title_not_blank   CHECK (length(btrim(title)) > 0),
    CONSTRAINT chk_posts_views_non_negative CHECK (views >= 0),
    -- a scheduled post must say when it will be published
    CONSTRAINT chk_posts_schedule_has_time CHECK (is_scheduled = FALSE OR scheduled_at IS NOT NULL)
);

CREATE TABLE if not exists likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, post_id)
);

CREATE TABLE if not exists comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments (id) ON DELETE CASCADE,   -- NULL = top-level comment
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_comments_content_not_blank CHECK (length(btrim(content)) > 0),
    CONSTRAINT chk_comments_not_own_parent    CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE TABLE if not exists subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,     -- subscriber
    author_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,   -- author followed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, author_id),
    CONSTRAINT chk_subscriptions_no_self CHECK (user_id <> author_id)
);

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE if not exists admin_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID REFERENCES users (id) ON DELETE CASCADE NOT NULL,
    reason VARCHAR(500) NOT NULL,
    status request_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_admin_requests_reason_not_blank CHECK (length(btrim(reason)) > 0)
);

-- ============================================================
-- 2. INDEXES
-- (primary keys and UNIQUE constraints already create their own indexes:
--  users(email), likes(user_id, post_id), subscriptions(user_id, author_id))
-- ============================================================

-- posts: "your posts" page and author joins
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);

-- posts: home feed (latest / oldest) - only published posts, so a partial index
CREATE INDEX IF NOT EXISTS idx_posts_published_created
    ON posts (created_at DESC) WHERE is_scheduled = FALSE;

-- posts: category filter + sort by latest
CREATE INDEX IF NOT EXISTS idx_posts_category_created
    ON posts (category, created_at DESC) WHERE is_scheduled = FALSE;

-- posts: "Most Popular" sort
CREATE INDEX IF NOT EXISTS idx_posts_published_views
    ON posts (views DESC) WHERE is_scheduled = FALSE;

-- posts: the scheduler looks only for posts still waiting to be published
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at
    ON posts (scheduled_at) WHERE is_scheduled = TRUE;

-- posts: tag containment queries (tags @> ARRAY['x'])
CREATE INDEX IF NOT EXISTS idx_posts_tags_gin ON posts USING GIN (tags);

-- posts: search uses ILIKE '%text%', which a B-tree cannot serve; trigram GIN can
CREATE INDEX IF NOT EXISTS idx_posts_title_trgm       ON posts USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_description_trgm ON posts USING GIN (description gin_trgm_ops);

-- likes: count likes per post / liked-posts page
-- (the UNIQUE (user_id, post_id) index already covers lookups by user_id)
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes (post_id);

-- comments: load all comments of a post in order; reply lookups; per-user lookups
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id    ON comments (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_user_id      ON comments (user_id);

-- subscriptions: find all subscribers of an author (UNIQUE index only leads with user_id)
CREATE INDEX IF NOT EXISTS idx_subscriptions_author_id ON subscriptions (author_id);

-- admin_requests: the admin page lists only pending requests; per-user history
CREATE INDEX IF NOT EXISTS idx_admin_requests_pending
    ON admin_requests (created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_admin_requests_user_id ON admin_requests (user_id);

-- ============================================================
-- 3. TRIGGER: keep updated_at current
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_admin_requests_updated_at
    BEFORE UPDATE ON admin_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. TRIGGER: the platform must always keep at least one admin
--    Blocks (a) demoting the last admin and (b) deleting the last admin.
--    A business rule that CHECK / FK constraints cannot express, because it
--    depends on other rows of the same table.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_last_admin_loss() RETURNS trigger AS $$
BEGIN
    -- Lock the other admin rows so two concurrent transactions that each demote
    -- "the other" admin cannot both succeed and leave zero admins.
    PERFORM 1 FROM users WHERE isadmin = TRUE AND id <> OLD.id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cannot remove the last administrator (user %)', OLD.id
            USING ERRCODE = 'restrict_violation';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_keep_last_admin_update
    BEFORE UPDATE OF isadmin ON users
    FOR EACH ROW
    WHEN (OLD.isadmin = TRUE AND NEW.isadmin = FALSE)
    EXECUTE FUNCTION prevent_last_admin_loss();

CREATE OR REPLACE TRIGGER trg_users_keep_last_admin_delete
    BEFORE DELETE ON users
    FOR EACH ROW
    WHEN (OLD.isadmin = TRUE)
    EXECUTE FUNCTION prevent_last_admin_loss();

-- ============================================================
-- 5. PROPOSED NORMALISED DESIGN  (intentionally commented out)
--    The tables above keep tags, category and otp inside users / posts for
--    simplicity. These tables show the better design that removes those
--    weaknesses; they are not created so the running application is unaffected.
-- ============================================================

-- ---- 5a. categories: replaces the free-text posts.category -------------------
-- CREATE TABLE categories (
--     id   SERIAL PRIMARY KEY,
--     name VARCHAR(50) NOT NULL UNIQUE
-- );
-- ALTER TABLE posts ADD COLUMN category_id INTEGER REFERENCES categories (id);
-- ALTER TABLE posts DROP COLUMN category;

-- ---- 5b. tags + post_tags: replaces the multivalued posts.tags[] (1NF fix) ---
-- CREATE TABLE tags (
--     id   SERIAL PRIMARY KEY,
--     name VARCHAR(50) NOT NULL UNIQUE
-- );
-- CREATE TABLE post_tags (
--     post_id UUID    NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
--     tag_id  INTEGER NOT NULL REFERENCES tags (id)  ON DELETE CASCADE,
--     PRIMARY KEY (post_id, tag_id)
-- );
-- CREATE INDEX idx_post_tags_tag_id ON post_tags (tag_id);   -- "all posts with tag X"
-- ALTER TABLE posts DROP COLUMN tags;

-- ---- 5c. notifications: in-app alerts for subscribers of a new post ----------
-- CREATE TABLE notifications (
--     id         UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
--     user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,   -- recipient
--     post_id    UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
--     is_read    BOOLEAN NOT NULL DEFAULT FALSE,
--     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE (user_id, post_id)
-- );
-- CREATE INDEX idx_notifications_unread
--     ON notifications (user_id, created_at DESC) WHERE is_read = FALSE;

-- ---- 5d. otp_codes: replaces users.otp (history, expiry, attempt limit) ------
-- CREATE TABLE otp_codes (
--     id         UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
--     user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
--     code       INTEGER NOT NULL CHECK (code BETWEEN 100000 AND 999999),
--     expires_at TIMESTAMP NOT NULL,
--     used       BOOLEAN NOT NULL DEFAULT FALSE,
--     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     CHECK (expires_at > created_at)
-- );
-- CREATE INDEX idx_otp_codes_user_active ON otp_codes (user_id, expires_at) WHERE used = FALSE;
-- ALTER TABLE users DROP COLUMN otp;

-- ---- 5e. post_views: replaces the bare posts.views counter (unique viewers) --
-- CREATE TABLE post_views (
--     id        UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
--     post_id   UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
--     user_id   UUID REFERENCES users (id) ON DELETE SET NULL,   -- NULL = anonymous
--     viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE INDEX idx_post_views_post_id ON post_views (post_id);
