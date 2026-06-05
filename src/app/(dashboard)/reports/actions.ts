"use server";

import { prisma } from "@/lib/prisma";

export async function fetchReportsData() {
  const [products, docs, groups, contacts, warehouses] = await Promise.all([
    prisma.product.findMany(),
    prisma.inventoryDocument.findMany({ orderBy: { document_date: "desc" } }),
    prisma.productGroup.findMany({ select: { id: true, title: true } }),
    prisma.contact.findMany({ select: { id: true, name: true } }),
    prisma.warehouse.findMany({ select: { id: true, name: true } }),
  ]);
  
  return { products, docs, groups, contacts, warehouses };
}
