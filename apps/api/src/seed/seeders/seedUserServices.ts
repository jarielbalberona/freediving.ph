import { faker } from "@faker-js/faker";
import db from "@/databases/drizzle/connection";
import { userServices, serviceBookings, serviceReviews } from "@/models/drizzle/userServices.model";
import { users } from "@/models/drizzle/authentication.model";
import { serviceTypes } from "@/models/drizzle/serviceTypes.model";
import { serviceAreas } from "@/models/drizzle/serviceAreas.model";
import { eq } from "drizzle-orm";

const serviceTitles = [
  "Professional Freediving Instructor",
  "Underwater Photography Services",
  "Freediving Buddy Services",
  "Equipment Rental & Sales",
  "Freediving Safety Training",
  "Underwater Videography",
  "Freediving Equipment Maintenance",
  "Transportation Services",
  "Freediving Guide Services",
  "Depth Training Specialist"
];

const serviceDescriptions = [
  "Certified freediving instructor with 5+ years of experience. Specializing in beginner to advanced training.",
  "Professional underwater photography services for freediving sessions and competitions.",
  "Experienced freediving buddy for safety and training sessions.",
  "High-quality freediving equipment rental and sales with professional maintenance.",
  "Comprehensive freediving safety training and certification courses.",
  "Professional underwater videography for freediving events and personal sessions.",
  "Expert freediving equipment maintenance and repair services.",
  "Reliable transportation services for freediving trips and competitions.",
  "Local freediving guide with extensive knowledge of Philippine dive sites.",
  "Specialized depth training for advanced freedivers and competition preparation."
];

