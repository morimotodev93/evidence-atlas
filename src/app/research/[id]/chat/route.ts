import { streamText } from "ai";

import { researchModel } from "@/lib/ai/model";
import { buildResearchContext } from "@/lib/ai/research-context";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body: unknown = await request.json();

  if (
    typeof body !== "object" ||
    body === null ||
    !("message" in body) ||
    typeof body.message !== "string" ||
    body.message.trim().length === 0
  ) {
    return Response.json(
      { error: "A non-empty message is required." },
      { status: 400 },
    );
  }

  const context = await buildResearchContext(id);

  if (!context) {
    return Response.json({ error: "Research not found." }, { status: 404 });
  }

  const result = streamText({
    model: researchModel,

    system: `You are an AI research assistant inside Evidence Atlas.

Answer the user's question using only the supplied research context.

Rules:
- Treat the research context as the available evidence.
- Do not invent facts that are not supported by the context.
- If the context is insufficient, say so clearly.
- Distinguish findings from source metadata.
- Source titles and URLs identify supporting evidence; they do not imply that you have read the source contents.
- Be concise and evidence-oriented.`,

    prompt: `Research context:
${JSON.stringify(context, null, 2)}

User question:
${body.message.trim()}`,
  });

  return result.toTextStreamResponse();
}
