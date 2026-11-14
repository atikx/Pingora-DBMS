import { pool } from "../config/db.js";
import { queries } from "../queries/queries.js";
import { sendNewPostMail } from "./mailer.js";

export const scheduledPostUploader = async () => {
  const { rows: posts } = await pool.query(queries.ReallyAddScheduledPost);
  if (posts.length > 0) {
    console.log("Uploaded Posts:", posts);
    posts.map(async (post) => {
      const { id, user_id, title, description, image } = post;
      const { rows: user } = await pool.query(queries.getUserInBackendById, [
        user_id,
      ]);

      if (user.length > 0) {
        const { name, avatar } = user[0];
        try {
          const { rows: subscribers } = await pool.query(
            queries.getSubscribers,
            [user_id]
          );
          if (subscribers.length > 0) {
            await sendNewPostMail(
              subscribers.map((sub) => sub.email),
              {
                author_name: name,
                author_avatar: avatar,
                post_link: `${process.env.CLIENT_URL}/post/${id}`,
                post_image: image,
                post_title: title,
                post_description: description,
                post_created_at: new Date().toDateString(),
              }
            );
          }
        } catch (error) {
          console.log("Error in finding subscribers", error);
        }
      }
    });
  }
};
