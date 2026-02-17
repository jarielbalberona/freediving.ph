CREATE UNIQUE INDEX IF NOT EXISTS "reactions_user_thread_unique_idx"
ON "reactions" ("user_id", "thread_id")
WHERE "thread_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "reactions_user_comment_unique_idx"
ON "reactions" ("user_id", "comment_id")
WHERE "comment_id" IS NOT NULL;
