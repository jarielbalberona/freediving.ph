import { getFphgoBaseUrlServer } from "@/lib/api/fphgo-base-url";

export async function fphgoFetchServer<T>(
  path: `/v1/${string}`,
): Promise<T | null> {
  try {
    const response = await fetch(`${getFphgoBaseUrlServer()}${path}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
