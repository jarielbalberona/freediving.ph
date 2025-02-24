import * as AuthenticationSchema from "@/models/drizzle/authentication.model";
import * as DiveShopSchema from "@/models/drizzle/diveShop.model";
import * as DiveSpotSchema from "@/models/drizzle/diveSpot.model";
import * as DiveTourSchema from "@/models/drizzle/diveTour.model";
import * as ReviewSchema from "@/models/drizzle/review.model";

const schema = {
	...ReviewSchema,
	...DiveTourSchema,
	...DiveShopSchema,
	...DiveSpotSchema,
	...AuthenticationSchema
};

export default schema;
