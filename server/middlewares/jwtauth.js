import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { queries } from "../queries/queries.js";
import { pool } from "../config/db.js";

export const authenticateToken = (req, res, next) => {
  const token = req.cookies["token"];
  if (token == null)
    return res.status(401).json({
      message: "Unauthorized",
      user: null,
    });

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403).send("Invalid Token");
    req.user = user;
    next();
  });
};

export const authenticateAdminToken = async (req, res, next) => {
  const token = req.cookies["token"];

  if (token == null) {
    console.log("Admin token not found");
    return res.status(401).json({
      message: "Unauthorized",
      user: null,
    });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
    if (err) {
      console.log(err);
      console.log("Invalid token");
      return res.status(403).json({ message: "Invalid Token" });
    }

    try {
      const admin = await pool.query(queries.getUser, [user.dbId]);
      if (!admin.rowCount) {
        console.log("Admin not found");
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!admin.rows[0].isadmin) {
        console.log("User is not an admin");
        return res.status(403).json({ message: "Forbidden" });
      }

      req.admin = admin.rows[0];
      next();
    } catch (dbError) {
      console.error("Database error:", dbError);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  });
};

export const authenticateVerifiedUserToken = async (req, res, next) => {
  const token = req.cookies["token"];

  if (token == null) {
    console.log("Admin token not found");
    return res.status(401).json({
      message: "Unauthorized",
      user: null,
    });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, user) => {
    if (err) {
      console.log(err);
      console.log("Invalid token");
      return res.status(403).json({ message: "Invalid Token" });
    }

    try {
      const verifiedUser = await pool.query(queries.getUser, [user.dbId]);
      if (!verifiedUser.rowCount) {
        console.log("user not found");
        return res.status(401).json({ message: "Unauthorized" });
      }
      if (!verifiedUser.rows[0].is_verified) {
        console.log("user not verified");
        return res.status(401).json({ message: "Unauthorized" });
      }
      req.verifiedUser = verifiedUser.rows[0];
      next();
    } catch (dbError) {
      console.error("Database error:", dbError);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  });
};
