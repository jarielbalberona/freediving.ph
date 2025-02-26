import * as AuthenticationSchema from "@/models/drizzle/authentication.model";
import * as DiveShopsSchema from "@/models/drizzle/diveShops.model";
import * as DiveSpotsSchema from "@/models/drizzle/diveSpots.model";
import * as DiveToursSchema from "@/models/drizzle/diveTours.model";
import * as ReviewsSchema from "@/models/drizzle/reviews.model";
import * as MediaSchema from "@/models/drizzle/media.model"
import * as TagsSchema from "@/models/drizzle/tags.model"
import * as ThreadsSchema from "@/models/drizzle/threads.model"

const schema = {
	...AuthenticationSchema,
	...DiveShopsSchema,
	...DiveSpotsSchema,
	...DiveToursSchema,
  ...ReviewsSchema,
  ...MediaSchema,
  ...TagsSchema,
  ...ThreadsSchema
};

export default schema;
