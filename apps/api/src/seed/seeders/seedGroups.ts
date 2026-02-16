import { faker } from "@faker-js/faker";
import db from "@/databases/drizzle/connection";
import { groups, groupMembers } from "@/models/drizzle/groups.model";
import { users } from "@/models/drizzle/authentication.model";
import { eq } from "drizzle-orm";

const groupNames = [
  "Manila Freedivers",
  "Cebu Deep Divers",
  "Dumaguete Freediving Club",
  "Panglao Depth Training",
  "Moalboal Freedivers",
  "Siquijor Underwater",
  "Bohol Freediving Society",
  "Palawan Deep Divers",
  "Batangas Freediving Group",
  "Anilao Freedivers",
  "Puerto Galera Freedivers",
  "Coron Freediving Club",
  "El Nido Freedivers",
  "Boracay Freediving",
  "Siargao Freedivers"
];

const groupDescriptions = [
  "A community of passionate freedivers exploring the beautiful waters of the Philippines.",
  "Join us for regular freediving sessions, training, and underwater adventures.",
  "We organize freediving events, workshops, and training sessions for all skill levels.",
  "Connect with fellow freedivers, share experiences, and improve your diving skills.",
  "A supportive community focused on safe freediving practices and skill development.",
  "Regular meetups, training sessions, and freediving adventures in our local waters.",
  "Join us for depth training, static sessions, and freediving competitions.",
  "A community dedicated to promoting freediving safety and education.",
  "Connect with local freedivers, share tips, and plan diving trips together.",
  "We organize freediving workshops, safety courses, and social events."
];

export default async function seedGroups() {
  try {
    console.log("Seeding groups started...");

    // Get all users
    const allUsers = await db.select({ id: users.id }).from(users);

    if (allUsers.length === 0) {
      console.log("No users found. Please seed users first.");
      return;
    }

    const groupsData = [];
    const groupMembersData = [];

    // Create groups
    for (let i = 0; i < groupNames.length; i++) {
      const groupName = groupNames[i];
      const slug = groupName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      groupsData.push({
        name: groupName,
        slug: slug,
        description: faker.helpers.arrayElement(groupDescriptions),
        shortDescription: faker.lorem.sentence(10),
        type: faker.helpers.arrayElement(["PUBLIC", "PRIVATE", "INVITE_ONLY"]),
        status: "ACTIVE" as const,
        isPublic: faker.datatype.boolean({ probability: 0.8 }),
        allowMemberInvites: faker.datatype.boolean({ probability: 0.7 }),
        coverImage: faker.image.url({ width: 800, height: 400 }),
        avatar: faker.image.avatar(),
        website: faker.helpers.maybe(() => faker.internet.url(), { probability: 0.3 }),
        location: faker.location.city() + ", Philippines",
        lat: faker.location.latitude({ min: 5, max: 20 }).toString(),
        lng: faker.location.longitude({ min: 115, max: 130 }).toString(),
        memberCount: 0, // Will be updated after members are added
        eventCount: 0,
        postCount: 0,
        maxMembers: faker.helpers.maybe(() => faker.number.int({ min: 50, max: 500 }), { probability: 0.3 }),
        joinApprovalRequired: faker.datatype.boolean({ probability: 0.2 }),
        allowMemberPosts: faker.datatype.boolean({ probability: 0.9 }),
        allowMemberEvents: faker.datatype.boolean({ probability: 0.8 }),
        rules: faker.helpers.maybe(() => faker.lorem.paragraphs(2), { probability: 0.6 }),
        tags: faker.helpers.arrayElements([
          "freediving", "training", "safety", "community", "diving",
          "underwater", "depth", "static", "competition", "beginner"
        ], { min: 2, max: 5 }),
        createdBy: faker.helpers.arrayElement(allUsers).id,
        createdAt: faker.date.recent({ days: 60 }),
        updatedAt: new Date()
      });
    }

    // Insert groups
    const insertedGroups = await db.insert(groups).values(groupsData).returning();
    console.log(`✅ ${insertedGroups.length} groups created!`);

    // Add members to groups
    for (const group of insertedGroups) {
      // Each group gets 5-30 members
      const memberCount = faker.number.int({ min: 5, max: 30 });
      const selectedUsers = faker.helpers.arrayElements(allUsers, memberCount);

      for (let i = 0; i < selectedUsers.length; i++) {
        const user = selectedUsers[i];
        const isOwner = user.id === group.createdBy;

        groupMembersData.push({
          groupId: group.id,
          userId: user.id,
          role: isOwner ? "owner" : faker.helpers.arrayElement(["admin", "moderator", "member"]),
          status: faker.helpers.arrayElement(["active", "pending"]),
          canPost: faker.datatype.boolean({ probability: 0.8 }),
          canCreateEvents: faker.datatype.boolean({ probability: 0.6 }),
          canInviteMembers: faker.datatype.boolean({ probability: 0.3 }),
          canModerate: faker.datatype.boolean({ probability: 0.2 }),
          joinedAt: faker.date.recent({ days: 30 }).toISOString(),
          invitedBy: faker.helpers.maybe(() => faker.helpers.arrayElement(allUsers).id, { probability: 0.3 }),
          notificationSettings: JSON.stringify({
            newPosts: faker.datatype.boolean(),
            newEvents: faker.datatype.boolean(),
            memberInvites: faker.datatype.boolean()
          }),
          createdAt: faker.date.recent({ days: 30 }),
          updatedAt: new Date()
        });
      }
    }

    // Insert group members
    await db.insert(groupMembers).values(groupMembersData);
    console.log(`✅ ${groupMembersData.length} group members added!`);

    // Update group member counts
    for (const group of insertedGroups) {
      const memberCount = groupMembersData.filter(m => m.groupId === group.id).length;
      await db.update(groups)
        .set({ memberCount })
        .where(eq(groups.id, group.id));
    }

    console.log("✅ Groups seeded successfully!");
  } catch (error) {
    console.error("Error seeding groups:", error);
  }
}
