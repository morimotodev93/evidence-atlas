import type { Metadata } from "next";
import { appFontClassName } from "@/lib/app-font";
import { ThemeProvider } from "@/components/theme-provider";
import { themeStorageScript } from "@/lib/theme";
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
    <html lang="en" className={`${appFontClassName} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: themeStorageScript }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
