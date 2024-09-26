import express from "express";
import multer from "multer";
import cloudinary from "cloudinary";
import verifyToken from "../middleware/authMiddleware.js";
import { body, validationResult } from "express-validator";
import Hotel from "../models/Hotel.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
// api/my-hotels

// router.post(
//   "/",
//   verifyToken,
//   [
//     body("name").notEmpty().withMessage("Name is required"),
//     body("city").notEmpty().withMessage("City is required"),
//     body("country").notEmpty().withMessage("Country is required"),
//     body("description").notEmpty().withMessage("Description is required"),
//     body("type").notEmpty().withMessage("Hotel type is required"),
//     body("pricePerNight")
//       .notEmpty()
//       .isNumeric()
//       .withMessage("Price per night is required and must be a number"),
//     body("facilities")
//       .notEmpty()
//       .isArray()
//       .withMessage("Facilities are required"),
//   ],
//   upload.array("imageFiles", 6),
//   async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }
//     try {
//       const imageFiles = req.files;
//       const newHotel = req.body;
//       // const {
//       //   name,
//       //   city,
//       //   country,
//       //   description,
//       //   type,
//       //   pricePerNight,
//       //   facilities,
//       //   starRating,
//       //   adultCount,
//       //   childCount,
//       // } = req.body;

//       // if (!imageFiles || imageFiles.length === 0) {
//       //   return res.status(400).json({ message: "No images uploaded!" });
//       // }
//       // 1.upload images to cloudinary
//       const uploadPromises = imageFiles?.map(async (image) => {
//         const b64 = Buffer.from(image.buffer).toString("base64");
//         let dataURI = "data:" + image.mimetype + ";base64," + b64;
//         // const dataURI = `data:${image.mimetype};base64, ${b64}`;
//         const res = await cloudinary.v2.uploader.upload(dataURI);
//         return res.url;
//       });

//       const imageUrls = await Promise?.all(uploadPromises);
//       // 2. if uplaod was successful, add the urls to the new hotel
//       newHotel.imageUrls = imageUrls;
//       newHotel.lastUpdated = new Date();
//       newHotel.userId = req.userId;
//       // 3. save the new hotel in the database
//       // const hotel = new Hotel({
//       //   name,
//       //   city,
//       //   country,
//       //   description,
//       //   type,
//       //   pricePerNight,
//       //   facilities,
//       //   starRating,
//       //   adultCount,
//       //   childCount,
//       //   imageUrls,
//       //   lastUpdated: new Date(),
//       //   userId: req.userId,
//       // });
//       const hotel = new Hotel(newHotel);
//       await hotel.save();
//       // console.log(req.body.bodyData);
//       res.status(201).json(hotel);
//     } catch (error) {
//       console.log("error creating hotel:", error);
//       res.status(500).json({ message: "Something went wrong!" });
//     }
//   }
// );

router.post(
  "/",
  verifyToken,
  upload.array("imageFiles", 6),
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("city").notEmpty().withMessage("City is required"),
    body("country").notEmpty().withMessage("Country is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("type").notEmpty().withMessage("Hotel type is required"),
    body("pricePerNight")
      .isNumeric()
      .withMessage("Price per night must be a number"),
    body("facilities").isArray().withMessage("Facilities must be an array"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        name,
        city,
        country,
        description,
        type,
        pricePerNight,
        facilities,
        starRating,
        adultCount,
        childCount,
      } = req.body;
      const imageFiles = req.files;

      if (!imageFiles || imageFiles.length === 0) {
        return res.status(400).json({ message: "No images uploaded!" });
      }

      const imageUrls = await uploadImages(imageFiles);

      const newHotel = new Hotel({
        name,
        city,
        country,
        description,
        type,
        pricePerNight,
        facilities,
        starRating,
        adultCount,
        childCount,
        imageUrls,
        userId: req.userId,
      });

      await newHotel.save();

      res.status(201).json(newHotel);
    } catch (error) {
      console.error("Error creating hotel:", error);
      res.status(500).json({ message: "Something went wrong!" });
    }
  }
);

router.get("/", verifyToken, async (req, res) => {
  try {
    const hotels = await Hotel.find({ userId: req.userId });
    res.json(hotels);
  } catch (error) {
    console.error("Error fetching hotels:", error);
    res.status(500).json({ message: "Error fetching otels" });
  }
});

router.get("/:id", verifyToken, async (req, res) => {
  const id = req.params.id.toString();
  try {
    const hotel = await Hotel.findOne({
      _id: id,
      userId: req.userId,
    });
    res.json(hotel);
  } catch (error) {
    res.status(500).json({ message: "Error finding Hotel" });
  }
});

router.put(
  "/:hotelId",
  verifyToken,
  upload.array("imageFiles"),
  async (req, res) => {
    try {
      const updatedHotel = req.body;
      updatedHotel.lastUpdated = new Date();

      const hotel = await Hotel.findOneAndUpdate(
        {
          _id: req.params.hotelId,
          userId: req.userId,
        },
        updatedHotel,
        { new: true }
      );

      if (!hotel) {
        return res.status(404).json({ message: "Hotel not found" });
      }

      const files = req.files;
      if (files && files.length > 0) {
        const updatedImageUrls = await uploadImages(files);
        hotel.imageUrls = [...updatedImageUrls, ...(hotel.imageUrls || [])];
      }

      await hotel.save();
      res.status(201).json(hotel);
    } catch (error) {
      res.status(500).json({ message: "Something went wrong!" });
    }
  }
);
// router.put(
//   "/:hotelId",
//   verifyToken,
//   upload.array("imageFiles", 6),
//   async (req, res) => {
//     try {
//       const updatedHotel = req.body;
//       updatedHotel.lastUpdated = new Date();

