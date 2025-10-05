import { Router } from "express";
import {
  getUserServices,
  getUserServiceById,
  createUserService,
  updateUserService,
  deleteUserService,
  getUserServicesByUserId,
  createServiceBooking,
  getServiceBookings,
  createServiceReview,
  getServiceReviews,
} from "./userServices.controller";

const router = Router();

// User services routes
router.get("/", getUserServices);
router.get("/:id", getUserServiceById);
router.post("/", createUserService);
router.put("/:id", updateUserService);
router.delete("/:id", deleteUserService);

// User's services
router.get("/users/:userId/services", getUserServicesByUserId);

// Service bookings
router.post("/bookings", createServiceBooking);
router.get("/users/:userId/bookings", getServiceBookings);

// Service reviews
router.post("/reviews", createServiceReview);
router.get("/:id/reviews", getServiceReviews);

export default router;
