// src/auth.ts

import { KyselyAdapter } from "@auth/kysely-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { authDb } from "@/auth/authDB";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: KyselyAdapter(authDb),

  providers: [
    Google({
      clientId: process.env["AUTH_GOOGLE_ID"]!,
      clientSecret: process.env["AUTH_GOOGLE_SECRET"]!,
    }),
  ],

  session: {
    strategy: "database",
  },
});
