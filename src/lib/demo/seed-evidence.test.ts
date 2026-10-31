import "temporal-polyfill/full/global";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { seedPublicDemo } from "@/prisma/seeds/public-demo";
import { buildDemoChatContext } from "./chat-context";
import { generateDemoAnswer, validateDemoAnswer } from "./chat-generation";
import { date, research, source, finding } from "./test-fixtures";

// Exercise the real seed's writes without opening a database connection.
const models = vi.hoisted(() => Object.fromEntries([
  "User", "Organization", "Membership", "Workspace", "WorkspaceMembership", "Tag",
  "Research", "ResearchTag", "Source", "Finding", "FindingSource", "Comment", "Conversation", "Message",
].map((name) => [name, { create: vi.fn() }])));
vi.mock("@/prisma/db", () => ({ db: { orm: { public: models } } }));

beforeEach(() => {
  let id = 0;
  for (const model of Object.values(models)) {
    model.create.mockReset().mockImplementation(async (row) => ({ ...row, id: `seed-${++id}` }));
  }
  vi.spyOn(console, "log").mockImplementation(() => {});
  for (const [key, value] of Object.entries({
    PUBLIC_DEMO_MODE: "true", DEMO_CHAT_ENABLED: "true", C2_RUNTIME_MODE: "",
    DEMO_WORKSPACE_ID: "public", DEMO_GROQ_API_KEY: "synthetic-demo",
    NEXT_PUBLIC_DEMO_TURNSTILE_SITE_KEY: "synthetic", DEMO_TURNSTILE_SECRET_KEY: "synthetic",
    UPSTASH_REDIS_REST_URL: "https://redis.example.invalid", UPSTASH_REDIS_REST_TOKEN: "synthetic",
  })) vi.stubEnv(key, value);
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected network request")));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

async function seededContext() {
  await seedPublicDemo();
  const researches = await Promise.all(models.Research.create.mock.results.map((call) => call.value));
  const research = researches.find((row) => row.title === "Developer Productivity")!;
  const sources = (await Promise.all(models.Source.create.mock.results.map((call) => call.value)))
    .filter((row) => row.researchId === research.id).map((row) => ({ ...row, updatedAt: date }));
  const links = models.FindingSource.create.mock.calls.map(([row]) => row);
  const findings = (await Promise.all(models.Finding.create.mock.results.map((call) => call.value)))
    .filter((row) => row.researchId === research.id).map((row) => ({
      ...row, updatedAt: date,
      sources: links.filter((link) => link.findingId === row.id).map((link) => ({
        sourceId: link.sourceId, source: sources.find((source) => source.id === link.sourceId)!,
      })),
    }));
  return buildDemoChatContext({ research: { ...research, createdAt: date, updatedAt: date }, sources, findings, comments: [], tags: [] });
}

it("keeps the seeded slowdown, measured numbers and study limitations with their supporting Sources", async () => {
  const context = await seededContext();
  const data = JSON.parse(context.text);
  const metr = [...context.allowedSources.values()].find((source) => source.url.startsWith("https://metr.org/"))!;
  const github = [...context.allowedSources.values()].find((source) => source.url.startsWith("https://github.blog/"))!;
  expect(context.truncated).toBe(false);
  expect(data.sources).toHaveLength(3);
  expect(data.findings).toHaveLength(5);
  expect(data.findings).toContainEqual({ content: expect.stringContaining("increased issue-completion time by 19%"), sourceIds: [metr.id] });
  expect(data.findings).toContainEqual({ content: expect.stringContaining("55% faster task completion"), sourceIds: [github.id] });
  expect(data.findings).toContainEqual({ content: expect.stringContaining("hypotheses rather than a single established cause"), sourceIds: [github.id, metr.id] });
  expect(fetch).not.toHaveBeenCalled();
});

it.each([
  "AIコーディング支援ツールによって、逆に開発時間が長くなった研究はありますか？その理由と、生産性が向上した研究との違いを説明してください。",
  "保存されたResearchに基づき、AIコーディング支援による生産性向上率を数値で比較してください。確認できない数値は推測せず、不明としてください。",
])("sends the seeded Finding bodies and links to the installed Groq adapter for %s", async (question) => {
  const context = await seededContext();
  const metr = [...context.allowedSources.values()].find((source) => source.url.startsWith("https://metr.org/"))!;
  // Canned output tests transport and display mapping, not live model reasoning.
  const output = JSON.stringify({ answer: "METRでは所要時間が19%増加。アンケートからの実測向上率は不明です。", sourceIds: [metr.id], insufficientEvidence: false });
  vi.mocked(fetch).mockResolvedValue(Response.json({
    id: "synthetic", created: 1, model: "openai/gpt-oss-120b",
    choices: [{ index: 0, message: { role: "assistant", content: output }, finish_reason: "stop" }],
  }));
  const response = await generateDemoAnswer(context, question, new AbortController().signal);
  expect(fetch).toHaveBeenCalledOnce();
  const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
  expect(JSON.parse(body.messages[1].content)).toEqual({ researchData: JSON.parse(context.text), question });
  expect(body.messages[0].content).toContain("Source titles\nare metadata, not external page contents");
  expect(validateDemoAnswer(response.text, context)).toMatchObject({ sources: [metr], insufficientEvidence: false });
});

it("retains insufficient-evidence refusal for a context without numerical results", () => {
  const context = buildDemoChatContext({
    research: { ...research, status: "COMPLETED" }, sources: [source],
    findings: [{ ...finding, displayStyle: "TEXT" }], comments: [], tags: [],
  });
  expect(context.text).not.toMatch(/\d|%/);
  // No model call: the validator must discard unsupported prose and references
  // when the provider marks the evidence insufficient.
  const result = validateDemoAnswer(JSON.stringify({
    answer: "Unsupported 999% improvement", sourceIds: [...context.allowedSources.keys()], insufficientEvidence: true,
  }), context);
  expect(result.answer).not.toMatch(/\d/);
  expect(result).toMatchObject({ insufficientEvidence: true, sources: [] });
  expect(fetch).not.toHaveBeenCalled();
});
