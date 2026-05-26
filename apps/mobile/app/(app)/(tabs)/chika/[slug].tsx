import { useLocalSearchParams } from "expo-router";
import { ChikaThreadDetailScreen } from "@/features/chika/screens/chika-thread-detail-screen";

export default function ChikaDetailRoute() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  return <ChikaThreadDetailScreen key={slug ?? "missing-chika-slug"} />;
}
