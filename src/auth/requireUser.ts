import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { requireApplicationEnabled } from "@/lib/deployment-mode";

export async function requireUser() {
  requireApplicationEnabled();

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  return session.user;
}
