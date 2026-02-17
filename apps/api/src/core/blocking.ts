import { and, eq, or } from "drizzle-orm";

import { blocks } from "@/models/drizzle/moderation.model";

type DbClient = {
	select: (...args: any[]) => any;
};

export const isPlatformBlockedBetween = async (db: DbClient, userA: number, userB: number) => {
	const rows = await db
		.select({ id: blocks.id })
		.from(blocks)
		.where(
			and(
				eq(blocks.scope, "PLATFORM"),
				or(
					and(eq(blocks.blockerUserId, userA), eq(blocks.blockedUserId, userB)),
					and(eq(blocks.blockerUserId, userB), eq(blocks.blockedUserId, userA))
				)
			)
		)
		.limit(1);

	return rows.length > 0;
};

export const getPlatformBlockedUserIds = async (db: DbClient, currentUserId: number): Promise<Set<number>> => {
	const blockedRows = await db
		.select({ blockerUserId: blocks.blockerUserId, blockedUserId: blocks.blockedUserId })
		.from(blocks)
		.where(
			and(
				eq(blocks.scope, "PLATFORM"),
				or(eq(blocks.blockerUserId, currentUserId), eq(blocks.blockedUserId, currentUserId))
			)
		);

	const blockedUserIds = new Set<number>();
	for (const row of blockedRows) {
		if (row.blockerUserId === currentUserId) blockedUserIds.add(row.blockedUserId);
		if (row.blockedUserId === currentUserId) blockedUserIds.add(row.blockerUserId);
	}

	return blockedUserIds;
};
