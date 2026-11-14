-- ============================================================
-- Pingora demo seed  (replaces seed.sql, seed-all.sql, seed-comments.sql, random.sql)
--
--   10 users (all verified admins)     50 posts (5 per user, 7 real categories)
--   500 comments (10 per post, nested up to 3 levels)
--   ~225 likes   50 subscriptions   20 admin requests
--
-- Login for every seeded user:  email  1@1.1 ... 10@10.10   password  password123
--
-- Run after schema.sql.  Safe to re-run: it RESETS the demo data (posts, likes,
-- comments, subscriptions, admin_requests) but never deletes users.
-- WARNING: this wipes any posts you created yourself.
-- Deterministic: setseed() makes random() repeat, so every run gives the same data.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- bcrypt-compatible password hashes

BEGIN;

SELECT setseed(0.42);

-- ------------------------------------------------------------
-- 0. Reset demo data. TRUNCATE ... CASCADE also clears likes and comments
--    (they reference posts). Users are kept.
-- ------------------------------------------------------------
TRUNCATE TABLE posts, subscriptions, admin_requests CASCADE;

-- ------------------------------------------------------------
-- 1. Users: 10 verified admins. Upsert so existing rows are reused.
-- ------------------------------------------------------------
INSERT INTO users (email, name, password, isadmin, is_verified, avatar, created_at, updated_at)
SELECT
    n || '@' || n || '.' || n,
    (ARRAY['Aarav Sharma','Diya Patel','Rohan Mehta','Ananya Iyer','Kabir Singh',
           'Meera Nair','Arjun Reddy','Isha Gupta','Vikram Rao','Sneha Kulkarni'])[n],
    crypt('password123', gen_salt('bf', 10)),
    TRUE,
    TRUE,
    'https://i.pravatar.cc/150?img=' || n,
    NOW() - ((120 - n * 3) || ' days')::INTERVAL,
    NOW() - ((120 - n * 3) || ' days')::INTERVAL
FROM generate_series(1, 10) AS n
ON CONFLICT (email) DO UPDATE
SET name        = EXCLUDED.name,
    password    = EXCLUDED.password,
    isadmin     = TRUE,
    is_verified = TRUE,
    avatar      = EXCLUDED.avatar;

-- Helper: stable 1..10 numbering of the seeded users (1@1.1 = 1 ... 10@10.10 = 10)
CREATE TEMP TABLE seed_users ON COMMIT DROP AS
SELECT split_part(email, '@', 1)::INTEGER AS num, id, name
FROM users
WHERE email IN (SELECT n || '@' || n || '.' || n FROM generate_series(1, 10) AS n);

-- ------------------------------------------------------------
-- 2. Posts: 50 = 5 per user. Categories match the navbar, so every
--    category page has posts.
-- ------------------------------------------------------------
CREATE TEMP TABLE seed_categories (idx INTEGER, name TEXT, tags TEXT[]) ON COMMIT DROP;
INSERT INTO seed_categories VALUES
  (1, 'Technology',     ARRAY['tech','innovation','software']),
  (2, 'Business',       ARRAY['business','startups','finance']),
  (3, 'Sports',         ARRAY['sports','fitness','matchday']),
  (4, 'Entertainment',  ARRAY['movies','music','culture']),
  (5, 'Science',        ARRAY['science','research','discovery']),
  (6, 'Health',         ARRAY['health','wellness','lifestyle']),
  (7, 'Current Affairs',ARRAY['news','policy','world']);

