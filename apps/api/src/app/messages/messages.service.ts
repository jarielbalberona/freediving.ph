import { and, count, desc, eq, gt, gte, inArray, ne, or, sql } from "drizzle-orm";

import DrizzleService from "@/databases/drizzle/service";
import { users } from "@/models/drizzle/authentication.model";
import { conversationParticipants, conversations, messages } from "@/models/drizzle/messages.model";
import { auditLogs, blocks } from "@/models/drizzle/moderation.model";
import { ServiceResponse } from "@/utils/serviceApi";
import { status } from "@/utils/statusCodes";

import type {
  ConversationMessagesQuerySchemaType,
  CreateDirectConversationSchemaType,
  ModerateRemoveMessageSchemaType,
  SendMessageSchemaType,
} from "./messages.validators";

type ConversationSummary = {
  conversationId: number;
  type: "DIRECT" | "GROUP" | "CHANNEL";
  participants: Array<{
    id: number;
    username: string | null;
    alias: string | null;
    image: string | null;
  }>;
  lastMessage: {
    id: number;
    content: string;
    createdAt: Date;
    senderId: number;
    senderName: string | null;
  } | null;
  unreadCount: number;
};

export default class MessagesService extends DrizzleService {
  private readonly dailyDirectMessageLimit = 200;
  private readonly minimumAccountAgeHours = 24;

  private async enforceAccountAgeGate(userId: number) {
    const accountRows = await this.db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const createdAt = accountRows[0]?.createdAt;
    if (!createdAt) {
      return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "User account not found");
    }

    const ageMs = Date.now() - createdAt.getTime();
    const minAgeMs = this.minimumAccountAgeHours * 60 * 60 * 1000;

