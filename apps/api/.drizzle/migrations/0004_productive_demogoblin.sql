ALTER TABLE "tags" RENAME TO "tag";--> statement-breakpoint
ALTER TABLE "tag" DROP CONSTRAINT "tags_name_unique";--> statement-breakpoint
ALTER TABLE "user_tags" DROP CONSTRAINT "user_tags_tag_id_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tag" ADD CONSTRAINT "tag_name_unique" UNIQUE("name");