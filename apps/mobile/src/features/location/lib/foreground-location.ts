import * as Location from "expo-location";

export type CoarseLocation = {
  latitude: number;
  longitude: number;
  label: string;
};

export async function requestForegroundCoarseLocation(): Promise<
  | { status: "granted"; location: CoarseLocation }
  | { status: "denied"; message: string }
> {
  const current = await Location.getForegroundPermissionsAsync();
  const permission =
    current.status === "granted"
      ? current
      : await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    return {
      status: "denied",
      message: "Location is off for this device.",
    };
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const latitude = roundCoordinate(position.coords.latitude);
  const longitude = roundCoordinate(position.coords.longitude);

  return {
    status: "granted",
    location: {
      label: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
      latitude,
      longitude,
    },
  };
}

const roundCoordinate = (value: number) => Number(value.toFixed(2));