//       const files = req.files;
//       const existingImageUrls = req.body.existingImageUrls
//         ? JSON.parse(req.body.existingImageUrls)
//         : [];
//       let newImageUrls = [];
//       if (files && files.length > 0) {
//         newImageUrls = await uploadImages(files);
//       }
//       // const updatedImageUrls = uploadImages(files);

//       // hotel.imageUrls = [
//       //   ...updatedImageUrls,
//       //   ...(updatedHotel.imageUrls || []),
//       // ];
//       const hotel = await Hotel.findOneAndUpdate(
//         {
//           _id: req.params.hotelId,
//           userId: req.userId,
//         },
//         {
//           ...updatedHotel,
//           newImageUrls: [...existingImageUrls, ...newImageUrls],
//         },
//         { new: true }
//       );
//       if (!hotel) {
//         return res.status(404).json({ message: "Hotel not found" });
//       }

//       await hotel.save();
//       res.status(201).json(hotel);
//     } catch (error) {
//       res.status(500).json({ message: "Something went wrong!" });
//     }
//   }
// );

// router.put(
//   "/:hotelId",
//   verifyToken,
//   [
//     body("name").notEmpty().withMessage("Name is required"),
//     body("city").notEmpty().withMessage("City is required"),
//     body("country").notEmpty().withMessage("Country is required"),
//     body("description").notEmpty().withMessage("Description is required"),
//     body("type").notEmpty().withMessage("Hotel type is required"),
//     body("pricePerNight")
//       .isNumeric()
//       .withMessage("Price per night must be a number"),
//     body("facilities").isArray().withMessage("Facilities must be an array"),
//   ],
//   upload.array("imageFiles"),
//   async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }
//     try {
//       const hotelId = req.params.hotelId;
//       const userId = req.userId;
//       const updatedHotel = { ...req.body, lastUpdated: new Date() };

//       const newHotel = await Hotel.findOne(
//         {
//           _id: hotelId,
//           userId: userId,
//         },
//         { new: true }
//       );
//       if (!newHotel) {
//         return res.status(400).json({ message: "Hotel not found" });
//       }

//       const files = req.files;
//       const existingImageUrls = Array.isArray(req.body.existingImageUrls)
//         ? req.body.existingImageUrls
//         : [req.body.existingImageUrls.filter(Boolean)];
//       let newImageUrls = [];
//       if (files && files.length > 0) {
//         newImageUrls = await uploadImages(files);
//       }

//       updatedHotel.imageUrls = [...existingImageUrls, ...newImageUrls];
//       // const files = req.files;
//       // const newImageUrls = await uploadImages(files);

//       // newHotel.imageUrls = [...newImageUrls, ...(updatedHotel.imageUrls || [])];
//       Object.assign(newHotel, updatedHotel);
//       await newHotel.save();
//       res.status(200).json(newHotel);
//     } catch (error) {
//       console.log("errors", error.message);
//       res.status(500).json({ message: "Something went wrong" });
//     }
//   }
// );
// router.put(
//   "/:hotelId",
//   verifyToken,
//   upload.array("imageFiles"),
//   [
//     body("name").notEmpty().withMessage("Name is required"),
//     body("city").notEmpty().withMessage("City is required"),
//     body("country").notEmpty().withMessage("Country is required"),
//     body("description").notEmpty().withMessage("Description is required"),
//     body("type").notEmpty().withMessage("Hotel type is required"),
//     body("pricePerNight")
//       .isNumeric()
//       .withMessage("Price per night must be a number"),
//     body("facilities").isArray().withMessage("Facilities must be an array"),
//   ],
//   async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }
//     try {
//       const hotelId = req.params.hotelId;
//       const userId = req.userId;
//       const updatedHotel = { ...req.body, lastUpdated: new Date() };

//       const hotel = await Hotel.findOne({ _id: hotelId, userId: userId });
//       if (!hotel) {
//         return res.status(400).json({ message: "Hotel not found" });
//       }

//       const files = req.files;
//       const existingImageUrls = Array.isArray(req.body.existingImageUrls)
//         ? req.body.existingImageUrls
//         : [req.body.existingImageUrls].filter(Boolean);

//       let newImageUrls = [];
//       if (files && files.length > 0) {
//         newImageUrls = await uploadImages(files);
//       }

//       updatedHotel.imageUrls = [...existingImageUrls, ...newImageUrls];

//       Object.assign(hotel, updatedHotel);
//       await hotel.save();
//     } catch (error) {
//       res.status(500).json({ message: "Something went wrong!" });
//     }
//   }
// );
async function uploadImages(imageFiles) {
  const uploadPromises = imageFiles.map(async (image) => {
    const b64 = Buffer.from(image.buffer).toString("base64");
    const dataURI = `data:${image.mimetype};base64,${b64}`;
    const result = await cloudinary.uploader.upload(dataURI);
    return result.url;
  });

  const imageUrls = await Promise.all(uploadPromises);
  return imageUrls;
}

export default router;
