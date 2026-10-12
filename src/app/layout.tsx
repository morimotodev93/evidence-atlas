import type { Metadata } from "next";
import { appFontClassName } from "@/lib/app-font";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Evidence Atlas",
    template: "%s | Evidence Atlas",
  },
  description:
    "An AI-assisted research workspace for turning independent research into structured, reusable knowledge.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${appFontClassName} antialiased`}>
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
