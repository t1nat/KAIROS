import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "~/env";
import {
  ACCOUNT_SWITCH_COOKIE,
  decodeAccountSwitchCookie,
} from "~/server/accountSwitch";

export async function GET() {
  if (!env.AUTH_SECRET) {
    return NextResponse.json({ accounts: [] });
  }

  const secret = env.AUTH_SECRET;
  const cookieStore = await cookies();
  const value = cookieStore.get(ACCOUNT_SWITCH_COOKIE)?.value;
  const accounts = decodeAccountSwitchCookie(value, secret);

  return NextResponse.json({ accounts });
}
