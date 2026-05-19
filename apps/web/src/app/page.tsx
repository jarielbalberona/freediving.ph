import { HomeFeedPage } from "@/features/home-feed";

type HomePageProps = {
  searchParams?: Promise<{
    feedSource?: string | string[];
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const rawFeedSource = Array.isArray(params?.feedSource)
    ? params?.feedSource[0]
    : params?.feedSource;
  const feedSource = rawFeedSource === "home" ? "home" : "activity";

  return <HomeFeedPage initialFeedSource={feedSource} />;
}
