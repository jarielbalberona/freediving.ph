import { faker } from "@faker-js/faker";
import db from "@/databases/drizzle/connection";
import { events, eventAttendees, eventWaitlist, eventComments, eventLikes } from "@/models/drizzle/events.model";
import { users } from "@/models/drizzle/authentication.model";
import { groups } from "@/models/drizzle/groups.model";
import { eq } from "drizzle-orm";

const eventTitles = [
  "Weekly Freediving Training Session",
  "Depth Training Workshop - Beginner Level",
  "Static Apnea Competition",
  "Freediving Safety Course",
  "Underwater Photography Workshop",
  "Freediving Meditation Session",
  "Pool Training - Static & Dynamic",
  "Open Water Freediving Session",
  "Freediving Equipment Workshop",
  "Advanced Equalization Techniques",
  "Freediving for Beginners",
  "Competition Preparation Training",
  "Freediving Yoga & Relaxation",
  "Night Freediving Session",
  "Freediving First Aid Course"
];

const eventDescriptions = [
  "Join us for a comprehensive freediving training session covering breath-hold techniques, equalization, and safety protocols.",
  "Learn the fundamentals of freediving in a safe and supportive environment. Perfect for beginners!",
  "Test your limits in our friendly static apnea competition. All skill levels welcome!",
  "Essential safety course covering rescue techniques, buddy systems, and emergency procedures.",
  "Combine your love for freediving with underwater photography. Learn to capture amazing shots!",
  "Explore the meditative aspects of freediving through guided breathing and relaxation exercises.",
  "Pool-based training focusing on static and dynamic apnea techniques.",
  "Open water session for practical application of freediving skills in natural conditions.",
  "Learn about freediving equipment, maintenance, and selection for different diving conditions.",
  "Advanced workshop focusing on equalization techniques for deeper dives.",
  "Perfect introduction to freediving for complete beginners. No experience required!",
  "Intensive training program for those preparing for freediving competitions.",
  "Combine yoga and freediving for improved flexibility, breath control, and relaxation.",
  "Experience the magic of freediving at night. Special equipment and safety measures included.",
  "Comprehensive first aid course specifically designed for freediving scenarios."
];

