import { Router } from "express";
import { pool } from "../config/db.js";
// import serviceAccount from "../config/fire-base.json" assert { type: "json" };
import admin from "firebase-admin";
import { queries } from "../queries/queries.js";
import { generateToken } from "../functions/tokengenerator.js";
import { authenticateToken } from "../middlewares/jwtauth.js";
import bcrypt from "bcrypt";
import { sendOtpMail } from "../functions/mailer.js";
import { sendRequestMailForAdminToMe } from "../functions/mailer.js";
import { saveImgOnDisk } from "../middlewares/multer.middleware.js";
import { uploadOnCloudinary } from "../functions/imageUploader.js";
import { limitTo10in1 } from "../middlewares/rateLimiters.js";
import { limitTo2in1 } from "../middlewares/rateLimiters.js";

admin.initializeApp({
  // credential: admin.credential.cert(serviceAccount),
});

const router = Router();

router.post("/auth",limitTo10in1, async (req, res) => {
  try {
    if (!req.body.token) {
      console.log(req.body);
      const alreadyRegistered = await pool.query(queries.checkUser, [
        req.body.email,
      ]);
      if (alreadyRegistered.rowCount) {
        const isMatch = await bcrypt.compare(
          req.body.password,
          alreadyRegistered.rows[0].password
        );
        if (isMatch) {
          res.cookie("token", generateToken(alreadyRegistered.rows[0]), {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          });
          return res.status(200).json({
            message: "Logged In Successfully",
            user: alreadyRegistered.rows[0],
          });
        } else {
          res.status(420).send("invalid password");
        }
      } else {
        if(!req.body.email || !req.body.password){
          return res.status(400).send("Empty inputs")
        }
        const hashedPassword = await bcrypt.hash(req.body.password.trim(), 10);
        const newUser = await pool.query(queries.createUserWithPassword, [
          req.body.email.trim(),
          hashedPassword,
        ]);
        res.cookie("token", generateToken(newUser.rows[0]), {
          httpOnly: true,
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        const otp = Math.floor(100000 + Math.random() * 900000);

        await pool.query(queries.createOtp, [otp, newUser.rows[0].email]);
        await sendOtpMail(newUser.rows[0].email, otp);
        return res.status(201).json({
          message: "Registered Successfully",
          user: newUser.rows[0],
        });
      }
    } else {
      const user = await admin.auth().verifyIdToken(req.body.token);
      const alreadyRegistered = await pool.query(queries.checkUser, [
        user.email,
      ]);
      if (alreadyRegistered.rowCount) {
        res.cookie("token", generateToken(alreadyRegistered.rows[0]), {
          httpOnly: true,
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.status(200).json({
          message: "Logged In Successfully",
          user: alreadyRegistered.rows[0],
        });
      } else {
        const newUser = await pool.query(queries.createUser, [
          user.email,
          user.name,
          true,
        ]);
        res.cookie("token", generateToken(newUser.rows[0]), {
          httpOnly: true,
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.status(200).json({
          message: "Registered Successfully",
          user: newUser.rows[0],
        });
      }
    }
  } catch (error) {
    console.error("Error in /auth route:", error);
    res.status(500).send("Internal server error");
  }
});

router.get("/getUser", authenticateToken, async (req, res) => {
  try {
    const user = await pool.query(queries.getUser, [req.user.dbId]);
    if (user.rowCount) {
      return res.status(200).json({
        message: "User is logged in",
        user: user.rows[0],
      });
    } else {
      return res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    console.error("Error in /checkUser route:", error);
    res.status(500).send("Internal server error");
  }
});

router.post("/logout",limitTo10in1, authenticateToken, async (req, res) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in /logout route:", error);
    res.status(500).send("Internal server error");
  }
});

router.post("/verifyOtp",limitTo2in1, authenticateToken, async (req, res) => {
  try {
    const otp = parseInt(req.body.pin);
    const user = await pool.query(queries.getUserInBackendById, [
      req.user.dbId,
    ]);
    if (user.rowCount) {
      if (user.rows[0].otp === otp) {
        const created = await pool.query(queries.makeVerified, [
          user.rows[0].email,
        ]);
        return res.status(200).json({
          message: "OTP verified successfully",
          user: created.rows[0],
        });
      } else {
        return res.status(420).json({ message: "Invalid OTP" });
      }
    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error in /verifyOtp route:", error);
    res.status(500).send("Internal server error");
  }
});

router.put("/updateProfile",limitTo2in1, authenticateToken, async (req, res) => {
  try {
    const { newName, newPassword } = req.body;
    if (!newName.trim() && !newPassword.trim()) {
      return res.status(400).json({ message: "No data to update" });
    }
    const user = await pool.query(queries.getUserInBackendById, [
      req.user.dbId,
    ]);
    const hashedPassword = newPassword
      ? await bcrypt.hash(newPassword, 10)
      : user.rows[0].password;
    const updatedUser = await pool.query(queries.updateProfile, [
      newName ? newName : user.rows[0].name,
      hashedPassword,
      req.user.dbId,
    ]);
    console.log(updatedUser.rows[0]);
    res.status(200).json({
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error in /updateProfile route:", error);
    res.status(500).send("Internal server error");
  }
});

router.post("/verifyEmail",limitTo2in1, authenticateToken, async (req, res) => {
  try {
    const user = await pool.query(queries.getUserInBackendById, [
      req.user.dbId,
    ]);
    if (user.rowCount) {
      const otp = Math.floor(100000 + Math.random() * 900000);
      await pool.query(queries.createOtp, [otp, user.rows[0].email]);
      await sendOtpMail(user.rows[0].email, otp);
      return res.status(200).json({
        message: "OTP sent to your email",
      });
    } else {
      return res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Error in /verifyEmail route:", error);
    res.status(500).send("Internal server error");
  }
});



router.post(
  "/updateAvatar",
  limitTo2in1,
  authenticateToken,
  saveImgOnDisk.single("image"),
  async (req, res) => {
    try {
      const user = await pool.query(queries.getUserInBackendById, [
        req.user.dbId,
      ]);
      const localFilePath = req.file?.path;

      if (!localFilePath) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const cloudinaryResponse = await uploadOnCloudinary(localFilePath);
      console.log(cloudinaryResponse);
      if (!cloudinaryResponse) {
        return res.status(500).json({ message: "Failed to upload image" });
      }
      const updatedUser = await pool.query(queries.updateAvatar, [
        cloudinaryResponse,
        req.user.dbId,
      ]);
      if (updatedUser.rowCount) {
        res.status(200).json({
          message: "Avatar updated successfully",
          imageUrl: cloudinaryResponse,
        });
      } else {
        res.status(500).json({ message: "Failed to update avatar" });
      }
    } catch (error) {
      console.error("Error in /saveImg route:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
