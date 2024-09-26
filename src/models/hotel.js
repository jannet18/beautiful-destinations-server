import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  adultCount: { type: String, required: true },
  childCount: { type: String, required: true },
  checkIn: { type: String, required: true },
  checkOut: { type: String, required: true },
  userId: { type: String, required: true },
  totalCost: { type: String, required: true },
});

const hotelSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, required: true },
  adultCount: { type: String, required: true },
  childCount: { type: String, required: true },
  facilities: [{ type: [String], required: true }],
  pricePerNight: { type: String, required: true },
  starRating: { type: Number, required: true, min: 1, max: 5 },
  imageUrls: [{ type: [String], required: true }],
  lastUpdated: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  bookings: [bookingSchema],
});

const Hotel = mongoose.model("Hotel", hotelSchema);
export default Hotel;
