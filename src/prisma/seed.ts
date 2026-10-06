import "temporal-polyfill/global";

import { db } from "./db.ts";
import { seedDevelopment } from "./seeds/development.ts";
import { seedPublicDemo } from "./seeds/public-demo.ts";

type SeedProfile = "development" | "public-demo";

function resolveSeedProfile(value: string | undefined): SeedProfile {
  if (!value || value === "development") {
    return "development";
  }

  if (value === "public-demo") {
    return "public-demo";
  }

  throw new Error(
    `Unknown seed profile "${value}". Expected "development" or "public-demo".`,
  );
}

async function main() {
  const profile = resolveSeedProfile(process.argv[2]);

  console.log(`Running "${profile}" seed...`);

  if (profile === "development") {
    await seedDevelopment();
  } else {
    await seedPublicDemo();
  }

  console.log(`Seed "${profile}" completed successfully.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
  });
