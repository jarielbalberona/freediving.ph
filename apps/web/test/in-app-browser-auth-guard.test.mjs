import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

const repoRoot = path.resolve(globalThis.process.cwd());
const detectorPath = path.join(repoRoot, "src/lib/auth/in-app-browser.ts");
const guardPath = path.join(
  repoRoot,
  "src/components/auth/in-app-browser-auth-guard.tsx",
);
const signInPagePath = path.join(
  repoRoot,
  "src/app/sign-in/[[...sign-in]]/page.tsx",
);
const signUpPagePath = path.join(
  repoRoot,
  "src/app/sign-up/[[...sign-up]]/page.tsx",
);

const importTypeScriptModule = async (filePath) => {
  const source = await readFile(filePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const encoded = Buffer.from(transpiled.outputText).toString("base64");

  return import(`data:text/javascript;base64,${encoded}`);
};

test("in-app browser detector blocks known embedded browsers", async () => {
  const { getInAppBrowserName, isLikelyInAppBrowser } =
    await importTypeScriptModule(detectorPath);
  const blockedUserAgents = [
    {
      name: "Facebook or Messenger",
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/456.0.0.0.0;FB_IAB/FB4A;]",
    },
    {
      name: "Facebook or Messenger",
      ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.147 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/465.0.0.0.0;]",
    },
    {
      name: "Instagram",
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 333.0.0.35.93",
    },
    {
      name: "TikTok",
      ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 TikTok 34.5.4",
    },
    {
      name: "Line",
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/14.8.0",
    },
    {
      name: "LinkedIn",
      ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 LinkedInApp",
    },
    {
      name: "Twitter/X",
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone",
    },
    {
      name: "Android in-app browser",
      ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0.6422.147 Mobile Safari/537.36",
    },
  ];

  for (const { name, ua } of blockedUserAgents) {
    assert.equal(isLikelyInAppBrowser(ua), true, ua);
    assert.equal(getInAppBrowserName(ua), name, ua);
  }
});

test("in-app browser detector allows normal mobile and desktop browsers", async () => {
  const { getInAppBrowserName, isLikelyInAppBrowser } =
    await importTypeScriptModule(detectorPath);
  const allowedUserAgents = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.147 Mobile Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.147 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  ];

  for (const ua of allowedUserAgents) {
    assert.equal(isLikelyInAppBrowser(ua), false, ua);
    assert.equal(getInAppBrowserName(ua), null, ua);
  }
});

test("auth pages wire the in-app browser guard from request user-agent", async () => {
  const [signInPage, signUpPage] = await Promise.all([
    readFile(signInPagePath, "utf8"),
    readFile(signUpPagePath, "utf8"),
  ]);

  for (const source of [signInPage, signUpPage]) {
    assert.match(source, /InAppBrowserAuthGuard/);
    assert.match(source, /getInAppBrowserName\(userAgent\)/);
    assert.match(source, /headers\(\)/);
  }
});

test("auth guard shows user copy, copy-link action, and blocks Google clicks only", async () => {
  const guardSource = await readFile(guardPath, "utf8");

  assert.match(guardSource, /Open in Safari or Chrome to sign in/);
  assert.match(guardSource, /Google sign-in does not work inside Messenger/);
  assert.match(guardSource, /navigator\.clipboard\.writeText\(currentUrl\)/);
  assert.match(guardSource, /GOOGLE_AUTH_TRIGGER_PATTERN/);
  assert.match(guardSource, /onClickCapture=\{handleClickCapture\}/);
  assert.doesNotMatch(guardSource, /disallowed_useragent|user-agent spoof/i);
});
