import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const diveSiteCombobox = readFileSync(
  new URL(
    "../src/features/diveSpots/components/DiveSiteCombobox.tsx",
    import.meta.url,
  ),
  "utf8",
);
const locationCombobox = readFileSync(
  new URL(
    "../src/features/locations/components/LocationCombobox.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("dive site picker empty state sends users to the submission form", () => {
  assert.match(locationCombobox, /emptyMessage: ReactNode/);
  assert.match(diveSiteCombobox, /import Link from "next\/link"/);
  assert.match(
    diveSiteCombobox,
    /emptyMessage = "Can't find this dive site\? Submit it\."/,
  );
  assert.match(diveSiteCombobox, /emptyMessageHref = "\/explore\/submit"/);
  assert.match(diveSiteCombobox, /href=\{emptyMessageHref\}/);
  assert.doesNotMatch(
    diveSiteCombobox,
    /emptyMessage = "No dive sites found"/,
  );
});
