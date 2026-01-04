import { createHmac, timingSafeEqual } from "crypto";

export const ACCOUNT_SWITCH_COOKIE = "kairos.accounts";

export type AccountSwitchEntry = {
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  lastUsed: number;
};

type CookiePayloadV1 = {
  v: 1;
  accounts: AccountSwitchEntry[];
};

const safeJsonParse = (raw: string): unknown => {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const base64UrlEncode = (raw: string) => Buffer.from(raw, "utf8").toString("base64url");
const base64UrlDecode = (raw: string) => Buffer.from(raw, "base64url").toString("utf8");

const sign = (payloadB64: string, secret: string) =>
  createHmac("sha256", secret).update(payloadB64).digest("base64url");

export const encodeAccountSwitchCookie = (accounts: AccountSwitchEntry[], secret: string) => {
  const payload: CookiePayloadV1 = { v: 1, accounts };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
};

export const decodeAccountSwitchCookie = (value: string | undefined, secret: string) => {
  if (!value) return [] as AccountSwitchEntry[];

  const [payloadB64, sig] = value.split(".");
  if (!payloadB64 || !sig) return [] as AccountSwitchEntry[];

  const expected = sign(payloadB64, secret);
  if (expected.length !== sig.length) return [] as AccountSwitchEntry[];

  try {
    const ok = timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) return [] as AccountSwitchEntry[];
  } catch {
    return [] as AccountSwitchEntry[];
  }

  const payloadRaw = base64UrlDecode(payloadB64);
  const parsed = safeJsonParse(payloadRaw);
  if (!parsed || typeof parsed !== "object") return [] as AccountSwitchEntry[];

  const maybe = parsed as Partial<CookiePayloadV1>;
  if (maybe.v !== 1 || !Array.isArray(maybe.accounts)) return [] as AccountSwitchEntry[];

  return maybe.accounts
    .filter((a): a is AccountSwitchEntry => {
      if (!a || typeof a !== "object") return false;
      const x = a as Partial<AccountSwitchEntry>;
      return (
        typeof x.userId === "string" &&
        typeof x.email === "string" &&
        typeof x.lastUsed === "number" &&
        (typeof x.name === "string" || x.name === null || x.name === undefined) &&
        (typeof x.image === "string" || x.image === null || x.image === undefined)
      );
    })
    .sort((a, b) => b.lastUsed - a.lastUsed);
};

export const getCookieFromHeader = (cookieHeader: string | null, name: string) => {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    if (k === name) return rest.join("=");
  }
  return undefined;
};
