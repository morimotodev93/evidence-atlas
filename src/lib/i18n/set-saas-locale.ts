"use server";

import { cookies } from "next/headers";

import { isLocale } from "./locales";
import { SAAS_LOCALE_COOKIE } from "./saas-locale";

export async function setSaasLocale(locale: unknown): Promise<void> {
  if (!isLocale(locale)) {
    throw new Error("Unsupported locale.");
  }

  const cookieStore = await cookies();
  cookieStore.set(SAAS_LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 180 * 24 * 60 * 60,
  });
}
