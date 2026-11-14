
INSERT INTO posts (
    user_id,
    title,
    description,
    content,
    image,
    tags,
    category,
    views
)
SELECT
    u.id,
    'Post ' || p.post_num || ' by ' || u.name,
    'This is sample post ' || p.post_num || ' created by ' || u.name,

    jsonb_build_object(
        'blocks',
        jsonb_build_array(
            jsonb_build_object(
                'type', 'paragraph',
                'data', jsonb_build_object(
                    'text',
                    'This is the content of post ' || p.post_num ||
                    ' written by ' || u.name || '.'
                )
            )
        )
    ),

    -- Random image URL
    (
        ARRAY[
            'https://imgs.search.brave.com/XIT-3jtIAP0K_xLJKCUMAwcLNWwK6BZWHBydtDfvB6Q/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pbWFnZXMudGhlZGlyZWN0LmNvbS9tZWRpYS9hcnRpY2xlX2Z1bGwv/YXZlbmdlcnMtZG9vbXNkYXktcG9zdGVycy1uZXcuanBn',

            'https://imgs.search.brave.com/_3dCmutbZ_9VpNaPE0vuhOSnfNFRGADij7rOzNV9OLg/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pbWFnZXMudGhlZGlyZWN0LmNvbS9tZWRpYS9waG90b3MvZGRkZGRv b29vbW1tXzcyMC5qcGc',

            'https://imgs.search.brave.com/uNXsmgUGLir-2m1yJtabQDqJQcSvZ_I4BG3OV0wRaLE/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pLmViYXlpbWcuY29tL2ltYWdlcy9nL2ZMd0FBT1N3OGZaYXU2aVUvcy1sMTIwMC53ZWJw',

            'https://picsum.photos/seed/pingora1/800/600',
            'https://picsum.photos/seed/pingora2/800/600',
            'https://picsum.photos/seed/pingora3/800/600',
            'https://picsum.photos/seed/pingora4/800/600',
            'https://picsum.photos/seed/pingora5/800/600',
            'https://picsum.photos/seed/pingora6/800/600'
        ]
    )[1 + floor(random() * 9)::INTEGER],

    ARRAY['sample', 'demo', 'post']::TEXT[],

    CASE
        WHEN p.post_num % 3 = 0 THEN 'Technology'
        WHEN p.post_num % 3 = 1 THEN 'General'
        ELSE 'Programming'
    END,

    floor(random() * 1000)::INTEGER

FROM users u
CROSS JOIN generate_series(1, 5) AS p(post_num)
WHERE u.email IN (
    SELECT i || '@' || i || '.' || i
    FROM generate_series(1, 10) AS i
);
