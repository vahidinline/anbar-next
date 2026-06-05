"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next-auth";

export async function fetchDocumentsData() {
  const [docs, products, groups, contacts, warehouses] = await Promise.all([
    prisma.inventoryDocument.findMany({ orderBy: { doc_number: "desc" } }),
    prisma.product.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        product_group_id: true,
        unit: true,
        initial_quantity: true,
        is_serial_tracked: true,
        warehouse_id: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.productGroup.findMany({ select: { id: true, title: true } }),
    prisma.contact.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return { docs, products, groups, contacts, warehouses };
}

export async function fetchProductSerials(productId: string) {
  return prisma.serialNumber.findMany({
    where: { product_id: productId },
    orderBy: { created_at: "desc" },
  });
}

export async function fetchDocumentSerials(docId: string, type: "incoming" | "outgoing") {
  const col = type === "incoming" ? "inventory_document_id" : "outgoing_document_id";
  return prisma.serialNumber.findMany({
    where: { [col]: docId },
    orderBy: { serial_number: "asc" },
  });
}

export async function saveDocument(data: any, userId: string) {
  // Logic translated from the save function
  const {
    document_type,
    contact_id,
    product_id,
    warehouse_id,
    quantity,
    document_date,
    description,
    isSerial,
    serials, // array of strings
    batch_number,
    proforma_number,
    invoice_number,
  } = data;

  const product = await prisma.product.findUnique({ where: { id: product_id } });
  if (!product) throw new Error("Product not found");

  return await prisma.$transaction(async (tx: any) => {
    // 1. Get the max doc_number to auto-increment since Prisma schema uses Int
    // Assuming doc_number is auto-incremented or generated manually if not provided
    // Wait, the original supabase schema for inventory_documents doc_number might have been an identity column.
    // If Prisma doesn't auto-increment it because there's no @default(autoincrement()), we need to generate it.
    // Let's check prisma schema: doc_number Int (no default). So we must provide it or it's auto-generated in db?
    // Supabase has identity by default. Prisma doesn't know it. We'll find max and add 1.
    const maxDoc = await tx.inventoryDocument.aggregate({ _max: { doc_number: true } });
    const nextDocNum = (maxDoc._max.doc_number || 1000) + 1;

    if (isSerial && document_type === "outgoing") {
      const existing = await tx.serialNumber.findMany({
        where: { serial_number: { in: serials } },
      });
      const map = new Map<string, any>(existing.map((r: any) => [r.serial_number, r]));
      for (const s of serials) {
        const row = map.get(s);
        if (!row) throw new Error(`سریال «${s}» در سیستم ثبت نشده است`);
        if (row.product_id !== product_id) throw new Error(`سریال «${s}» متعلق به کالای دیگری است`);
        if (row.warehouse_id !== warehouse_id)
          throw new Error(`سریال «${s}» در انبار انتخاب شده موجود نیست`);
        if (row.status !== "available")
          throw new Error(`سریال «${s}» در دسترس نیست (وضعیت: ${row.status})`);
      }
    }

    if (isSerial && document_type === "incoming") {
      const dups = await tx.serialNumber.findMany({
        where: { serial_number: { in: serials } },
      });
      if (dups.length > 0)
        throw new Error(`سریال تکراری: ${dups.map((d: any) => d.serial_number).join("، ")}`);
    }

    const doc = await tx.inventoryDocument.create({
      data: {
        doc_number: nextDocNum,
        user_id: userId,
        document_type,
        contact_id: contact_id || null,
        product_id,
        product_group_id: product.product_group_id || null,
        warehouse_id: warehouse_id || null,
        quantity,
        unit: product.unit || null,
        document_date,
        description: description || null,
      },
    });

    if (isSerial) {
      if (document_type === "incoming") {
        await tx.serialNumber.createMany({
          data: serials.map((s: string) => ({
            user_id: userId,
            product_id,
            serial_number: s,
            batch_number: batch_number || null,
            proforma_number: proforma_number || null,
            invoice_number: invoice_number || null,
            inventory_document_id: doc.id,
            warehouse_id: warehouse_id || null,
            status: "available",
          })),
        });
      } else {
        await tx.serialNumber.updateMany({
          where: { serial_number: { in: serials } },
          data: { status: "out", outgoing_document_id: doc.id },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        action: "create",
        entity: "inventory_document",
        entity_id: doc.id,
        user_id: userId,
        details: JSON.stringify({ type: document_type, quantity, product_id }),
      },
    });

    return doc;
  });
}

export async function deleteDocument(
  docId: string,
  documentType: "incoming" | "outgoing",
  docNumber: number,
  userId: string,
) {
  return await prisma.$transaction(async (tx: any) => {
    if (documentType === "outgoing") {
      await tx.serialNumber.updateMany({
        where: { outgoing_document_id: docId },
        data: { status: "available", outgoing_document_id: null },
      });
    } else if (documentType === "incoming") {
      await tx.serialNumber.deleteMany({
        where: { inventory_document_id: docId },
      });
    }

    await tx.inventoryDocument.delete({ where: { id: docId } });

    await tx.auditLog.create({
      data: {
        action: "delete",
        entity: "inventory_document",
        entity_id: docId,
        user_id: userId,
        details: JSON.stringify({ doc_number: docNumber, type: documentType }),
      },
    });

    return true;
  });
}
