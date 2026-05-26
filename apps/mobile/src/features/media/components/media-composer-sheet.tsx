import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useAuth } from "@clerk/expo";
import type { ImagePickerAsset } from "expo-image-picker";

import { MobileButton } from "@/components/ui/mobile-button";
import { useExploreSitesQuery } from "@/features/explore/hooks/use-explore-sites-query";
import {
  useCreateMomentMutation,
  useCreatePhotoPostMutation,
  useSyncMomentStatusMutation,
} from "@/features/media/hooks/use-media-mutations";
import {
  validateMomentAsset,
  validatePhotoAsset,
} from "@/features/media/lib/media-upload-guards";

type MediaComposerSheetProps = {
  onClose: () => void;
};

const firstAsset = (result: ImagePicker.ImagePickerResult) =>
  result.canceled ? undefined : result.assets[0];

const pickMedia = (mediaTypes: ImagePicker.MediaType[]) =>
  ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    allowsMultipleSelection: mediaTypes.includes("images"),
    mediaTypes,
    quality: 0.9,
  });

export function MediaComposerSheet({ onClose }: MediaComposerSheetProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const sitesQuery = useExploreSitesQuery();
  const createPhotoPost = useCreatePhotoPostMutation();
  const createMoment = useCreateMomentMutation();
  const syncMoment = useSyncMomentStatusMutation();
  const [photos, setPhotos] = useState<ImagePickerAsset[]>([]);
  const [moment, setMoment] = useState<ImagePickerAsset | undefined>();
  const [caption, setCaption] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [lastMomentPostId, setLastMomentPostId] = useState("");
  const [message, setMessage] = useState<string | undefined>();
  const sites = sitesQuery.data?.items ?? [];
  const selectedSite = selectedSiteId || sites[0]?.id || "";
  const busy =
    createPhotoPost.isPending || createMoment.isPending || syncMoment.isPending;

  const requireSignedIn = () => {
    if (!isLoaded) {
      setMessage("Checking your session. Try again in a moment.");
      return false;
    }
    if (!isSignedIn) {
      setMessage("Sign in to share photos and moments.");
      return false;
    }
    setMessage(undefined);
    return true;
  };

  const choosePhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
    if (!permission.granted) {
      setMessage("Allow photo library access to choose photos.");
      return;
    }
    const result = await pickMedia(["images"]);
    if (result.canceled) return;
    const selected = result.assets.slice(0, 10);
    const error = selected.map(validatePhotoAsset).find(Boolean);
    if (error) {
      setMessage(error);
      return;
    }
    setMoment(undefined);
    setPhotos(selected);
    setMessage(undefined);
  };

  const chooseMoment = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(false);
    if (!permission.granted) {
      setMessage("Allow photo library access to choose a video.");
      return;
    }
    const result = await pickMedia(["videos"]);
    const selected = firstAsset(result);
    if (!selected) return;
    const error = validateMomentAsset(selected);
    if (error) {
      setMessage(error);
      return;
    }
    setPhotos([]);
    setMoment(selected);
    setMessage(undefined);
  };

  const publishPhotos = () => {
    if (!requireSignedIn()) return;
    if (!selectedSite) {
      setMessage("Choose a dive spot before sharing photos.");
      return;
    }
    if (photos.length === 0) {
      setMessage("Choose at least one photo.");
      return;
    }
    createPhotoPost.mutate(
      {
        assets: photos,
        caption: caption.trim() || undefined,
        diveSiteId: selectedSite,
      },
      {
        onError: (error) =>
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not share these photos. Try again.",
          ),
        onSuccess: () => {
          setCaption("");
          setPhotos([]);
          setMessage("Photos shared.");
          onClose();
        },
      },
    );
  };

  const publishMoment = () => {
    if (!requireSignedIn()) return;
    if (!moment) {
      setMessage("Choose a video first.");
      return;
    }
    createMoment.mutate(
      {
        asset: moment,
        caption: caption.trim() || undefined,
        diveSiteId: selectedSite || undefined,
      },
      {
        onError: (error) =>
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not upload this Moment. Try again.",
          ),
        onSuccess: (status) => {
          setLastMomentPostId(status.postId);
          setCaption("");
          setMoment(undefined);
          setMessage(
            status.status === "ready"
              ? "Moment published."
              : "Moment uploaded and processing.",
          );
        },
      },
    );
  };

  const refreshMomentStatus = () => {
    if (!lastMomentPostId) return;
    syncMoment.mutate(lastMomentPostId, {
      onError: () => setMessage("Could not check this Moment yet."),
      onSuccess: (status) =>
        setMessage(
          status.status === "ready"
            ? "Moment is ready."
            : status.status === "failed"
              ? "Moment failed. Try another video."
              : "Moment is still processing.",
        ),
    });
  };

  return (
    <View className="gap-3">
      {message ? (
        <Text className="text-sm text-muted-foreground">{message}</Text>
      ) : null}

      <View className="flex-row gap-2">
        <View className="flex-1">
          <MobileButton disabled={busy} variant="secondary" onPress={choosePhotos}>
            Choose photos
          </MobileButton>
        </View>
        <View className="flex-1">
          <MobileButton disabled={busy} variant="secondary" onPress={chooseMoment}>
            Choose Moment
          </MobileButton>
        </View>
      </View>

      {photos.length > 0 ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            {photos.length} photo{photos.length === 1 ? "" : "s"} selected
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {photos.slice(0, 4).map((photo) => (
              <Image
                accessibilityLabel=""
                className="h-20 w-20 rounded-xl bg-secondary"
                contentFit="cover"
                key={photo.uri}
                source={{ uri: photo.uri }}
              />
            ))}
          </View>
        </View>
      ) : null}

      {moment ? (
        <View className="rounded-2xl border border-border bg-card p-3">
          <Text className="text-sm font-semibold text-foreground">
            {moment.fileName || "Moment video"}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {typeof moment.duration === "number"
              ? `${Math.round(moment.duration / 1000)} seconds`
              : "Duration unavailable"}
          </Text>
        </View>
      ) : null}

      <TextInput
        className="min-h-24 rounded-2xl border border-border bg-card p-3 text-foreground"
        maxLength={1000}
        multiline
        onChangeText={setCaption}
        placeholder="Caption"
        placeholderTextColor="#64748b"
        value={caption}
      />

      {sites.length > 0 ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">Dive spot</Text>
          <View className="flex-row flex-wrap gap-2">
            {sites.slice(0, 8).map((site) => (
              <MobileButton
                key={site.id}
                variant={selectedSite === site.id ? "primary" : "secondary"}
                onPress={() => setSelectedSiteId(site.id)}
              >
                {site.name}
              </MobileButton>
            ))}
          </View>
        </View>
      ) : null}

      <MobileButton
        disabled={busy || photos.length === 0 || !selectedSite}
        onPress={publishPhotos}
      >
        Share photos
      </MobileButton>
      <MobileButton disabled={busy || !moment} variant="secondary" onPress={publishMoment}>
        Upload Moment
      </MobileButton>
      {lastMomentPostId ? (
        <MobileButton disabled={busy} variant="secondary" onPress={refreshMomentStatus}>
          Check Moment status
        </MobileButton>
      ) : null}
    </View>
  );
}