    if (ageMs < minAgeMs) {
      return ServiceResponse.createRejectResponse(
        status.HTTP_403_FORBIDDEN,
        `Messaging is available after ${this.minimumAccountAgeHours} hours of account age`,
      );
    }
  }

  private async hasMessagingBlockBetween(userIdA: number, userIdB: number) {
    const blockRows = await this.db
      .select({ id: blocks.id })
      .from(blocks)
      .where(
        and(
          or(eq(blocks.scope, "PLATFORM"), eq(blocks.scope, "MESSAGING_ONLY")),
          or(
            and(eq(blocks.blockerUserId, userIdA), eq(blocks.blockedUserId, userIdB)),
            and(eq(blocks.blockerUserId, userIdB), eq(blocks.blockedUserId, userIdA)),
          ),
        ),
      )
      .limit(1);

    return blockRows.length > 0;
  }

  private async ensureMembership(conversationId: number, userId: number) {
    const membership = await this.db
      .select({
        conversationId: conversationParticipants.conversationId,
        lastReadMessageId: conversationParticipants.lastReadMessageId,
      })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId),
          eq(conversationParticipants.isActive, true),
        ),
      )
      .limit(1);

    return membership[0] ?? null;
  }

  private async getConversationSummary(conversationId: number, currentUserId: number): Promise<ConversationSummary | null> {
    const conversationRow = await this.db
      .select({
        id: conversations.id,
        type: conversations.type,
      })
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.isActive, true)))
      .limit(1);

    if (!conversationRow.length) return null;

    const participantRows = await this.db
      .select({
        id: users.id,
        username: users.username,
        alias: users.alias,
        image: users.image,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(conversationParticipants.userId, users.id))
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.isActive, true),
        ),
      );

    const latestMessageRows = await this.db
      .select({
        id: messages.id,
        content: messages.content,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        senderName: users.username,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    const membership = await this.ensureMembership(conversationId, currentUserId);
    if (!membership) return null;

    const unreadRows = await this.db
      .select({ total: count(messages.id) })
      .from(messages)
      .where(
        membership.lastReadMessageId
          ? and(
              eq(messages.conversationId, conversationId),
              ne(messages.senderId, currentUserId),
              gt(messages.id, membership.lastReadMessageId),
            )
          : and(eq(messages.conversationId, conversationId), ne(messages.senderId, currentUserId)),
      );

    return {
      conversationId,
      type: conversationRow[0].type,
      participants: participantRows,
      lastMessage: latestMessageRows[0] ?? null,
      unreadCount: unreadRows[0]?.total ?? 0,
    };
  }

  async listConversations(currentUserId: number) {
    try {
      const memberships = await this.db
        .select({ conversationId: conversationParticipants.conversationId })
        .from(conversationParticipants)
        .where(and(eq(conversationParticipants.userId, currentUserId), eq(conversationParticipants.isActive, true)));

      const summaries = await Promise.all(
        memberships.map((membership) => this.getConversationSummary(membership.conversationId, currentUserId)),
      );

      const data = summaries
        .filter((conversation): conversation is ConversationSummary => conversation !== null)
        .sort((a, b) => {
          const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
          const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
          return bTime - aTime;
        });

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Conversations retrieved successfully", data);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async createOrGetDirectConversation(currentUserId: number, payload: CreateDirectConversationSchemaType) {
    try {
      await this.enforceAccountAgeGate(currentUserId);

      if (currentUserId === payload.participantId) {
        return ServiceResponse.createRejectResponse(status.HTTP_400_BAD_REQUEST, "Cannot start a conversation with yourself");
      }

      const isBlocked = await this.hasMessagingBlockBetween(currentUserId, payload.participantId);
      if (isBlocked) {
        return ServiceResponse.createRejectResponse(
          status.HTTP_403_FORBIDDEN,
          "Cannot create conversation because one participant has blocked the other",
        );
      }

      const participantRows = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, payload.participantId))
        .limit(1);

      if (!participantRows.length) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Participant not found");
      }

      const existingConversationRows = await this.db
        .select({ conversationId: conversationParticipants.conversationId })
        .from(conversationParticipants)
        .innerJoin(conversations, eq(conversationParticipants.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.type, "DIRECT"),
            eq(conversations.isActive, true),
            eq(conversationParticipants.isActive, true),
            inArray(conversationParticipants.userId, [currentUserId, payload.participantId]),
          ),
        )
        .groupBy(conversationParticipants.conversationId)
        .having(sql`count(distinct ${conversationParticipants.userId}) = 2`)
        .limit(1);

      const conversationId = existingConversationRows[0]?.conversationId;
      if (conversationId) {
        const existingSummary = await this.getConversationSummary(conversationId, currentUserId);
        return ServiceResponse.createResponse(
          status.HTTP_200_OK,
          "Direct conversation retrieved successfully",
          existingSummary,
        );
      }

      const createdConversationRows = await this.db
        .insert(conversations)
        .values({
          type: "DIRECT",
          createdBy: currentUserId,
        })
        .returning({ id: conversations.id });

      const newConversationId = createdConversationRows[0]?.id;
      if (!newConversationId) {
        return ServiceResponse.createRejectResponse(
          status.HTTP_500_INTERNAL_SERVER_ERROR,
          "Failed to create conversation",
        );
      }

      await this.db.insert(conversationParticipants).values([
        { conversationId: newConversationId, userId: currentUserId, role: "OWNER", isActive: true },
        { conversationId: newConversationId, userId: payload.participantId, role: "MEMBER", isActive: true },
      ]);

      const createdSummary = await this.getConversationSummary(newConversationId, currentUserId);
      return ServiceResponse.createResponse(
        status.HTTP_201_CREATED,
        "Direct conversation created successfully",
        createdSummary,
      );
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async listMessages(currentUserId: number, conversationId: number, query: ConversationMessagesQuerySchemaType) {
    try {
      const membership = await this.ensureMembership(conversationId, currentUserId);
      if (!membership) {
        return ServiceResponse.createRejectResponse(status.HTTP_403_FORBIDDEN, "You are not a participant of this conversation");
      }

      const messageRows = await this.db
        .select({
          id: messages.id,
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          senderName: users.username,
          senderAlias: users.alias,
          senderImage: users.image,
          content: messages.content,
          type: messages.type,
          status: messages.status,
          createdAt: messages.createdAt,
          updatedAt: messages.updatedAt,
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(query.limit)
        .offset(query.offset);

      const latestMessageId = messageRows[0]?.id;
      if (latestMessageId) {
        await this.db
          .update(conversationParticipants)
          .set({
            lastReadAt: new Date(),
            lastReadMessageId: latestMessageId,
          })
          .where(
            and(
              eq(conversationParticipants.conversationId, conversationId),
              eq(conversationParticipants.userId, currentUserId),
            ),
          );
      }

      return ServiceResponse.createResponse(
        status.HTTP_200_OK,
        "Messages retrieved successfully",
        messageRows.reverse(),
      );
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async sendMessage(currentUserId: number, conversationId: number, payload: SendMessageSchemaType) {
    try {
      await this.enforceAccountAgeGate(currentUserId);

      const membership = await this.ensureMembership(conversationId, currentUserId);
      if (!membership) {
        return ServiceResponse.createRejectResponse(status.HTTP_403_FORBIDDEN, "You are not a participant of this conversation");
      }

      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const dailyMessageCountRows = await this.db
        .select({ total: count(messages.id) })
        .from(messages)
        .where(and(eq(messages.senderId, currentUserId), gte(messages.createdAt, todayStart)));

      const dailyMessageCount = dailyMessageCountRows[0]?.total ?? 0;
      if (dailyMessageCount >= this.dailyDirectMessageLimit) {
        return ServiceResponse.createRejectResponse(
          status.HTTP_429_TOO_MANY_REQUESTS,
          `Daily direct message limit reached (${this.dailyDirectMessageLimit})`,
        );
      }

      const participantRows = await this.db
        .select({ userId: conversationParticipants.userId })
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.isActive, true),
            ne(conversationParticipants.userId, currentUserId),
          ),
        );

      if (participantRows.length > 0) {
        const participantIds = participantRows.map((participant) => participant.userId);

        const blockingRows = await this.db
          .select({ id: blocks.id })
          .from(blocks)
          .where(
            and(
              or(eq(blocks.scope, "PLATFORM"), eq(blocks.scope, "MESSAGING_ONLY")),
              or(
                and(
                  eq(blocks.blockerUserId, currentUserId),
                  inArray(blocks.blockedUserId, participantIds),
                ),
                and(
                  inArray(blocks.blockerUserId, participantIds),
                  eq(blocks.blockedUserId, currentUserId),
                ),
              ),
            ),
          )
          .limit(1);

        if (blockingRows.length > 0) {
          return ServiceResponse.createRejectResponse(
            status.HTTP_403_FORBIDDEN,
            "Messaging is not allowed because one participant has blocked the other",
          );
        }
      }

      const createdMessageRows = await this.db
        .insert(messages)
        .values({
          conversationId,
          senderId: currentUserId,
          content: payload.content,
          type: payload.type,
          status: "SENT",
        })
        .returning({
          id: messages.id,
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          content: messages.content,
          type: messages.type,
          status: messages.status,
          createdAt: messages.createdAt,
        });

      const createdMessage = createdMessageRows[0];
      if (!createdMessage) {
        return ServiceResponse.createRejectResponse(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to send message");
      }

      await this.db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          lastMessageId: createdMessage.id,
        })
        .where(eq(conversations.id, conversationId));

      return ServiceResponse.createResponse(status.HTTP_201_CREATED, "Message sent successfully", createdMessage);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async deleteOwnMessage(currentUserId: number, conversationId: number, messageId: number) {
    try {
      const membership = await this.ensureMembership(conversationId, currentUserId);
      if (!membership) {
        return ServiceResponse.createRejectResponse(status.HTTP_403_FORBIDDEN, "You are not a participant of this conversation");
      }

      const updatedRows = await this.db
        .update(messages)
        .set({
          content: "[message deleted by sender]",
          type: "SYSTEM",
          metadata: {
            deletedBySender: true,
            deletedByUserId: currentUserId,
            deletedAt: new Date().toISOString(),
          },
          editedAt: new Date(),
          editedBy: currentUserId,
        })
        .where(
          and(
            eq(messages.id, messageId),
            eq(messages.conversationId, conversationId),
            eq(messages.senderId, currentUserId),
          ),
        )
        .returning({
          id: messages.id,
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          content: messages.content,
          type: messages.type,
          status: messages.status,
          createdAt: messages.createdAt,
        });

      const updated = updatedRows[0];
      if (!updated) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Message not found");
      }

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Message deleted by sender", updated);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }

  async moderateRemoveMessage(
    moderatorUserId: number,
    conversationId: number,
    messageId: number,
    payload: ModerateRemoveMessageSchemaType,
  ) {
    try {
      const updatedRows = await this.db
        .update(messages)
        .set({
          content: "[message removed by moderator]",
          type: "SYSTEM",
          metadata: {
            removedByModerator: true,
            moderatedByUserId: moderatorUserId,
            reasonCode: payload.reasonCode,
            note: payload.note ?? null,
            removedAt: new Date().toISOString(),
          },
          editedAt: new Date(),
          editedBy: moderatorUserId,
        })
        .where(and(eq(messages.id, messageId), eq(messages.conversationId, conversationId)))
        .returning({
          id: messages.id,
          conversationId: messages.conversationId,
          senderId: messages.senderId,
          content: messages.content,
          type: messages.type,
          status: messages.status,
          createdAt: messages.createdAt,
        });

      const updated = updatedRows[0];
      if (!updated) {
        return ServiceResponse.createRejectResponse(status.HTTP_404_NOT_FOUND, "Message not found");
      }

      await this.db.insert(auditLogs).values({
        actorUserId: moderatorUserId,
        action: "MESSAGE_MODERATED_REMOVE",
        targetType: "MESSAGE",
        targetId: String(messageId),
        metadata: {
          conversationId,
          reasonCode: payload.reasonCode,
          note: payload.note ?? null,
        },
      });

      return ServiceResponse.createResponse(status.HTTP_200_OK, "Message removed by moderator", updated);
    } catch (error) {
      return ServiceResponse.createErrorResponse(error);
    }
  }
}