CREATE TEMP TABLE seed_titles (category TEXT, slot INTEGER, title TEXT) ON COMMIT DROP;
INSERT INTO seed_titles VALUES
  ('Technology',1,'How Open-Source Is Reshaping Modern Software Teams'),
  ('Technology',2,'A Beginner''s Guide to Containers and Docker Compose'),
  ('Technology',3,'Why Database Indexes Matter More Than You Think'),
  ('Technology',4,'Edge Computing: Bringing Servers Closer to Users'),
  ('Technology',5,'The Quiet Rise of Local-First Applications'),
  ('Technology',6,'Rust or Go? Choosing a Language for Backend Services'),
  ('Technology',7,'Passwordless Login and the Future of Authentication'),
  ('Technology',8,'Making Sense of Vector Databases'),
  ('Business',1,'Lessons From Bootstrapping a Startup in Year One'),
  ('Business',2,'Understanding Cash Flow Before You Scale'),
  ('Business',3,'Remote Teams: What Actually Improves Productivity'),
  ('Business',4,'Pricing Strategies That Respect Your Customers'),
  ('Business',5,'The Hidden Costs of Moving Too Fast'),
  ('Business',6,'How Small Shops Compete With Online Marketplaces'),
  ('Business',7,'A Practical Introduction to Unit Economics'),
  ('Business',8,'Building a Brand People Actually Trust'),
  ('Sports',1,'Inside the Data Revolution in Modern Cricket'),
  ('Sports',2,'Why Recovery Is the Most Underrated Part of Training'),
  ('Sports',3,'Grassroots Football and the Next Generation'),
  ('Sports',4,'Marathon Training for First-Time Runners'),
  ('Sports',5,'How Analytics Changed the Way Teams Draft Players'),
  ('Sports',6,'The Psychology of Penalty Shootouts'),
  ('Sports',7,'Campus Leagues That Deserve More Attention'),
  ('Sports',8,'Badminton Footwork Drills You Can Do at Home'),
  ('Entertainment',1,'Why Slow-Burn Thrillers Are Having a Moment'),
  ('Entertainment',2,'The Return of the Album in a Streaming World'),
  ('Entertainment',3,'Independent Cinema Finds a New Audience Online'),
  ('Entertainment',4,'What Video Game Soundtracks Teach Us About Mood'),
  ('Entertainment',5,'Stand-Up Comedy and the Art of the Callback'),
  ('Entertainment',6,'Adaptations: When Books Meet the Screen'),
  ('Entertainment',7,'Behind the Scenes of a Student Film Festival'),
  ('Entertainment',8,'How Podcasts Became the New Radio'),
  ('Science',1,'What the Latest Exoplanet Findings Really Mean'),
  ('Science',2,'CRISPR Explained Without the Jargon'),
  ('Science',3,'Why Sleep Research Keeps Surprising Scientists'),
  ('Science',4,'Citizen Science: Everyday People Doing Real Research'),
  ('Science',5,'The Physics Behind Everyday Magnets'),
  ('Science',6,'Ocean Microplastics: Where the Evidence Stands'),
  ('Science',7,'How Peer Review Works and Where It Struggles'),
  ('Science',8,'A Short Tour of Quantum Computing Ideas'),
  ('Health',1,'Small Habits That Improve Long-Term Wellbeing'),
  ('Health',2,'Understanding Stress and How Your Body Responds'),
  ('Health',3,'Nutrition Myths That Refuse to Go Away'),
  ('Health',4,'Mental Health Support on Campus: What Exists'),
  ('Health',5,'Walking: The Simplest Exercise You Are Ignoring'),
  ('Health',6,'How to Build a Realistic Sleep Routine'),
  ('Health',7,'Reading Food Labels Without a Degree in Chemistry'),
  ('Health',8,'Desk Posture and Pain: A Practical Guide'),
  ('Current Affairs',1,'How Local Elections Shape Daily Life'),
  ('Current Affairs',2,'Explainer: What a Budget Really Decides'),
  ('Current Affairs',3,'Climate Policy and the Cities Leading the Way'),
  ('Current Affairs',4,'Misinformation Online and How to Spot It'),
  ('Current Affairs',5,'The Debate Over Data Privacy Laws'),
  ('Current Affairs',6,'Public Transport Reform: Who Benefits'),
  ('Current Affairs',7,'Understanding Trade Agreements in Plain Language'),
  ('Current Affairs',8,'Why Youth Participation in Civic Life Matters');

