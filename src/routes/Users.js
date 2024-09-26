import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import verifyToken from "../middleware/authMiddleware.js";
import { check, validationResult } from "express-validator";
const router = express.Router();

router.get("/me", verifyToken, async (req, res) => {
  const userId = req.userId;

  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "User not found" });
  }
});
router.post(
  "/register",
  [
    check("firstName", "First Name is required").isString(),
    check("lastName", "Last Name is required").isString(),
    check("email", "Email is required").isEmail(),
    check("password", "Password with 6 or more characters required").isLength({
      min: 6,
    }),
    // check("acceptTerms", "You must accept terms and conditions")
    //   .isBoolean()
    //   .equals(true),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array() });
    }
    const { firstName, lastName, email, password, acceptTerms } = req.body;
    try {
      let user = await User.findOne({
        email: req.body.email,
      });
      if (user) {
        return res.status(400).json({ message: "User already exists!" });
      }
      // user = new User({
      //   firstName,
      //   lastName,
      //   email,
      //   password: password,
      // });
      user = new User(req.body);
      await user.save();

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET_KEY, {
        expiresIn: acceptTerms
          ? process.env.JWT_EXPIRATION_LONG
          : process.env.JWT_EXPIRATION_SHORT,
      });

      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: acceptTerms
          ? process.env.JWT_EXPIRATION_LONG_MS
          : process.env.JWT_EXPIRATION_SHORT_MS,
        sameSite: "Strict",
      });
      return res.status(200).send({ message: "User registered successfully" });
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: "Something went wrong!" });
    }
  }
);

export default router;
