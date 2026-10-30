// Browser-only fixture: no Next server, environment values, DB or server modules.
import { createRoot } from "react-dom/client";
import { useState } from "react";
import { DemoResearchChatPanel } from "../../src/components/demo/demo-research-chat-panel";

export function OfflineDemoChat() {
  const [research, setResearch] = useState("first");
  const [enabled, setEnabled] = useState(false);
  return <main className="mx-auto max-w-3xl p-4 c2-system-font">
    <h1>Offline Chat fixture</h1>
    <p>All responses and verification are synthetic.</p>
    <div className="flex flex-wrap gap-3 py-4">
      <button onClick={() => setEnabled(!enabled)}>Toggle fixture Chat</button>
      <button onClick={() => setResearch(research === "first" ? "second" : "first")}>Switch Research</button>
    </div>
    <DemoResearchChatPanel researchTitle={`Research ${research}`}
      researchId={enabled ? research : undefined} siteKey={enabled ? "synthetic-site-key" : undefined}
      sources={[{ id: `source-${research}`, title: `Evidence ${research}`, url: `https://sources.invalid/${research}` }]} />
  </main>;
}

createRoot(document.getElementById("root")!).render(<OfflineDemoChat />);