INSERT INTO posts (user_id, title, description, content, image, tags, category,
                   views, created_at, updated_at, is_scheduled)
SELECT
    u.id,
    t.title,
    'A closer look at ' || lower(t.title) || '. Shared by ' || u.name || '.',
    jsonb_build_object('blocks', jsonb_build_array(
        jsonb_build_object('type', 'header',
            'data', jsonb_build_object('text', t.title, 'level', 2)),
        jsonb_build_object('type', 'paragraph',
            'data', jsonb_build_object('text',
                'This post explores ' || lower(t.title) || '. It is demonstration content ' ||
                'written for the Pingora DBMS project, but the structure is the same as a real article.')),
        jsonb_build_object('type', 'paragraph',
            'data', jsonb_build_object('text',
                'Keep reading, join the discussion in the comments and subscribe to ' ||
                u.name || ' for more.'))
    )),
    (ARRAY[
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=450&fit=crop',
        'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=450&fit=crop',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=450&fit=crop',
        'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=450&fit=crop',
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop',
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=450&fit=crop',
        'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800&h=450&fit=crop',
        'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=450&fit=crop',
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=450&fit=crop',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=450&fit=crop'
    ])[1 + (p.n % 10)],
    c.tags,
    c.name,
    floor(power(random(), 2) * 5000)::INTEGER,               -- skewed: few popular posts
    p.created_at,
    p.created_at,
    FALSE
FROM (
    -- post number n: author = n mod 10, category = n mod 7; spread over the last 60 days
    SELECT n,
           ((n - 1) % 10) + 1 AS user_num,
           ((n - 1) % 7)  + 1 AS cat_idx,
           ((n - 1) / 7)  + 1 AS slot,
           NOW() - INTERVAL '2 days' - random() * INTERVAL '58 days' AS created_at
    FROM generate_series(1, 50) AS n
) p
JOIN seed_users      u ON u.num = p.user_num
JOIN seed_categories c ON c.idx = p.cat_idx
JOIN seed_titles     t ON t.category = c.name AND t.slot = p.slot;

-- Stable 1..50 numbering of posts (oldest first)
CREATE TEMP TABLE seed_posts ON COMMIT DROP AS
SELECT id, created_at, ROW_NUMBER() OVER (ORDER BY created_at, id) AS num
FROM posts;

-- ------------------------------------------------------------
-- 3. Comments: 10 per post (= 500), nested three levels deep:
--      k = 1..4   top-level comments
--      k = 5..8   replies to comments 1..4            (depth 1)
--      k = 9, 10  replies to replies 5 and 6          (depth 2)
--    Replier and parent are always different users.
-- ------------------------------------------------------------
DO $$
DECLARE
    p        RECORD;
    ids      UUID[];
    top_txt  TEXT[] := ARRAY[
        'Great read! This made me look at the topic differently.',
        'I would love to see a follow-up with some concrete examples.',
        'Well explained. Sharing this with my study group.',
        'Interesting perspective, though I am not fully convinced yet.',
        'Bookmarked. The section on the basics was especially clear.',
        'This is exactly what I was searching for last week.',
        'Thanks for writing this up so clearly.',
        'Curious how this holds up at larger scale?'];
    rep_txt  TEXT[] := ARRAY[
        'Agreed, the examples would make it even better.',
        'Fair point. I had the same doubt at first.',
        'Glad it helped! More posts like this are coming.',
        'Thanks for the feedback, I will add that.',
        'Good question - it depends on the use case.',
        'Same experience here, it worked for me too.',
        'Exactly what I was thinking.',
        'Appreciate the thoughtful response.'];
    deep_txt TEXT[] := ARRAY[
        'Well said, that settles it for me.',
        'Thanks, that clears things up.',
        'Let us continue this over a coffee!',
        'Noted, I will try that approach.'];
    k        INTEGER;
    parent_k INTEGER;
    author   UUID;
    txt      TEXT;
    ts       TIMESTAMP;
    new_id   UUID;
