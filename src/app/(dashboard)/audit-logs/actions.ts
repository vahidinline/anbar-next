"use server";

import { prisma } from "@/lib/prisma";

export async function fetchAuditLogsData() {
  return prisma.auditLog.findMany({
    orderBy: { created_at: "desc" },
    take: 500,
  });
}
