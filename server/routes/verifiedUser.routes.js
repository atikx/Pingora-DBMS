import Router from "express";
import { pool } from "../config/db.js";
import { queries } from "../queries/queries.js";
import { authenticateVerifiedUserToken } from "../middlewares/jwtauth.js";
const router = Router();
import { limitTo10in1, limitTo1in1Day } from "../middlewares/rateLimiters.js";

router.use(authenticateVerifiedUserToken);

router.post("/addComment", limitTo10in1, async (req, res) => {
  const { post_id, content, parent_id } = req.body;
  const { id } = req.verifiedUser;

  try {
    const { rows } = await pool.query(queries.addComment, [
      id,
      post_id,
      parent_id,
      content,
    ]);

    console.log(rows[0]);

    if (rows.length === 0) {
      return res.status(400).json({
        message: "Failed to add comment",
      });
    }

    return res.status(200).json({
      message: "Comment added successfully",
      comment: rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.get("/checkSubscription/:author_id", async (req, res) => {
  const { author_id } = req.params;
  const { id } = req.verifiedUser;

  try {
    const { rows } = await pool.query(queries.checkSubscription, [
      id,
      author_id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "No subscription found",
      });
    }

    return res.status(200).json({
      message: "Subscription exists",
      subscription: rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.post("/addSubscription", limitTo10in1, async (req, res) => {
  const { author_id } = req.body;
  const { id } = req.verifiedUser;

  console.log(author_id, id);

  try {
    const { rows } = await pool.query(queries.addSubscription, [id, author_id]);

    if (rows.length === 0) {
      return res.status(400).json({
        message: "Failed to add subscription",
      });
    }

    return res.status(200).json({
      message: "Subscription added successfully",
      subscription: rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.post("/deleteSubscription", limitTo10in1, async (req, res) => {
  const { author_id } = req.body;
  const { id } = req.verifiedUser;

  try {
    const { rows } = await pool.query(queries.deleteSubscription, [
      id,
      author_id,
    ]);

    if (rows.length === 0) {
      return res.status(400).json({
        message: "Failed to delete subscription",
      });
    }

    return res.status(200).json({
      message: "Subscription deleted successfully",
      subscription: rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.get("/checkLike/:post_id", async (req, res) => {
  const { post_id } = req.params;
  const { id } = req.verifiedUser;

  try {
    const { rows } = await pool.query(queries.checkLike, [id, post_id]);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "No like found",
      });
    }

    return res.status(200).json({
      message: "Like exists",
      like: rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.post("/addLike", limitTo10in1, async (req, res) => {
  const { post_id } = req.body;
  const { id } = req.verifiedUser;

  try {
    const { rows } = await pool.query(queries.addLike, [id, post_id]);

    if (rows.length === 0) {
      return res.status(400).json({
        message: "Failed to add like",
      });
    }

    return res.status(200).json({
      message: "Like added successfully",
      like: rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.post("/deleteLike", limitTo10in1, async (req, res) => {
  const { post_id } = req.body;
  const { id } = req.verifiedUser;

  try {
    const { rows } = await pool.query(queries.deleteLike, [id, post_id]);

    if (rows.length === 0) {
      return res.status(400).json({
        message: "Failed to delete like",
      });
    }

    return res.status(200).json({
      message: "Like deleted successfully",
      like: rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.get(
  "/getLikedPosts",
  authenticateVerifiedUserToken,
  async (req, res) => {
    const { id } = req.verifiedUser;
    try {
      const { rows } = await pool.query(queries.getLikedPosts, [id]);

      if (rows.length === 0) {
        return res.status(404).json({
          message: "No liked posts found",
        });
      }

      return res.status(200).json({
        message: "Liked posts retrieved successfully",
        likedPosts: rows,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

router.get(
  "/getSubscriptions",
  authenticateVerifiedUserToken,
  async (req, res) => {
    const { id } = req.verifiedUser;

    try {
      const { rows } = await pool.query(queries.getSubscriptions, [id]);

      if (rows.length === 0) {
        return res.status(404).json({
          message: "No subscriptions found",
        });
      }

      return res.status(200).json({
        message: "Subscriptions retrieved successfully",
        subscriptions: rows,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  }
);

router.put("/deleteSubscription", limitTo10in1, async (req, res) => {
  const { author_id } = req.body;
  const { id } = req.verifiedUser;

  try {
    const { rows } = await pool.query(queries.deleteSubscription, [
      id,
      author_id,
    ]);

    if (rows.length === 0) {
      return res.status(400).json({
        message: "Failed to delete subscription",
      });
    }

    return res.status(200).json({
      message: "Subscription deleted successfully",
      subscription: rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.post("/createAdminRequest", limitTo1in1Day, async (req, res) => {
  const { reason } = req.body;
  const { id, isadmin } = req.verifiedUser;

  if(reason.length > 502){
    return res.status(400).send("Too long reason")
  }

  if (isadmin) {
    return res.status(403).json({
      message: "You are already an admin",
    });
  }
  try {
    const { rows } = await pool.query(queries.createAdminRequest, [id, reason]);

    if (rows.length === 0) {
      return res.status(400).json({
        message: "Failed to create admin request",
      });
    }

    return res.status(200).json({
      message: "Admin request created successfully",
      request: rows[0],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export default router;
