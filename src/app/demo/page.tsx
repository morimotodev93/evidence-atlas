import { notFound } from "next/navigation";
import { getDemoWorkspace } from "@/lib/demo/read";
import { DemoWorkspaceView } from "@/components/demo/demo-pages";
import { demoMetadata } from "@/lib/i18n/demo-routes";

export const dynamic = "force-dynamic";
export const metadata = demoMetadata("en");
export default async function DemoPage() {
  const workspace = await getDemoWorkspace();
  if (!workspace) notFound();
  return DemoWorkspaceView({ workspace });
}
