export const FIXTURE_ORIGIN = "https://demo-chat-fixture.invalid";
export const WIDGET_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// This is a fulfil-or-abort policy. No path ever allows network continuation.
export function offlineRoute(url: string, method: string): "document" | "script" | "style" | "widget" | "api" | "deny" {
  if (method === "GET") {
    if (url === `${FIXTURE_ORIGIN}/`) return "document";
    if (url === `${FIXTURE_ORIGIN}/fixture.js`) return "script";
    if (url === `${FIXTURE_ORIGIN}/fixture.css`) return "style";
    if (url === WIDGET_URL) return "widget";
  }
  if (url === `${FIXTURE_ORIGIN}/api/demo/chat` && method === "POST") return "api";
  return "deny";
}

export const WIDGET_DOUBLE = `window.turnstile = {
  render(container, options) {
    const button = document.createElement('button');
    button.textContent = 'Complete offline verification';
    button.type = 'button';
    button.onclick = () => { options.callback('synthetic-token'); options.callback('synthetic-token'); };
    container.appendChild(button);
    return 'synthetic-widget';
  },
  remove() {}
};`;
