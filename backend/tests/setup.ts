import { afterAll } from "vitest";

if (process.env.NODE_ENV !== "test") {
  throw new Error("Tests must run with NODE_ENV=test.");
}

afterAll(async () => {
  const { prisma } = await import("../src/db.js");
  await prisma.$disconnect();
});

