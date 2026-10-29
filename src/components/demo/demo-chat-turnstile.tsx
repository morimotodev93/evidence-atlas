"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

type Turnstile = {
  render(container: HTMLElement, options: {
    sitekey: string; action: string; size: "compact"; retry: "never";
    "refresh-expired": "never"; "refresh-timeout": "never"; "response-field": false;
    callback: (token: string) => void; "error-callback": () => void;
    "expired-callback": () => void; "timeout-callback": () => void;
  }): string;
  remove(id: string): void;
};
declare global { interface Window { turnstile?: Turnstile } }

export function DemoChatTurnstile({ siteKey, onToken, onFailure }: {
  siteKey: string; onToken: (token: string) => void; onFailure: (expired: boolean) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const consumed = useRef(false);
  const callbacks = useRef({ onToken, onFailure });
  useEffect(() => { callbacks.current = { onToken, onFailure }; }, [onToken, onFailure]);
  useEffect(() => () => {
    if (widget.current !== undefined) window.turnstile?.remove(widget.current);
    widget.current = undefined;
  }, []);
  const failure = (expired: boolean) => {
    if (consumed.current) return;
    consumed.current = true;
    callbacks.current.onFailure(expired);
  };
  return <>
    <div ref={container} className="mt-4 min-w-0" aria-label="Verify to start Demo Chat" />
    <Script
      id="demo-chat-turnstile"
      src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      strategy="afterInteractive"
      onError={() => failure(false)}
      onReady={() => {
        if (!container.current || widget.current !== undefined) return;
        try {
          if (!window.turnstile) throw new Error("Widget unavailable");
          widget.current = window.turnstile.render(container.current, {
            sitekey: siteKey, action: "demo-chat", size: "compact", retry: "never",
            "refresh-expired": "never", "refresh-timeout": "never", "response-field": false,
            callback: (token) => {
              if (consumed.current) return;
              consumed.current = true;
              callbacks.current.onToken(token);
            },
            "error-callback": () => failure(false),
            "expired-callback": () => failure(true),
            "timeout-callback": () => failure(true),
          });
        } catch { failure(false); }
      }}
    />
  </>;
}
