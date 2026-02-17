import * as AuthenticationSchema from "@/models/drizzle/authentication.model";
import * as DiveShopsSchema from "@/models/drizzle/diveShops.model";
import * as DiveSpotsSchema from "@/models/drizzle/diveSpots.model";
import * as DiveToursSchema from "@/models/drizzle/diveTours.model";
import * as ReviewsSchema from "@/models/drizzle/reviews.model";
import * as MediaSchema from "@/models/drizzle/media.model";
import * as TagsSchema from "@/models/drizzle/tags.model";
import * as ThreadsSchema from "@/models/drizzle/threads.model";
import * as UserServicesSchema from "@/models/drizzle/userServices.model";
import * as ServiceTypesSchema from "@/models/drizzle/serviceTypes.model";
import * as ServiceAreasSchema from "@/models/drizzle/serviceAreas.model";
import * as TagSuggestionsSchema from "@/models/drizzle/tagSuggestions.model";
import * as ServiceSuggestionsSchema from "@/models/drizzle/serviceSuggestions.model";
import * as GroupsSchema from "@/models/drizzle/groups.model";
import * as EventsSchema from "@/models/drizzle/events.model";
import * as NotificationsSchema from "@/models/drizzle/notifications.model";
import * as MessagesSchema from "@/models/drizzle/messages.model";
import * as ModerationSchema from "@/models/drizzle/moderation.model";
import * as ProfilesSchema from "@/models/drizzle/profiles.model";
import * as BuddiesSchema from "@/models/drizzle/buddies.model";
import * as ChikaSchema from "@/models/drizzle/chika.model";
import * as FutureModulesSchema from "@/models/drizzle/futureModules.model";
import * as RbacSchema from "@/models/drizzle/rbac.model";

const schema = {
  ...AuthenticationSchema,
  ...DiveShopsSchema,
  ...DiveSpotsSchema,
  ...DiveToursSchema,
  ...ReviewsSchema,
  ...MediaSchema,
  ...TagsSchema,
  ...ThreadsSchema,
  ...UserServicesSchema,
  ...ServiceTypesSchema,
  ...ServiceAreasSchema,
  ...TagSuggestionsSchema,
  ...ServiceSuggestionsSchema,
  ...GroupsSchema,
  ...EventsSchema,
  ...NotificationsSchema,
  ...MessagesSchema,
  ...ModerationSchema,
  ...ProfilesSchema,
  ...BuddiesSchema,
  ...ChikaSchema,
  ...FutureModulesSchema,
  ...RbacSchema
};

export default schema;