export default async function seedEvents() {
  try {
    console.log("Seeding events started...");

    // Get all users and groups
    const allUsers = await db.select({ id: users.id }).from(users);
    const allGroups = await db.select({ id: groups.id }).from(groups);

    if (allUsers.length === 0) {
      console.log("No users found. Please seed users first.");
      return;
    }

    const eventsData = [];
    const attendeesData = [];
    const waitlistData = [];
    const commentsData = [];
    const likesData = [];

    // Create events
    for (let i = 0; i < eventTitles.length; i++) {
      const title = eventTitles[i];
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + faker.string.alphanumeric(6);
      const startDate = faker.date.future({ years: 0.5 });
      const endDate = faker.date.soon({ days: 1, refDate: startDate });

      const isGroupEvent = faker.datatype.boolean({ probability: 0.4 });
      const organizerId = isGroupEvent && allGroups.length > 0 ?
        faker.helpers.arrayElement(allGroups).id :
        faker.helpers.arrayElement(allUsers).id;

      eventsData.push({
        title,
        slug,
        description: eventDescriptions[i] || faker.lorem.paragraphs(3),
        shortDescription: faker.lorem.sentence(15),
        type: faker.helpers.arrayElement([
          "DIVE_SESSION", "TRAINING", "COMPETITION", "SOCIAL",
          "WORKSHOP", "MEETUP", "TOURNAMENT", "FUNDRAISER"
        ]),
        status: faker.helpers.arrayElement(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]),
        visibility: faker.helpers.arrayElement(["PUBLIC", "PRIVATE", "GROUP_ONLY", "INVITE_ONLY"]),
        startDate,
        endDate,
        registrationDeadline: faker.date.soon({ days: 7, refDate: startDate }),
        timezone: "Asia/Manila",
        location: faker.location.city() + ", Philippines",
        address: faker.location.streetAddress(),
        lat: faker.location.latitude({ min: 5, max: 20 }).toString(),
        lng: faker.location.longitude({ min: 115, max: 130 }).toString(),
        venueName: faker.helpers.maybe(() => faker.company.name() + " Pool", { probability: 0.6 }),
        maxAttendees: faker.number.int({ min: 10, max: 50 }),
        currentAttendees: 0, // Will be updated after attendees are added
        waitlistEnabled: faker.datatype.boolean({ probability: 0.3 }),
        waitlistCount: 0,
        isFree: faker.datatype.boolean({ probability: 0.7 }),
        price: faker.helpers.maybe(() => faker.number.float({ min: 500, max: 5000, fractionDigits: 2 }), { probability: 0.3 }),
        currency: "PHP",
        earlyBirdPrice: faker.helpers.maybe(() => faker.number.float({ min: 300, max: 3000, fractionDigits: 2 }), { probability: 0.2 }),
        earlyBirdDeadline: faker.helpers.maybe(() => faker.date.soon({ days: 14, refDate: startDate }), { probability: 0.2 }),
        skillLevel: faker.helpers.arrayElement(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL"]),
        equipmentRequired: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.8 }),
        certificationRequired: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
        ageRestriction: faker.helpers.maybe(() => "18+ years old", { probability: 0.4 }),
        coverImage: faker.image.url({ width: 800, height: 400 }),
        images: faker.helpers.arrayElements([
          faker.image.url({ width: 400, height: 300 }),
          faker.image.url({ width: 400, height: 300 }),
          faker.image.url({ width: 400, height: 300 })
        ], { min: 1, max: 3 }),
        videoUrl: faker.helpers.maybe(() => faker.internet.url(), { probability: 0.2 }),
        allowWaitlist: faker.datatype.boolean({ probability: 0.7 }),
        requireApproval: faker.datatype.boolean({ probability: 0.2 }),
        allowCancellation: faker.datatype.boolean({ probability: 0.8 }),
        cancellationDeadline: faker.helpers.maybe(() => faker.date.soon({ days: 1, refDate: startDate }), { probability: 0.5 }),
        likeCount: 0,
        shareCount: 0,
        commentCount: 0,
        tags: faker.helpers.arrayElements([
          "freediving", "training", "safety", "beginner", "advanced",
          "competition", "workshop", "pool", "open-water", "meditation"
        ], { min: 2, max: 5 }),
        category: faker.helpers.arrayElement(["Training", "Competition", "Workshop", "Social", "Safety"]),
        contactEmail: faker.internet.email(),
        contactPhone: faker.phone.number(),
        website: faker.helpers.maybe(() => faker.internet.url(), { probability: 0.3 }),
        socialLinks: faker.helpers.maybe(() => JSON.stringify({
          facebook: faker.internet.url(),
          instagram: faker.internet.url()
        }), { probability: 0.4 }),
        organizerType: isGroupEvent ? "group" : "user",
        organizerId,
        groupId: isGroupEvent ? organizerId : null,
        settings: JSON.stringify({
          allowPhotos: faker.datatype.boolean(),
          allowVideos: faker.datatype.boolean(),
          requireWaiver: faker.datatype.boolean()
        }),
        createdAt: faker.date.recent({ days: 30 }),
        updatedAt: new Date()
      });
    }

    // Insert events
    const insertedEvents = await db.insert(events).values(eventsData).returning();
    console.log(`✅ ${insertedEvents.length} events created!`);

    // Add attendees, comments, and likes for each event
    for (const event of insertedEvents) {
      // Add attendees (5-25 per event)
      const attendeeCount = faker.number.int({ min: 5, max: 25 });
      const selectedUsers = faker.helpers.arrayElements(allUsers, attendeeCount);

      for (const user of selectedUsers) {
        attendeesData.push({
          eventId: event.id,
          userId: user.id,
          status: faker.helpers.arrayElement(["registered", "attended", "cancelled"]),
          registrationDate: faker.date.recent({ days: 20 }),
          amountPaid: event.isFree ? null : faker.number.float({ min: 500, max: 2000, fractionDigits: 2 }),
          paymentStatus: faker.helpers.arrayElement(["pending", "paid", "refunded"]),
          paymentMethod: faker.helpers.maybe(() => faker.helpers.arrayElement(["cash", "bank_transfer", "gcash"]), { probability: 0.7 }),
          emergencyContact: faker.phone.number(),
          dietaryRestrictions: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.3 }),
          medicalConditions: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
          notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 }),
          checkedIn: faker.datatype.boolean({ probability: 0.6 }),
          checkedInAt: faker.helpers.maybe(() => faker.date.recent({ days: 5 }), { probability: 0.6 }),
          checkedInBy: faker.helpers.maybe(() => faker.helpers.arrayElement(allUsers).id, { probability: 0.6 }),
          createdAt: faker.date.recent({ days: 20 }),
          updatedAt: new Date()
        });
      }

      // Add waitlist entries (0-10 per event)
      if (event.waitlistEnabled) {
        const waitlistCount = faker.number.int({ min: 0, max: 10 });
        const waitlistUsers = faker.helpers.arrayElements(allUsers, waitlistCount);

        for (let i = 0; i < waitlistUsers.length; i++) {
          waitlistData.push({
            eventId: event.id,
            userId: waitlistUsers[i].id,
            position: i + 1,
            joinedAt: faker.date.recent({ days: 15 }),
            notified: faker.datatype.boolean({ probability: 0.3 }),
            createdAt: faker.date.recent({ days: 15 }),
            updatedAt: new Date()
          });
        }
      }

      // Add comments (2-8 per event)
      const commentCount = faker.number.int({ min: 2, max: 8 });
      const commentUsers = faker.helpers.arrayElements(allUsers, commentCount);

      for (const user of commentUsers) {
        commentsData.push({
          eventId: event.id,
          userId: user.id,
          parentId: faker.helpers.maybe(() => faker.helpers.arrayElement(commentsData)?.id, { probability: 0.2 }),
          content: faker.lorem.paragraph(),
          isPrivate: faker.datatype.boolean({ probability: 0.1 }),
          createdAt: faker.date.recent({ days: 15 }),
          updatedAt: new Date()
        });
      }

      // Add likes (10-30 per event)
      const likeCount = faker.number.int({ min: 10, max: 30 });
      const likeUsers = faker.helpers.arrayElements(allUsers, likeCount);

      for (const user of likeUsers) {
        likesData.push({
          eventId: event.id,
          userId: user.id,
          createdAt: faker.date.recent({ days: 20 }),
          updatedAt: new Date()
        });
      }
    }

    // Insert all related data
    await db.insert(eventAttendees).values(attendeesData);
    console.log(`✅ ${attendeesData.length} event attendees added!`);

    if (waitlistData.length > 0) {
      await db.insert(eventWaitlist).values(waitlistData);
      console.log(`✅ ${waitlistData.length} waitlist entries added!`);
    }

    await db.insert(eventComments).values(commentsData);
    console.log(`✅ ${commentsData.length} event comments added!`);

    await db.insert(eventLikes).values(likesData);
    console.log(`✅ ${likesData.length} event likes added!`);

    // Update event statistics
    for (const event of insertedEvents) {
      const attendeeCount = attendeesData.filter(a => a.eventId === event.id).length;
      const waitlistCount = waitlistData.filter(w => w.eventId === event.id).length;
      const commentCount = commentsData.filter(c => c.eventId === event.id).length;
      const likeCount = likesData.filter(l => l.eventId === event.id).length;

      await db.update(events)
        .set({
          currentAttendees: attendeeCount,
          waitlistCount,
          commentCount,
          likeCount
        })
        .where(eq(events.id, event.id));
    }

    console.log("✅ Events seeded successfully!");
  } catch (error) {
    console.error("Error seeding events:", error);
  }
}
