import * as Linking from "expo-linking";
import { router, type Href } from "expo-router";

import { resolveFphLink } from "@/features/shared/links/lib/resolve-fph-link";

export async function openFphLink(rawUrl: string): Promise<void> {
  const resolution = resolveFphLink(rawUrl);

  if (resolution.type === "native") {
    router.push(resolution.href as Href);
    return;
  }

  if (/^https?:/i.test(resolution.url)) {
    await Linking.openURL(resolution.url);
    return;
  }

  if (await Linking.canOpenURL(resolution.url)) {
    await Linking.openURL(resolution.url);
  }
}
