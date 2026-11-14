import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import generalRoutes from "./routes/general.routes.js";
import verifiedUserRoutes from "./routes/verifiedUser.routes.js";
import cron from "node-cron";
import { scheduledPostUploader } from "./functions/scheduledPostUploader.js";
import redis from "./redisClient.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/user", userRoutes);
app.use("/admin", adminRoutes);
app.use("/general", generalRoutes);
app.use("/verifiedUser", verifiedUserRoutes);

app.post("/", async (req, res) => {
  // await redis.set("key", "Hello Atiksh");
  const value = await redis.get("key");
  res.send(`Redis value: ${value}`);
  // res.send(`done`);
});

cron.schedule("* * * * *", () => {
  scheduledPostUploader();
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});
