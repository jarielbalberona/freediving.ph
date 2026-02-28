import type {
  ProfilePost,
  PublicProfile,
  PublicProfileHighlight,
} from "@freediving.ph/types";

import { profilesApi } from "@/features/profiles/api/profiles";
import { normalizeUsername } from "@/lib/routes";

const sampleImagePool = Array.from(
  { length: 13 },
  (_, index) => `/images/samples/${index + 1}.jpg`,
);

const bioPool = [
  "Freediver chasing clean water, clean lines, and weekends that start before sunrise.",
  "Saltwater, training blocks, and the occasional camera roll full of reef light.",
  "Equal parts dive planning, boat snacks, and trying not to miss the slack tide.",
  "Depth work during the week, island escapes when the schedule finally cooperates.",
];

const highlightTitlePool = [
  "Anilao",
  "Moalboal",
  "Apo Reef",
  "Coron",
  "Siquijor",
  "Bohol",
  "Camiguin",
  "Batangas",
  "Cebu",
  "Palawan",
  "Tubbataha",
  "Dumaguete",
];

const sumCharacterCodes = (value: string): number =>
  Array.from(value).reduce((total, character) => total + character.charCodeAt(0), 0);

const toDisplayName = (username: string): string =>
  username
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const pickImage = (seed: number, offset = 0): string =>
  sampleImagePool[(seed + offset) % sampleImagePool.length];

const createHighlights = (username: string, seed: number): PublicProfileHighlight[] =>
  Array.from({ length: 8 }, (_, index) => ({
    id: `${username}-highlight-${index + 1}`,
    title: highlightTitlePool[(seed + index) % highlightTitlePool.length],
    coverUrl: pickImage(seed, index + 2),
  }));

const createPosts = (username: string): ProfilePost[] => {
  const seed = sumCharacterCodes(username);
  const total = 15 + (seed % 5);

  return Array.from({ length: total }, (_, index) => ({
    id: `${username}-post-${index + 1}`,
    thumbUrl: pickImage(seed, index),
    mediaType: (index + seed) % 4 === 0 ? "video" : "image",
    likeCount: 18 + ((seed * (index + 3)) % 820),
    commentCount: 2 + ((seed + index * 11) % 96),
  }));
};

const createMockProfile = (username: string): PublicProfile => {
  const normalizedUsername = normalizeUsername(username);
  const seed = sumCharacterCodes(normalizedUsername);
  const posts = createPosts(normalizedUsername);

  return {
    id: `public-${normalizedUsername}`,
    username: normalizedUsername,
    displayName: toDisplayName(normalizedUsername) || normalizedUsername,
    bio: bioPool[seed % bioPool.length],
    avatarUrl: pickImage(seed, 1),
    counts: {
      posts: posts.length,
      followers: 1200 + ((seed * 17) % 6200),
      following: 180 + ((seed * 7) % 900),
    },
    highlights: createHighlights(normalizedUsername, seed),
  };
};

type GetPublicProfileOptions = {
  viewerUsername?: string | null;
};

export const profileApi = {
  async getPublicProfile(
    username: string,
    options?: GetPublicProfileOptions,
  ): Promise<PublicProfile> {
    const normalizedUsername = normalizeUsername(username);
    const mockProfile = createMockProfile(normalizedUsername);
    const viewerUsername = options?.viewerUsername
      ? normalizeUsername(options.viewerUsername)
      : null;

    if (viewerUsername !== normalizedUsername) {
      return mockProfile;
    }

    try {
      const response = await profilesApi.getMyProfile();

      return {
        ...mockProfile,
        id: response.profile.userId,
        username: normalizeUsername(response.profile.username),
        displayName:
          response.profile.displayName || mockProfile.displayName,
        bio: response.profile.bio || mockProfile.bio,
        avatarUrl: response.profile.avatarUrl || mockProfile.avatarUrl,
      };
    } catch {
      return mockProfile;
    }
  },

  async getProfilePosts(username: string): Promise<ProfilePost[]> {
    return createPosts(normalizeUsername(username));
  },
};
