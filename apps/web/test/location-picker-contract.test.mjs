import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const picker = readFileSync(
  new URL(
    "../src/features/locations/components/LocationPicker.tsx",
    import.meta.url,
  ),
  "utf8",
);
const selectionHook = readFileSync(
  new URL(
    "../src/features/locations/hooks/useLocationSelection.ts",
    import.meta.url,
  ),
  "utf8",
);
const locationTypes = readFileSync(
  new URL(
    "../src/features/locations/types/location-search.ts",
    import.meta.url,
  ),
  "utf8",
);
const locationsApi = readFileSync(
  new URL("../src/features/locations/api/locations.ts", import.meta.url),
  "utf8",
);
const locationCombobox = readFileSync(
  new URL(
    "../src/features/locations/components/LocationCombobox.tsx",
    import.meta.url,
  ),
  "utf8",
);
const groupsPage = readFileSync(
  new URL("../src/app/groups/page.tsx", import.meta.url),
  "utf8",
);
const schoolsPage = readFileSync(
  new URL(
    "../src/features/schools/pages/ManageSchoolsPage.tsx",
    import.meta.url,
  ),
  "utf8",
);
const instructorsPage = readFileSync(
  new URL(
    "../src/features/instructors/pages/InstructorApplicationPage.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("location picker uses the unified search endpoint and user-facing copy", () => {
  assert.match(locationsApi, /routes\.v1\.locations\.search\(\)/);
  assert.match(picker, /Search for a place/);
  assert.match(
    picker,
    /Start typing a city, province, barangay, dive spot, or venue\./,
  );
  assert.match(picker, /Adjust location details/);
  assert.match(picker, /Clear location/);
  assert.doesNotMatch(picker, /Clear Codes|PSGC|google_places|psgc_mapped/);
});

test("selecting a search result prefills structured fields", () => {
  assert.match(locationTypes, /function locationValueFromSearchResult/);
  assert.match(locationTypes, /regionCode: result\.regionCode/);
  assert.match(locationTypes, /provinceCode: result\.provinceCode/);
  assert.match(locationTypes, /cityCode: result\.cityCode/);
  assert.match(locationTypes, /barangayCode: result\.barangayCode/);
  assert.match(selectionHook, /selectSearchResult/);
  assert.match(selectionHook, /locationValueFromSearchResult\(result/);
});

test("structured comboboxes display selected labels after search prefill", () => {
  assert.match(locationCombobox, /selectedOption\?\.label/);
  assert.match(locationCombobox, /inputValue=\{visibleInputValue\}/);
});

test("location picker and PSGC comboboxes are mobile overflow safe", () => {
  assert.match(picker, /w-full min-w-0 max-w-full overflow-x-hidden/);
  assert.match(picker, /flex min-w-0 flex-col/);
  assert.match(picker, /break-words text-sm sm:truncate/);
  assert.match(picker, /group min-w-0 max-w-full overflow-hidden/);
  assert.match(locationCombobox, /className="min-w-0 max-w-full"/);
  assert.match(locationCombobox, /max-w-\[calc\(100vw-1rem\)\]/);
});

test("current consumers use the canonical picker and keep expected payload fields", () => {
  for (const source of [groupsPage, schoolsPage, instructorsPage]) {
    assert.match(source, /LocationPicker/);
    assert.doesNotMatch(source, /<LocationSearch[\s>]/);
  }

  assert.match(groupsPage, /locationName:\s*createLocation\.locationName/);
  assert.match(groupsPage, /cityCode:\s*createLocation\.cityCode/);
  assert.match(groupsPage, /locationSource:\s*createLocation\.locationSource/);
  assert.match(schoolsPage, /formattedAddress/);
  assert.match(schoolsPage, /locationFieldsFromSearch/);
  assert.match(instructorsPage, /locationToProfileFields/);
});

test("empty seed state has a useful message", () => {
  assert.match(picker, /Location data is not loaded yet/);
  assert.match(picker, /seedIsEmpty/);
});
