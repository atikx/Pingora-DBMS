import Router from "express";
import { pool } from "../config/db.js";
import { queries } from "../queries/queries.js";
import { limitTo10in1 } from "../middlewares/rateLimiters.js";
import redis from "../redisClient.js";

const router = Router();

// router.get("/getAllPosts",limitTo10in1, async (req, res) => {
//   try {
//     const { filter = "Latest", page = 1, limit = 8 } = req.query;
//     const offset = (page - 1) * parseInt(limit);

//     // Validate filter value
//     const validFilters = ["Latest", "Oldest", "Most Popular"];
//     const selectedFilter = validFilters.includes(filter) ? filter : "Latest";

//     // Build the complete query
//     const baseQuery = queries.getAllPosts;
//     const filterQuery = queries.getFilteredPosts[selectedFilter];
//     const fullQuery = `${baseQuery} ${filterQuery}`;

//     // Get posts with pagination and filtering
//     const { rows: posts } = await pool.query(fullQuery, [
//       parseInt(limit),
//       offset,
//     ]);

//     // Get total count for pagination
//     const countResult = await pool.query(queries.getPostsCount);
//     const totalCount = parseInt(countResult.rows[0].count);
//     const totalPages = Math.ceil(totalCount / limit);

//     // Return posts with pagination metadata

//     res.status(200).json({
//       posts,
//       pagination: {
//         currentPage: parseInt(page),
//         totalPages,
//         totalPosts: totalCount,
//         postsPerPage: parseInt(limit),
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching posts:", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// });

router.get("/getAllPosts", limitTo10in1, async (req, res) => {
  try {
    const { filter = "Latest", page = 1, limit = 8 } = req.query;
    const offset = (page - 1) * parseInt(limit);

    const validFilters = ["Latest", "Oldest", "Most Popular"];
    const selectedFilter = validFilters.includes(filter) ? filter : "Latest";

    const cacheKey = `getAllPosts:${selectedFilter}:${page}:${limit}`;

    // 🔍 Check Redis cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log("cache hit");
      return res.status(200).json(JSON.parse(cachedData));
    }

    const baseQuery = queries.getAllPosts;
    const filterQuery = queries.getFilteredPosts[selectedFilter];
    const fullQuery = `${baseQuery} ${filterQuery}`;

    const { rows: posts } = await pool.query(fullQuery, [
      parseInt(limit),
      offset,
    ]);

    const countResult = await pool.query(queries.getPostsCount);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    const response = {
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPosts: totalCount,
        postsPerPage: parseInt(limit),
      },
    };

    // 💾 Cache in Redis for 60 seconds
    await redis.set(cacheKey, JSON.stringify(response), {
      EX: 60,
    });
    console.log("cache miss");
    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/getPost/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    // Get post by ID
    const { rows: post } = await pool.query(queries.getPostById, [id]);

    // Check if post exists
    if (post.length === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Return the post
    await pool.query(queries.increasePostViews, [id]);
    res.status(200).json(post[0]);
  } catch (error) {
    console.error("Error fetching post:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});
router.get("/filter", limitTo10in1, async (req, res) => {
  try {
    const { category, sort = "Latest" } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const { rows: countResult } = await pool.query(
      queries.getFilteredPostsCount,
      [category]
    );
    const totalCount = parseInt(countResult[0].count);

    // Validate sort parameter
    const validSortOptions = Object.keys(queries.getFilteredPostsSorting);
    const sortOption = validSortOptions.includes(sort) ? sort : "Latest";

    // Get paginated and sorted posts
    const { rows: posts } = await pool.query(
      queries.filterPostByCategory +
        " " +
        queries.getFilteredPostsSorting[sortOption],
      [category, limit, offset]
    );

    if (posts.length === 0 && page === 1) {
      return res
        .status(404)
        .json({ message: "No posts found in this category" });
    }

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      posts,
      pagination: {
        totalPages,
        currentPage: page,
        totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/searchPost", async (req, res) => {
  try {
    const { search, page = 1, limit = 8, sort = "Latest" } = req.query;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const countResult = await pool.query(queries.searchPostCount, [
      `%${search}%`,
    ]);

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get sorted and paginated results
    const sortQuery =
      queries.getSearchPostsSorting[sort] ||
      queries.getSearchPostsSorting.Latest;

    const query = `${queries.searchPostWithPagination} ${sortQuery}`;

    const { rows: posts } = await pool.query(query, [
      `%${search}%`,
      limit,
      offset,
    ]);

    if (posts.length === 0 && page === 1) {
      return res.status(404).json({
        message: "No posts found",
        posts: [],
        pagination: {
          totalPages: 0,
          currentPage: 1,
          totalCount: 0,
        },
      });
    }

    res.status(200).json({
      posts,
      pagination: {
        totalPages,
        currentPage: parseInt(page),
        totalCount,
      },
    });
  } catch (error) {
    console.error("Error searching posts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/getComments/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Invalid post ID" });
    }

    const { rows: comments } = await pool.query(queries.getCommentsByPostId, [
      id,
    ]);

    // Check if comments exist
    if (comments.length === 0) {
      return res.status(404).json({ message: "No comments found" });
    }

    // Return the comments
    res.status(200).json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
