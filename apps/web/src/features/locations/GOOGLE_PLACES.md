# Google Places Follow-Up

The shared `LocationPicker` value shape already carries `googlePlaceId`,
`formattedAddress`, `latitude`, and `longitude`, but the picker does not call
Google Places yet.

Current repo truth: Google Maps rendering and geocoding config exists for map
surfaces, but there is no shared Places autocomplete/search client for general
forms. Do not show Google place results in `LocationPicker` until that client is
implemented.

Required follow-up:

- Confirm the browser API key has Places API access enabled.
- Add a shared Places search client under the locations feature.
- Return only user-readable place labels in the UI.
- Save `googlePlaceId`, `formattedAddress`, `latitude`, and `longitude`.
- Best-effort map address components into the existing region/province/city/
  barangay fields and leave manual correction available.
