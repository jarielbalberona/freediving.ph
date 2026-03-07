import { and, eq } from "drizzle-orm";

import { threadModerationStates, userFeatureRestrictions } from "@/models/drizzle/moderation.model";

type DbClient = {
	select: (...args: any[]) => any;
};

const isMissingTableError = (error: unknown) =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	(error as { code?: string }).code === "42P01";

export const isThreadLockedOrRemoved = async (db: DbClient, threadId: number): Promise<boolean> => {
	try {
		const rows = await db
			.select({ state: threadModerationStates.state })
			.from(threadModerationStates)
			.where(eq(threadModerationStates.threadId, threadId))
			.limit(1);

		const state = rows[0]?.state;
		return state === "LOCKED" || state === "REMOVED";
	} catch (error) {
		if (isMissingTableError(error)) return false;
		throw error;
	}
};

export const isUserFeatureRestricted = async (
	db: DbClient,
	userId: number,
	restrictionType: "DM_DISABLED" | "CHIKA_POSTING_DISABLED"
): Promise<boolean> => {
	try {
		const rows = await db
			.select({ id: userFeatureRestrictions.id })
			.from(userFeatureRestrictions)
			.where(
				and(
					eq(userFeatureRestrictions.userId, userId),
					eq(userFeatureRestrictions.restrictionType, restrictionType),
					eq(userFeatureRestrictions.isActive, 1)
				)
			)
			.limit(1);

		return rows.length > 0;
	} catch (error) {
		if (isMissingTableError(error)) return false;
		throw error;
	}
};