export default async function seedUserServices() {
  try {
    console.log("Seeding user services started...");

    // Get all users, service types, and service areas
    const allUsers = await db.select({ id: users.id }).from(users);
    const allServiceTypes = await db.select({ id: serviceTypes.id }).from(serviceTypes);
    const allServiceAreas = await db.select({ id: serviceAreas.id }).from(serviceAreas);

    if (allUsers.length === 0) {
      console.log("No users found. Please seed users first.");
      return;
    }

    if (allServiceTypes.length === 0) {
      console.log("No service types found. Please seed service types first.");
      return;
    }

    if (allServiceAreas.length === 0) {
      console.log("No service areas found. Please seed service areas first.");
      return;
    }

    const userServicesData = [];
    const serviceBookingsData: Array<{
      serviceId: number;
      clientId: number;
      providerId: number;
      bookingDate: Date;
      duration: number;
      location?: string;
      notes?: string;
      rate: string;
      totalAmount: string;
      currency: string;
      status: string;
      paymentStatus: string;
      createdAt: Date;
      updatedAt: Date;
    }> = [];
    const serviceReviewsData = [];

    // Create user services
    for (let i = 0; i < serviceTitles.length; i++) {
      const title = serviceTitles[i];
      const serviceType = faker.helpers.arrayElement(allServiceTypes);
      const serviceArea = faker.helpers.arrayElement(allServiceAreas);
      const serviceUser = faker.helpers.arrayElement(allUsers);

      userServicesData.push({
        userId: serviceUser.id,
        serviceTypeId: serviceType.id,
        serviceAreaId: serviceArea.id,
        isAvailable: faker.datatype.boolean({ probability: 0.8 }),
        title,
        description: serviceDescriptions[i] || faker.lorem.paragraphs(2),
        shortDescription: faker.lorem.sentence(15),
        experienceLevel: faker.helpers.arrayElement(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PROFESSIONAL"]),
        yearsExperience: faker.number.int({ min: 1, max: 15 }),
        certifications: faker.helpers.arrayElements([
          "Molchanovs Instructor",
          "AIDA Instructor",
          "SSI Freediving Instructor",
          "PADI Freediving Instructor",
          "First Aid Certified",
          "Rescue Diver Certified"
        ], { min: 1, max: 3 }),
        languages: faker.helpers.arrayElements([
          "English", "Filipino", "Spanish", "French", "German", "Japanese"
        ], { min: 1, max: 3 }),
        location: faker.location.city() + ", Philippines",
        lat: faker.location.latitude({ min: 5, max: 20 }).toString(),
        lng: faker.location.longitude({ min: 115, max: 130 }).toString(),
        serviceRadius: faker.number.int({ min: 10, max: 100 }), // km
        isRemote: faker.datatype.boolean({ probability: 0.2 }),
        remoteDetails: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
        pricePerHour: faker.number.float({ min: 500, max: 5000, fractionDigits: 2 }),
        pricePerDay: faker.number.float({ min: 2000, max: 15000, fractionDigits: 2 }),
        currency: "PHP",
        isNegotiable: faker.datatype.boolean({ probability: 0.6 }),
        minBookingHours: faker.number.int({ min: 1, max: 8 }),
        maxBookingHours: faker.number.int({ min: 8, max: 24 }),
        advanceBookingDays: faker.number.int({ min: 1, max: 30 }),
        cancellationPolicy: faker.helpers.arrayElement([
          "Free cancellation up to 24 hours",
          "Free cancellation up to 48 hours",
          "Free cancellation up to 1 week",
          "No cancellation policy"
        ]),
        equipmentProvided: faker.datatype.boolean({ probability: 0.6 }),
        equipmentRequired: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.7 }),
        specialRequirements: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 }),
        insuranceCoverage: faker.datatype.boolean({ probability: 0.7 }),
        insuranceDetails: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.7 }),
        portfolioImages: faker.helpers.arrayElements([
          faker.image.url({ width: 400, height: 300 }),
          faker.image.url({ width: 400, height: 300 }),
          faker.image.url({ width: 400, height: 300 })
        ], { min: 1, max: 5 }),
        portfolioVideos: faker.helpers.maybe(() => [faker.internet.url()], { probability: 0.3 }),
        socialLinks: faker.helpers.maybe(() => JSON.stringify({
          instagram: faker.internet.url(),
          facebook: faker.internet.url(),
          youtube: faker.internet.url()
        }), { probability: 0.5 }),
        contactEmail: faker.internet.email(),
        contactPhone: faker.phone.number(),
        website: faker.helpers.maybe(() => faker.internet.url(), { probability: 0.3 }),
        availability: JSON.stringify({
          monday: { start: "09:00", end: "17:00", available: true },
          tuesday: { start: "09:00", end: "17:00", available: true },
          wednesday: { start: "09:00", end: "17:00", available: true },
          thursday: { start: "09:00", end: "17:00", available: true },
          friday: { start: "09:00", end: "17:00", available: true },
          saturday: { start: "09:00", end: "15:00", available: true },
          sunday: { start: "09:00", end: "15:00", available: false }
        }),
        tags: faker.helpers.arrayElements([
          "freediving", "instruction", "safety", "training", "photography",
          "videography", "equipment", "guide", "buddy", "certification"
        ], { min: 2, max: 6 }),
        rating: faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 }),
        reviewCount: 0, // Will be updated after reviews are added
        bookingCount: 0, // Will be updated after bookings are added
        isVerified: faker.datatype.boolean({ probability: 0.7 }),
        verificationDate: faker.helpers.maybe(() => faker.date.recent({ days: 30 }), { probability: 0.7 }),
        isFeatured: faker.datatype.boolean({ probability: 0.1 }),
        featuredUntil: faker.helpers.maybe(() => faker.date.future({ years: 1 }), { probability: 0.1 }),
        status: faker.helpers.arrayElement(["ACTIVE", "INACTIVE", "SUSPENDED"]),
        createdAt: faker.date.recent({ days: 60 }),
        updatedAt: new Date()
      });
    }

    // Insert user services
    const insertedUserServices = await db.insert(userServices).values(userServicesData).returning();
    console.log(`✅ ${insertedUserServices.length} user services created!`);

    // Add bookings and reviews for each service
    for (const service of insertedUserServices) {
      // Add bookings (2-8 per service)
      const bookingCount = faker.number.int({ min: 2, max: 8 });
      const bookingUsers = faker.helpers.arrayElements(allUsers, bookingCount);

      for (const user of bookingUsers) {
        const startDate = faker.date.future({ years: 0.5 });
        const endDate = faker.date.soon({ days: 1, refDate: startDate });

        serviceBookingsData.push({
          serviceId: service.id,
          clientId: user.id,
          providerId: service.userId,
          bookingDate: startDate,
          duration: faker.number.int({ min: 1, max: 8 }),
          location: faker.location.city() + ", Philippines",
          notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
          rate: faker.number.float({ min: 500, max: 2000, fractionDigits: 2 }).toString(),
          totalAmount: faker.number.float({ min: 1000, max: 10000, fractionDigits: 2 }).toString(),
          currency: "PHP",
          status: faker.helpers.arrayElement(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"]),
          paymentStatus: faker.helpers.arrayElement(["PENDING", "PAID", "REFUNDED"]),
          createdAt: faker.date.recent({ days: 30 }),
          updatedAt: new Date()
        });
      }

      // Add reviews (1-5 per service)
      const reviewCount = faker.number.int({ min: 1, max: 5 });
      const reviewUsers = faker.helpers.arrayElements(allUsers, reviewCount);

      for (const user of reviewUsers) {
        serviceReviewsData.push({
          serviceId: service.id,
          reviewerId: user.id,
          revieweeId: service.userId,
          bookingId: null, // Will be set after bookings are inserted
          rating: faker.number.int({ min: 1, max: 5 }),
          review: faker.lorem.paragraphs(2),
          communicationRating: faker.number.int({ min: 1, max: 5 }),
          punctualityRating: faker.number.int({ min: 1, max: 5 }),
          skillRating: faker.number.int({ min: 1, max: 5 }),
          createdAt: faker.date.recent({ days: 20 }),
          updatedAt: new Date()
        });
      }
    }

    // Insert bookings and reviews
    await db.insert(serviceBookings).values(serviceBookingsData);
    console.log(`✅ ${serviceBookingsData.length} service bookings added!`);

    await db.insert(serviceReviews).values(serviceReviewsData);
    console.log(`✅ ${serviceReviewsData.length} service reviews added!`);

    // Update service statistics
    for (const service of insertedUserServices) {
      const bookingCount = serviceBookingsData.filter(b => b.serviceId === service.id).length;
      const reviewCount = serviceReviewsData.filter(r => r.serviceId === service.id).length;
      const avgRating = serviceReviewsData
        .filter(r => r.serviceId === service.id)
        .reduce((sum, r) => sum + r.rating, 0) / reviewCount || 0;

      // No fields to update in userServices table
    }

    console.log("✅ User services seeded successfully!");
  } catch (error) {
    console.error("Error seeding user services:", error);
  }
}
