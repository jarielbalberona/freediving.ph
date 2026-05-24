import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { cacheDir, type Device, type SeoProvider } from "./config";

export type CacheRequest = {
  provider: SeoProvider;
  requestType: "serp" | "keyword-volume";
  query: string;
  market: string;
  device: Device;
};

export type CacheOptions = {
  ttlHours: number;
  refresh?: boolean;
  cacheOnly?: boolean;
};

type CacheEnvelope<T> = {
  createdAt: string;
  key: CacheRequest;
  data: T;
};

export function createCacheKey(request: CacheRequest): string {
  const stable = JSON.stringify({
    provider: request.provider,
    requestType: request.requestType,
    query: request.query.trim().toLowerCase(),
    market: request.market,
    device: request.device,
  });
  return createHash("sha256").update(stable).digest("hex").slice(0, 24);
}

export function cachePath(request: CacheRequest): string {
  return path.join(cacheDir, `${createCacheKey(request)}.json`);
}

export function readCache<T>(
  request: CacheRequest,
  ttlHours: number,
): T | null {
  try {
    const raw = readFileSync(cachePath(request), "utf8");
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    const ageMs = Date.now() - new Date(envelope.createdAt).getTime();
    if (ageMs > ttlHours * 60 * 60 * 1000) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(request: CacheRequest, data: T): void {
  mkdirSync(cacheDir, { recursive: true });
  const envelope: CacheEnvelope<T> = {
    createdAt: new Date().toISOString(),
    key: request,
    data,
  };
  writeFileSync(cachePath(request), `${JSON.stringify(envelope, null, 2)}\n`);
}

export async function cacheFirst<T>(
  request: CacheRequest,
  options: CacheOptions,
  fetcher: () => Promise<T>,
): Promise<{ data: T; fromCache: boolean }> {
  if (!options.refresh) {
    const cached = readCache<T>(request, options.ttlHours);
    if (cached) return { data: cached, fromCache: true };
  }

  if (options.cacheOnly) {
    throw new Error(
      `Cache miss for ${request.requestType}:${request.query} in ${request.market}; cache-only prevents network calls.`,
    );
  }

  const data = await fetcher();
  writeCache(request, data);
  return { data, fromCache: false };
}
