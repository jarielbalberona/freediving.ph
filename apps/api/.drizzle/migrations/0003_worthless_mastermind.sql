CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"category" varchar(50) NOT NULL,
	"emoji" varchar(10) NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_tags" (
	"user_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	"is_top_tag" boolean DEFAULT false,
	CONSTRAINT "user_tags_user_id_tag_id_pk" PRIMARY KEY("user_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_tag_index" ON "user_tags" USING btree ("user_id","tag_id");