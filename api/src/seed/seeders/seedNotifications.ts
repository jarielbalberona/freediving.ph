import { faker } from "@faker-js/faker";
import db from "@/databases/drizzle/connection";
import { notifications } from "@/models/drizzle/notifications.model";
import { users } from "@/models/drizzle/authentication.model";
import { threads } from "@/models/drizzle/threads.model";
import { events } from "@/models/drizzle/events.model";
import { groups } from "@/models/drizzle/groups.model";

const notificationTypes = [
  "THREAD_REPLY",
  "THREAD_LIKE",
  "EVENT_INVITE",
  "EVENT_REMINDER",
  "GROUP_INVITE",
  "GROUP_UPDATE",
  "MENTION",
  "SYSTEM_ANNOUNCEMENT"
];

const notificationTitles = [
  "New reply to your thread",
  "Someone liked your thread",
  "You're invited to an event",
  "Event reminder",
  "You're invited to join a group",
  "Group update",
  "You were mentioned",
  "System announcement"
];

const notificationMessages = [
  "Someone replied to your thread '{title}'",
  "Your thread '{title}' received a new like",
  "You're invited to join the event '{title}'",
  "Don't forget! Event '{title}' is starting soon",
  "You're invited to join the group '{title}'",
  "There's a new update in the group '{title}'",
  "You were mentioned in '{title}'",
  "Important system announcement: {title}"
];

export default async function seedNotifications() {
  try {
    console.log("Seeding notifications started...");

    // Get all users
    const allUsers = await db.select({ id: users.id }).from(users);
    const allThreads = await db.select({ id: threads.id, title: threads.title }).from(threads);
    const allEvents = await db.select({ id: events.id, title: events.title }).from(events);
    const allGroups = await db.select({ id: groups.id, name: groups.name }).from(groups);

    if (allUsers.length === 0) {
      console.log("No users found. Please seed users first.");
      return;
    }

    const notificationsData = [];

    // Create notifications for each user
    for (const user of allUsers) {
      // Each user gets 5-20 notifications
      const notificationCount = faker.number.int({ min: 5, max: 20 });

      for (let i = 0; i < notificationCount; i++) {
        const type = faker.helpers.arrayElement(notificationTypes);
        const typeIndex = notificationTypes.indexOf(type);
        const title = notificationTitles[typeIndex];
        const message = notificationMessages[typeIndex];

        // Get related entity based on type
        let relatedEntity = null;
        let relatedEntityId = null;

        if (type.includes("THREAD") && allThreads.length > 0) {
          relatedEntity = faker.helpers.arrayElement(allThreads);
          relatedEntityId = relatedEntity.id;
        } else if (type.includes("EVENT") && allEvents.length > 0) {
          relatedEntity = faker.helpers.arrayElement(allEvents);
          relatedEntityId = relatedEntity.id;
        } else if (type.includes("GROUP") && allGroups.length > 0) {
          relatedEntity = faker.helpers.arrayElement(allGroups);
          relatedEntityId = relatedEntity.id;
        }

        const finalMessage = relatedEntity ?
          message.replace('{title}', relatedEntity.title || relatedEntity.name) :
          message.replace('{title}', faker.lorem.words(3));

        notificationsData.push({
          userId: user.id,
          type,
          title,
          message: finalMessage,
          data: relatedEntityId ? JSON.stringify({
            entityType: type.split('_')[0].toLowerCase(),
            entityId: relatedEntityId
          }) : null,
          isRead: faker.datatype.boolean({ probability: 0.6 }),
          readAt: faker.helpers.maybe(() => faker.date.recent({ days: 5 }), { probability: 0.6 }),
          createdAt: faker.date.recent({ days: 30 }),
          updatedAt: new Date()
        });
      }
    }

    await db.insert(notifications).values(notificationsData).onConflictDoNothing();
    console.log(`✅ ${notificationsData.length} notifications seeded successfully!`);
  } catch (error) {
    console.error("Error seeding notifications:", error);
  }
}
