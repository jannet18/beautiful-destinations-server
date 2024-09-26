import express from "express";
import { check, validationResult } from "express-validator";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import verifyToken from "../middleware/authMiddleware.js";
const router = express.Router();

router.post(
  "/login",
  [
    check("email", "Email is required").isEmail(),
    check("password", "Password with 6 or more characters required").isLength({
      min: 6,
    }),
    check("remember_me", "Remember Me must be checked").isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array() });
    }
    const { email, password, remember_me } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        res.status(400).json({ message: "Invalid Credentials" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(400).json({ message: "Invalid Credentials" });
      }
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, {
        expiresIn: remember_me
          ? process.env.JWT_EXPIRATION_LONG
          : process.env.JWT_EXPIRATION_SHORT,
      });
      // console.log(token);
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: remember_me
          ? process.env.JWT_EXPIRATION_LONG_MS
          : JWT_EXPIRATION_SHORT_MS,
      });
      res.status(200).json({ userId: user._id });
    } catch (error) {
      res.status(500).json({ message: "Something went wrong!" });
    }
  }
);

router.get("/validate-token", verifyToken, (req, res) => {
  res.status(200).send({ userId: req.userId });
});

router.post("/logout", (req, res) => {
  res.cookie("auth_token", "", {
    expires: new Date(0),
  });
  res.send();
});
export default router;
