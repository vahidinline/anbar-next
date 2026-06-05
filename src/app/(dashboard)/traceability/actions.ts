"use server";

import { prisma } from "@/lib/prisma";

export async function fetchTraceabilityData() {
  const [serials, products, groups, warehouses, docs, contacts] = await Promise.all([
    prisma.serialNumber.findMany({ orderBy: { created_at: "desc" } }),
    prisma.product.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        product_group_id: true,
        die_material: true,
        tracking_notes: true,
        unit: true,
      },
    }),
    prisma.productGroup.findMany({ select: { id: true, title: true } }),
    prisma.warehouse.findMany({ select: { id: true, name: true } }),
    prisma.inventoryDocument.findMany({
      select: {
        id: true,
        doc_number: true,
        document_date: true,
        document_type: true,
        contact_id: true,
      },
    }),
    prisma.contact.findMany({ select: { id: true, name: true } }),
  ]);

  return { serials, products, groups, warehouses, docs, contacts };
}
