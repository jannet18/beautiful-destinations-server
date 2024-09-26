import express from "express";
import Hotel from "../models/Hotel.js";
import { param, validationResult } from "express-validator";
import Stripe from "stripe";
import verifyToken from "../middleware/authMiddleware.js";

const stripe = new Stripe(process.env.STRIPE_API_KEY);

const router = express.Router();

router.get("/search", async (req, res) => {
  try {
    const query = constructSearchQuery(req.query);

    let sortOptions = {};

    switch (req.query.sortOption) {
      case "starRating":
        sortOptions = { starRating: -1 };
        break;
      case "pricePerNightAsc":
        sortOptions = { pricePerNight: 1 };
        break;
      case "pricePerNightDesc":
        sortOptions = { pricePerNight: -1 };
        break;
    }
    const pageSize = 5;
    const pageNumber = parseInt(
      req.query.page ? req.query.page.toString() : "1"
    );
    const skip = parseInt(pageNumber - 1) * pageSize;

    const hotels = await Hotel.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize);

    const total = await Hotel.countDocuments(query);

    const response = {
      data: hotels,
      pagination: {
        total,
        page: pageNumber,
        pages: Math.ceil(total / pageSize),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("error", error);
    res.status(500).json({ message: "Something went wrong!" });
  }
});

router.get(
  "/:id",
  [param("id").notEmpty().withMessage("Hotel ID is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const id = req.params.id.toString();
    try {
      const hotel = await Hotel.findById(id);
      res.json(hotel);
    } catch (error) {
      res.status(500).json({ message: "Error fetching hotel!" });
    }
  }
);

router.post("/:hotelId/bookings", verifyToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent) {
      return res.status(400).json({ message: "Payment intend not found" });
    }

    if (
      paymentIntent.metadata.hotelId !== req.params.hotelId ||
      paymentIntent.metadata.userId !== req.userId
    ) {
      return res.status(400).json({ message: "Payment intent mismatch" });
    }

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({
        message: `Payment intend not succeeded. Status: ${paymentIntent.status}`,
      });
    }

    const newBooking = {
      ...req.body,
      userId: req.userId,
    };

    const hotel = await Hotel.findOneAndUpdate(
      { _id: req.params.hotelId },
      {
        $push: { bookings: newBooking },
      }
    );

    if (!hotel) {
      res.status(400).json({ message: "Hotel not found" });
    }

    await hotel.save();
    res.status(200).send();
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.post(
  "/:hotelId/bookings/payment-intent",
  verifyToken,
  async (req, res) => {
    // 1. total cost total nights * amount
    // 2. hotelId
    // 3. userId
    // console.log("Request body:", req.body);
    // console.log("Request params:", req.params);
    const { numberOfNights } = req.body;
    const hotelId = req.params.hotelId;
    const hotel = await Hotel.findById(hotelId);

    if (!hotel) {
      return res.status(400).json({ message: "Hotel not found" });
    }

    const totalCost = hotel.pricePerNight * numberOfNights;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCost * 100,
      currency: "KES",
      metadata: {
        hotelId,
        userId: req.userId,
      },
    });
    if (!paymentIntent.client_secret) {
      return res.status(500).json({ message: "Error creating payment intent" });
    }

    const response = {
      paymentIntentId: paymentIntent.id,
      client_secret: paymentIntent.client_secret.toString(),
      totalCost,
    };
    // console.log("Response:", response);
    res.send(response);
  }
);

const constructSearchQuery = (queryParams) => {
  let constructedQuery = {};
  try {
    if (
      (queryParams?.destination &&
        typeof queryParams.destination === "string") ||
      ("object" && queryParams.destination.trim() !== "")
    ) {
      const destinationRegex = new RegExp(queryParams.destination, "i");

      constructedQuery.$or = [
        // { city: new RegExp(queryParams?.destination, "i") },
        // { country: new RegExp(queryParams?.destination, "i") },
        { city: destinationRegex },
        { country: destinationRegex },
      ];
    }

    if (queryParams.adultCount) {
      constructedQuery.adultCount = {
        $gte: parseInt(queryParams.adultCount),
      };
    }

    if (queryParams.childCount) {
      constructedQuery.childCount = {
        $gte: parseInt(queryParams.childCount),
      };
    }

    if (queryParams.facilities) {
      constructedQuery.facilities = {
        $all: Array.isArray(queryParams.facilities)
          ? queryParams.facilities
          : [queryParams.facilities],
      };
    }

    if (queryParams.types) {
      constructedQuery.type = {
        $in: Array.isArray(queryParams.types)
          ? queryParams.types
          : [queryParams.types],
      };
    }

    if (queryParams.stars) {
      const starRatings = Array.isArray(queryParams.stars)
        ? queryParams.stars.map((star) => parseInt(star))
        : parseInt(queryParams.stars);

      constructedQuery.starRating = { $in: starRatings };
    }

    if (queryParams.maxPrice) {
      constructedQuery.pricePerNight = {
        $lte: parseInt(queryParams.maxPrice).toString(),
      };
    }
    return constructedQuery;
  } catch (error) {
    res.status(500).json({ message: "Query not available" });
  }
};
export default router;
