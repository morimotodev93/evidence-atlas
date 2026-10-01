import { retrieveWorkspaceContext } from "../src/lib/ai/retrieve-workspace-context";

const workspaceId = process.argv[2];

if (!workspaceId) {
  console.error(
    "Usage: pnpm exec tsx scripts/evaluate-retrieval-context.ts <workspaceId>",
  );
  process.exit(1);
}

const queryGroups = [
  {
    name: "STRONG_POSITIVE",
    description: "保存されたFindingの内容をかなり直接的に尋ねる",
    queries: [
      "Prisma ORM 8ではPrismaClientの扱いはどう変わった？",
      "Prisma ORM 8で$extendsはどうなった？",
      "Prisma Computeへデプロイするコマンドは？",
      "NestJSからPrisma ORM 8のクエリを実行する構成は？",
    ],
  },
  {
    name: "WEAK_POSITIVE",
    description: "保存知識で答えられるが、表現がFindingから離れている",
    queries: [
      "Prismaの新しいバージョンでは従来の継承型Serviceは必要？",
      "新しいPrismaでアプリ終了時のDB接続はどう処理する？",
      "NestJSで新しいPrismaを導入するときの注意点は？",
      "Prismaの新しいクライアント設計について教えて",
    ],
  },
  {
    name: "RELATED_BUT_UNSUPPORTED",
    description: "テーマは近いがWorkspaceの知識だけでは答えられない",
    queries: [
      "Prisma ORM 8のパフォーマンスはPrisma ORM 7より速い？",
      "Prisma ORM 8をNext.jsで使うベストプラクティスは？",
      "Prisma Computeの料金はいくら？",
      "Prisma ORM 8のセキュリティ上の利点は？",
    ],
  },
  {
    name: "UNRELATED",
    description: "Workspaceとは明確に無関係",
    queries: [
      "React Server Componentsのキャッシュ戦略について",
      "KubernetesのHorizontal Pod Autoscalerについて",
      "Pythonで画像分類モデルを作る方法",
      "大阪から東京まで新幹線で何時間かかる？",
    ],
  },
];

for (const group of queryGroups) {
  console.log("\n########################################");
  console.log(`${group.name}: ${group.description}`);
  console.log("########################################");

  for (const query of group.queries) {
    const context = await retrieveWorkspaceContext(workspaceId, query);

    console.log("\n========================================");
    console.log(`Query: ${query}`);
    console.log("========================================");

    for (const [index, result] of context.results.entries()) {
      console.log({
        rank: index + 1,
        distance: result.distance,
        type: result.type,
        researchId: result.researchId,
        researchTitle: result.researchTitle,
        findingId: result.type === "FINDING" ? result.findingId : undefined,
        content: result.content,
        sourceIds: result.sources.map((source) => source.id),
      });
    }
  }
}
