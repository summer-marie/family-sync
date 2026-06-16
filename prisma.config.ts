import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // CLI operations (prisma migrate, prisma generate) use the direct non-pooled
  // Neon URL. The runtime PrismaClient uses the pooled URL via the driver adapter.
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});