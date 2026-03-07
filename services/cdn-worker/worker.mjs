const SIGNED_KEYS = ["f", "q", "w", "exp", "k"];
const ALLOWED_FORMATS = new Set(["auto", "webp", "jpeg", "png"]);

export function canonicalString(pathname, searchParams) {
  const parts = [];
  for (const key of SIGNED_KEYS) {
    const value = searchParams.get(key);
    if (!value) continue;
    parts.push(`${key}=${value}`);
  }
  return `GET\n${pathname}\n${parts.join("&")}`;
}

export async function signCanonical(canonical, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(canonical),
  );
  return base64UrlEncode(new Uint8Array(sig));
}

export function normalizeCacheKey(url) {
  const normalized = new URL(url);
  const objectKey = normalized.pathname.replace(/^\/i\//, "");
  const w = normalized.searchParams.get("w") || "";
  const q = normalized.searchParams.get("q") || "";
  const f = normalized.searchParams.get("f") || "";
  return `https://cdn.freediving.ph/cache/i/${objectKey}?w=${w}&q=${q}&f=${f}`;
}

export function clampTransform(pathname, w, q) {
  const maxWidth = pathname.startsWith("/i/avatars/")
    ? 1024
    : pathname.startsWith("/i/chika/")
      ? 1600
      : 2048;
  if (!Number.isFinite(w) || w <= 0) {
    // Omitted width means serve original and skip edge transform.
    return { width: undefined, quality: undefined };
  }
  const width = Math.max(1, Math.min(w, maxWidth));
  const quality = Math.max(50, Math.min(Number.isFinite(q) ? q : 75, 85));
  return { width, quality };
}

export async function validateSignature(url, env, nowSeconds) {
  const expRaw = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");
  const keyVersion = url.searchParams.get("k");
  if (!expRaw || !sig || !keyVersion) {
    return { ok: false, status: 401, message: "missing signature fields" };
  }

  const exp = Number.parseInt(expRaw, 10);
  if (!Number.isFinite(exp)) {
    return { ok: false, status: 400, message: "invalid exp" };
  }

  if (exp + 60 < nowSeconds) {
    return { ok: false, status: 401, message: "url expired" };
  }

  const format = (url.searchParams.get("f") || "auto").toLowerCase();
  if (!ALLOWED_FORMATS.has(format)) {
    return { ok: false, status: 400, message: "invalid format" };
  }

  const secret =
    env[`MEDIA_SIGNING_SECRET_V${keyVersion}`] || env.MEDIA_SIGNING_SECRET;
  if (!secret) {
    return { ok: false, status: 500, message: "signing secret unavailable" };
  }

  const canonical = canonicalString(url.pathname, url.searchParams);
  const expected = await signCanonical(canonical, secret);
  if (!timingSafeEqual(sig, expected)) {
    return { ok: false, status: 401, message: "invalid signature" };
  }

  return { ok: true, exp, format };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method !== "GET" || !url.pathname.startsWith("/i/")) {
      return new Response("Not found", { status: 404 });
    }
    if (url.pathname.includes("..")) {
      logWarn("invalid_object_key", { pathname: url.pathname });
      return new Response("Invalid object key", { status: 400 });
    }

    const validation = await validateSignature(
      url,
      env,
      Math.floor(Date.now() / 1000),
    );
    if (!validation.ok) {
      logWarn("signature_validation_failed", {
        pathname: url.pathname,
        message: validation.message,
        status: validation.status,
      });
      return new Response(validation.message, { status: validation.status });
    }

    const rawW = Number.parseInt(url.searchParams.get("w") || "", 10);
    const rawQ = Number.parseInt(url.searchParams.get("q") || "", 10);
    const { width, quality } = clampTransform(
      url.pathname,
      Number.isFinite(rawW) ? rawW : undefined,
      Number.isFinite(rawQ) ? rawQ : undefined,
    );

    const cacheKey = normalizeCacheKey(url.toString());
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      logInfo("cache_hit", { cacheKey });
      return cached;
    }
    logInfo("cache_miss", { cacheKey });

    const objectKey = url.pathname.replace(/^\/i\//, "");
    const originBase = (env.R2_ORIGIN_BASE_URL || "").replace(/\/$/, "");
    if (!originBase) {
      logError("origin_unavailable", { pathname: url.pathname });
      return new Response("origin unavailable", { status: 500 });
    }

    const remainingTtl = Math.max(
      1,
      validation.exp - Math.floor(Date.now() / 1000),
    );
    const originUrl = `${originBase}/${objectKey}`;
    const requestInit = {
      headers: env.R2_ORIGIN_BEARER_TOKEN
        ? { Authorization: `Bearer ${env.R2_ORIGIN_BEARER_TOKEN}` }
        : undefined,
    };
    if (width !== undefined) {
      requestInit.cf = {
        image: {
          width,
          quality,
          format: validation.format,
        },
      };
    }
    const originResponse = await fetch(originUrl, requestInit);

    if (!originResponse.ok) {
      logWarn("origin_fetch_failed", {
        originUrl,
        status: originResponse.status,
      });
      return new Response("not found", { status: originResponse.status });
    }

    const headers = new Headers(originResponse.headers);
    headers.set("Cache-Control", `public, max-age=${remainingTtl}`);
    headers.set("X-Content-Type-Options", "nosniff");

    const response = new Response(originResponse.body, {
      status: originResponse.status,
      headers,
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    logInfo("origin_fetch_success", {
      originUrl,
      transformed: width !== undefined,
      width,
      quality,
      format: validation.format,
      remainingTtl,
    });
    return response;
  },
};

function base64UrlEncode(bytes) {
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function logInfo(event, details) {
  console.log(JSON.stringify({ level: "info", event, ...details }));
}

function logWarn(event, details) {
  console.warn(JSON.stringify({ level: "warn", event, ...details }));
}

function logError(event, details) {
  console.error(JSON.stringify({ level: "error", event, ...details }));
}
