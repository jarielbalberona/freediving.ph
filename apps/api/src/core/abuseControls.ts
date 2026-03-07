const envNumber = (name: string, fallback: number) => {
	const raw = process.env[name];
	const parsed = raw ? Number(raw) : Number.NaN;
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const ABUSE_LIMITS = {
	buddyRequestsPerDay: envNumber("BUDDY_REQUESTS_PER_DAY", 20),
	buddyRequestRejectionCooldownDays: envNumber("BUDDY_REQUEST_REJECTION_COOLDOWN_DAYS", 14),
	newDirectConversationsWithNonBuddiesPerDay: envNumber("NEW_DM_NON_BUDDY_PER_DAY", 10),
	threadsPerDay: envNumber("THREADS_PER_DAY", 10),
	postsPerDay: envNumber("POSTS_PER_DAY", 50),
	pseudonymousThreadsPerDay: envNumber("PSEUDONYMOUS_THREADS_PER_DAY", 5),
	pseudonymousPostsPerDay: envNumber("PSEUDONYMOUS_POSTS_PER_DAY", 30),
	minimumAccountAgeHoursForPseudonymousChika: envNumber("PSEUDONYMOUS_MIN_ACCOUNT_AGE_HOURS", 24),
	minimumAccountAgeHoursForMessaging: envNumber("MESSAGING_MIN_ACCOUNT_AGE_HOURS", 24)
};

export const ROUTE_RATE_LIMITS = {
	buddyActionsPerHour: envNumber("RATE_LIMIT_BUDDY_ACTIONS_PER_HOUR", 60),
	buddyFinderPer15Minutes: envNumber("RATE_LIMIT_BUDDY_FINDER_PER_15_MIN", 80),
	threadCreatesPerHour: envNumber("RATE_LIMIT_THREAD_CREATES_PER_HOUR", 30),
	threadRepliesPerHour: envNumber("RATE_LIMIT_THREAD_REPLIES_PER_HOUR", 120),
	directConversationCreatePerHour: envNumber("RATE_LIMIT_DM_CONVERSATION_CREATES_PER_HOUR", 40),
	messageSendPerHour: envNumber("RATE_LIMIT_DM_SEND_PER_HOUR", 240)
};