BEGIN
    FOR p IN SELECT * FROM seed_posts ORDER BY num LOOP
        ids := ARRAY[]::UUID[];
        FOR k IN 1..10 LOOP
            parent_k := CASE WHEN k BETWEEN 5 AND 8 THEN k - 4
                             WHEN k IN (9, 10)       THEN k - 4
                             ELSE NULL END;
            SELECT id INTO author FROM seed_users WHERE num = ((p.num * 3 + k * 7) % 10) + 1;
            txt := CASE WHEN k <= 4 THEN top_txt[1 + ((p.num + k) % 8)]
                        WHEN k <= 8 THEN rep_txt[1 + ((p.num + k) % 8)]
                        ELSE             deep_txt[1 + ((p.num + k) % 4)] END;
            ts  := p.created_at + (k * INTERVAL '41 minutes') + random() * INTERVAL '20 minutes';

            INSERT INTO comments (user_id, post_id, parent_id, content, created_at, updated_at)
            VALUES (author, p.id,
                    CASE WHEN parent_k IS NULL THEN NULL ELSE ids[parent_k] END,
                    txt, ts, ts)
            RETURNING id INTO new_id;
            ids[k] := new_id;
        END LOOP;
    END LOOP;
END $$;

-- ------------------------------------------------------------
-- 4. Likes: each user likes roughly 45 % of posts (~225 rows).
--    A like is dated after the post was published.
-- ------------------------------------------------------------
INSERT INTO likes (user_id, post_id, created_at)
SELECT u.id, p.id, p.created_at + random() * INTERVAL '2 days'
FROM seed_users u
CROSS JOIN seed_posts p
WHERE random() < 0.45
ON CONFLICT (user_id, post_id) DO NOTHING;

-- ------------------------------------------------------------
-- 5. Subscriptions: each user follows the next 5 users in a ring (50 rows).
--    Never self-follows, which the CHECK constraint would reject anyway.
-- ------------------------------------------------------------
INSERT INTO subscriptions (user_id, author_id, created_at)
SELECT u.id, a.id, NOW() - random() * INTERVAL '90 days'
FROM seed_users u
CROSS JOIN generate_series(1, 5) AS s(step)
JOIN seed_users a ON a.num = ((u.num - 1 + s.step) % 10) + 1
WHERE u.id <> a.id
ON CONFLICT (user_id, author_id) DO NOTHING;

-- ------------------------------------------------------------
-- 6. Admin requests: 2 per user (20 rows) with all three statuses.
--    Every user is already an admin, so these exist to populate the admin
--    approval page and the admin_request_overview view.
-- ------------------------------------------------------------
INSERT INTO admin_requests (user_id, reason, status, created_at, updated_at)
SELECT
    u.id,
    (ARRAY[
        'I want to help moderate comments and keep discussions respectful.',
        'I publish regularly and would like to manage scheduled posts.',
        'I can review reported content and support new authors.',
        'I would like to help curate featured posts for the community.',
        'I have moderation experience from another community platform.'
    ])[1 + ((u.num + r.req) % 5)],
    (ARRAY['pending','approved','rejected'])[1 + ((u.num + r.req) % 3)]::request_status,
    NOW() - ((r.req * 9 + u.num) || ' days')::INTERVAL,
    NOW() - ((r.req * 9 + u.num) || ' days')::INTERVAL
FROM seed_users u
CROSS JOIN generate_series(1, 2) AS r(req);

COMMIT;

-- Quick check
SELECT 'users' AS tbl, COUNT(*) FROM users
UNION ALL SELECT 'posts',          COUNT(*) FROM posts
UNION ALL SELECT 'comments',       COUNT(*) FROM comments
UNION ALL SELECT 'likes',          COUNT(*) FROM likes
UNION ALL SELECT 'subscriptions',  COUNT(*) FROM subscriptions
UNION ALL SELECT 'admin_requests', COUNT(*) FROM admin_requests;
