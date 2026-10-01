import {
  parseSourceCitations,
  validateSourceCitations,
} from "../src/lib/ai/source-citations";

const allowedSourceIds = new Set(["valid-source-1", "valid-source-2"]);

const input = `
Prisma 8についての有効な主張です [source:valid-source-1]。

これは存在しないSourceを引用しています [source:fake-source-id]。

もう1つの有効な引用です [source:valid-source-2]。

別の偽Sourceです [source:totally-invented-source]。
`.trim();

const validated = validateSourceCitations(input, allowedSourceIds);

console.log("=== Original ===");
console.log(input);

console.log("\n=== Validated ===");
console.log(validated);

console.log("\n=== Parsed validated citations ===");
console.log(parseSourceCitations(validated));
