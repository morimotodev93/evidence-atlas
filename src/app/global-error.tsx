"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { translate } from "@/lib/i18n/translate";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", color: "#171717", background: "#fff" }}>
        <title>Evidence Atlas</title>
        <main style={{ maxWidth: "36rem", margin: "0 auto", padding: "4rem 1.5rem", lineHeight: 1.6 }}>
          <section lang="en">
            <h1>{translate("errors.applicationTitle", "en")}</h1>
            <p>{translate("errors.applicationDescription", "en")}</p>
          </section>
          <section lang="ja" style={{ marginTop: "2rem" }}>
            <h2>{translate("errors.applicationTitle", "ja")}</h2>
            <p>{translate("errors.applicationDescription", "ja")}</p>
          </section>
        </main>
      </body>
    </html>
  );
}
