export type AdsenseConfig = {
  enabled: boolean;
  publisherId: string;
  defaultSlotId: string;
  testMode: boolean;
};

type AdsenseEnv = {
  NEXT_PUBLIC_ADSENSE_ENABLED?: string;
  NEXT_PUBLIC_ADSENSE_PUBLISHER_ID?: string;
  NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT_ID?: string;
  NEXT_PUBLIC_ADSENSE_TEST_MODE?: string;
  NODE_ENV?: string;
};

const clean = (value: string | undefined): string => value?.trim() ?? "";

const isTrue = (value: string | undefined): boolean =>
  clean(value).toLowerCase() === "true";

const isFalse = (value: string | undefined): boolean =>
  clean(value).toLowerCase() === "false";

export function getAdsenseConfig(env: AdsenseEnv = process.env): AdsenseConfig {
  const explicitTestMode = env.NEXT_PUBLIC_ADSENSE_TEST_MODE;
  const isProduction = clean(env.NODE_ENV) === "production";

  return {
    enabled: isTrue(env.NEXT_PUBLIC_ADSENSE_ENABLED),
    publisherId: clean(env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID),
    defaultSlotId: clean(env.NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT_ID),
    testMode:
      isTrue(explicitTestMode) || (!isProduction && !isFalse(explicitTestMode)),
  };
}

export function isAdsenseReady(config = getAdsenseConfig()): boolean {
  return config.enabled && config.publisherId.length > 0;
}
