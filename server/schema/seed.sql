
BEGIN;

-- 1. Delete all existing posts
-- Associated likes and comments are cascade-deleted.
DELETE FROM posts;

-- 2. Insert 50 fresh posts with random thumbnails
WITH image_pool AS (
    SELECT ARRAY[
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
    ]::TEXT[] AS urls
)

INSERT INTO posts (
    user_id,
    title,
    description,
    content,
    image,
    tags,
    category,
    views,
    is_scheduled
)

SELECT
    u.id,

    'Exploring Something New #' || p.post_num || ' - ' || u.name,

    'An interesting post shared by ' || u.name ||
    '. Discover new ideas, insights and experiences.',

    jsonb_build_object(
        'blocks',
        jsonb_build_array(
            jsonb_build_object(
                'type', 'paragraph',
                'data', jsonb_build_object(
                    'text',
                    'Welcome to this post! This is sample content created for demonstration. ' ||
                    'Stay curious, keep learning and explore new possibilities.'
                )
            )
        )
    ),

    -- Random thumbnail
    (imgs.urls)[
        1 + floor(random() * array_length(imgs.urls, 1))::INTEGER
    ],

    ARRAY[
        'technology',
        'learning',
        'community'
    ]::TEXT[],

    CASE
        WHEN p.post_num % 5 = 0 THEN 'Technology'
        WHEN p.post_num % 5 = 1 THEN 'General'
        WHEN p.post_num % 5 = 2 THEN 'Programming'
        WHEN p.post_num % 5 = 3 THEN 'Lifestyle'
        ELSE 'Education'
    END,

    floor(random() * 5000)::INTEGER,

    FALSE

FROM users u
CROSS JOIN generate_series(1, 5) AS p(post_num)
CROSS JOIN image_pool imgs

WHERE u.email IN (
    SELECT i || '@' || i || '.' || i
    FROM generate_series(1, 10) AS i
);

COMMIT;
