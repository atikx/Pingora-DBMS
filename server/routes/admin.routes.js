import { Router } from "express";
import { pool } from "../config/db.js";
import { authenticateAdminToken } from "../middlewares/jwtauth.js";
import { queries } from "../queries/queries.js";
import dotenv from "dotenv";
import { saveImgOnDisk } from "../middlewares/multer.middleware.js";
import { uploadOnCloudinary } from "../functions/imageUploader.js";
import {
  sendAdminApprovedMail,
  sendAdminRejectedMail,
  sendNewPostMail,
} from "../functions/mailer.js";
import { limitTo10in1, limitTo2in1 } from "../middlewares/rateLimiters.js";
import { Filter } from "bad-words";
import { sendDbError } from "../functions/dbErrors.js";

const router = Router();
const filter = new Filter();

router.post(
  "/addPost",
  limitTo2in1,
  authenticateAdminToken,
  saveImgOnDisk.single("image"),
  async (req, res) => {
    const {
      title,
      description,
      content,
      tags,
      category,
      is_scheduled,
      scheduled_at,
    } = req.body;

    if (content.blocks && content.blocks.length == 0) {
      return res.status(400).send("post with no content cant be added");
    }

    const { id, name, avatar } = req.admin;

    const localFilePath = req.file?.path;
    if (!localFilePath) {
      return res.status(400).json({ message: "No banner uploaded" });
    }

    // Upload image to Cloudinary
    const cloudinaryResponse = await uploadOnCloudinary(localFilePath);
    if (!cloudinaryResponse) {
      return res.status(500).json({ message: "Failed to upload image" });
    }

    // Parse tags string to array safely
    let parsedTags = [];
    try {
      parsedTags = JSON.parse(tags);
      if (!Array.isArray(parsedTags)) throw new Error();
    } catch (e) {
      return res.status(400).json({ message: "Invalid tags format" });
    }

    let contentBlocks;
    try {
      const parsedContent = JSON.parse(content);

      // Support full EditorJS object or just blocks array
      contentBlocks = Array.isArray(parsedContent.blocks)
        ? parsedContent.blocks
        : Array.isArray(parsedContent)
        ? parsedContent
        : null;

      if (!Array.isArray(contentBlocks)) {
        return res.status(400).json({ message: "Invalid content format" });
      }

      // Sanitize text using bad-words
      contentBlocks = contentBlocks.map((block) => {
        if (block.type === "paragraph" && block.data?.text) {
          return {
            ...block,
            data: {
              ...block.data,
              text: filter.clean(block.data.text),
            },
          };
        }
        return block;
      });
    } catch (err) {
      return res.status(400).json({ message: "Invalid content JSON" });
    }

    const contentObject = JSON.parse(content);

    contentObject.blocks = contentBlocks;

    const RealContent = JSON.stringify(contentObject);

    // console.log(contentObject);
    // console.log(contentBlocks);
    // return res.status(100).send(contentObject);

    // Convert UTC to IST
    const convertUTCtoIST = (utc) => {
      try {
        const date = new Date(utc);
        const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
        return istDate.toISOString().slice(0, 19);
      } catch {
        return null;
      }
    };

    try {
      if (is_scheduled === "false" || is_scheduled === false) {
        // Insert post immediately
        const { rows } = await pool.query(queries.addPost, [
          id,
          title,
          description,
          RealContent,
          cloudinaryResponse,
          parsedTags,
          category,
        ]);

        if (rows.length === 0) {
          return res.status(400).json({ message: "Failed to add post" });
        }

        // Send success response
        res.status(200).json({
          message: "Post added successfully",
          post: rows[0],
        });

        // Notify subscribers (optional)
        try {
          const { rows: subscribers } = await pool.query(
            queries.getSubscribers,
            [id]
          );
          if (subscribers.length > 0) {
            await sendNewPostMail(
              subscribers.map((sub) => sub.email),
              {
                author_name: name,
                author_avatar: avatar,
                post_link: `${process.env.CLIENT_URL}/post/${rows[0].id}`,
                post_image: cloudinaryResponse,
                post_title: title,
                post_description: description,
                post_created_at: rows[0].created_at,
              }
            );
          }
        } catch (error) {
          console.error("Error notifying subscribers:", error);
        }
      } else if (is_scheduled === "true" || is_scheduled === true) {
        // Scheduled post flow
        const scheduledAtIST = convertUTCtoIST(scheduled_at);
        if (!scheduledAtIST) {
          return res
            .status(400)
            .json({ message: "Invalid scheduled_at format" });
        }

        const { rows } = await pool.query(queries.addScheduledPost, [
          id,
          title,
          description,
          RealContent,
          cloudinaryResponse,
          parsedTags,
          category,
          is_scheduled,
          scheduledAtIST,
        ]);

        if (rows.length === 0) {
          return res
            .status(400)
            .json({ message: "Failed to add scheduled post" });
        }

        res.status(202).json({
          message: "Post Scheduled successfully",
          post: rows[0],
          scheduled_time_ist: scheduledAtIST,
        });
      }
    } catch (error) {
      console.error("Error handling post insertion:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

router.post(
  "/uploadImageForEditor",
  limitTo10in1,
  authenticateAdminToken,
  saveImgOnDisk.single("image"),
  async (req, res) => {
    try {
      const localFilePath = req.file?.path;
      if (!localFilePath) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      // Upload to Cloudinary
      const cloudinaryResponse = await uploadOnCloudinary(localFilePath);
      console.log(cloudinaryResponse);
      if (!cloudinaryResponse) {
        return res.status(500).json({ message: "Failed to upload image" });
      }

      res.status(200).json({
        message: "Image uploaded successfully",
        imageUrl: cloudinaryResponse,
      });
    } catch (error) {
      console.error("Error uploading image for editor:", error);
      return res.status(500).json({
        message: "Internal Server Error",
      });
    }
  }
);

router.get("/getYourPosts", authenticateAdminToken, async (req, res) => {
  try {
    const { rows } = await pool.query(queries.getYourPosts, [req.admin.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "No posts found" });
    }
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put(
  "/deletePost/:postId",
  limitTo2in1,
  authenticateAdminToken,
  async (req, res) => {
    const { postId } = req.params;
    const { id } = req.admin;

    try {
      // Check if the post exists and belongs to the admin
      const { rows: postRows } = await pool.query(queries.getPostById, [
        postId,
      ]);
      if (postRows.length === 0) {
        return res
          .status(404)
          .json({ message: "Post not found or unauthorized" });
      }
      const post = postRows[0];
      // Check if the post is of user
      if (post.user_id !== id) {
        return res.status(403).json({ message: "Fuck off Mother Fucker" });
      }
      // Delete the post
      await pool.query(queries.deletePost, [postId]);
      res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

router.get("/getAdminRequests", authenticateAdminToken, async (req, res) => {
  try {
    const { rows } = await pool.query(queries.getAdminRequests);
    res.status(200).json(rows);
  } catch (error) {
    console.log("error getting admin requests", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// WORKFLOW: review an admin request  (a multi-statement TRANSACTION)
//
//   BEGIN
//     1. SELECT ... FOR UPDATE      lock the pending request (no double review)
//     2. UPDATE admin_requests      status -> approved
//     3. UPDATE users               isadmin -> TRUE
//     4. UPDATE admin_requests      close the user's other pending requests
//   COMMIT   (any error -> ROLLBACK: either ALL changes happen or NONE do)
//
// For the demo, { simulateFailure: true } throws after step 4 so the whole
// transaction is rolled back; the response shows the state seen inside the
// transaction and the state after the rollback.
// ---------------------------------------------------------------------------
class SimulatedFailure extends Error {}

router.put(
  "/approveAdminRequest",
  limitTo10in1,
  authenticateAdminToken,
  async (req, res) => {
    const { id, simulateFailure } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const locked = await client.query(queries.lockPendingAdminRequest, [id]);
      if (locked.rowCount === 0) {
        await client.query("ROLLBACK");
        return res
          .status(409)
          .json({ message: "Request not found or already reviewed" });
      }
      const { user_id } = locked.rows[0];

      await client.query(queries.setAdminRequestStatus, ["approved", id]);
      const promoted = await client.query(queries.promoteUser, [user_id]);
      const closed = await client.query(queries.closeSiblingAdminRequests, [
        user_id,
        id,
      ]);

      if (simulateFailure) {
        const inside = await client.query(queries.getAdminRequestState, [id]);
        throw Object.assign(new SimulatedFailure("Simulated failure"), {
          inside: inside.rows[0],
          changed: { requestsApproved: 1 + closed.rowCount, userPromoted: true },
        });
      }

      await client.query("COMMIT");
      res.status(200).send("Request Approved Successfully");
      const user = promoted.rows[0];
      // e-mail is best-effort: a mail failure must never crash the API or undo the commit
      sendAdminApprovedMail(user.email, user.name).catch((e) =>
        console.error("approval e-mail failed:", e.message)
      );
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      if (error instanceof SimulatedFailure) {
        const after = await pool.query(queries.getAdminRequestState, [id]);
        return res.status(500).json({
          message:
            "Simulated failure after all updates: transaction ROLLED BACK, nothing was saved.",
          rolledBack: true,
          insideTransaction: error.inside,
          afterRollback: after.rows[0],
          statementsUndone: error.changed,
        });
      }
      console.log("error accepting request", error);
      if (sendDbError(res, error)) return;
      res.status(500).json({ message: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

router.put(
  "/rejectAdminRequest",
  limitTo10in1,
  authenticateAdminToken,
  async (req, res) => {
    const { id } = req.body;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query(queries.lockPendingAdminRequest, [id]);
      if (locked.rowCount === 0) {
        await client.query("ROLLBACK");
        return res
          .status(409)
          .json({ message: "Request not found or already reviewed" });
      }
      const { user_id } = locked.rows[0];
      // Rejecting a request never changes the user's existing privileges.
      await client.query(queries.setAdminRequestStatus, ["rejected", id]);
      const user = await client.query(queries.getUserForRequest, [user_id]);
      await client.query("COMMIT");
      res.status(200).send("Request Rejected Successfully");
      sendAdminRejectedMail(user.rows[0].email, user.rows[0].name).catch((e) =>
        console.error("rejection e-mail failed:", e.message)
      );
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      console.log("error rejecting request", error);
      if (sendDbError(res, error)) return;
      res.status(500).json({ message: "Internal server error" });
    } finally {
      client.release();
    }
  }
);

export default router;
