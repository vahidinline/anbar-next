"use server";

import { prisma } from "@/lib/prisma";

export async function fetchProductsData() {
  const [products, groups, warehouses] = await Promise.all([
    prisma.product.findMany({ orderBy: { created_at: "desc" } }),
    prisma.productGroup.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.warehouse.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { products, groups, warehouses };
}

export async function saveProduct(data: any, userId: string) {
  const { id, serials, ...payload } = data;

  return await prisma.$transaction(async (tx) => {
    if (id) {
      // Update
      const { code, is_serial_tracked, tracking_notes, ...updatePayload } = payload;
      await tx.product.update({
        where: { id },
        data: updatePayload,
      });
      return { success: true };
    } else {
      // Create
      if (payload.is_serial_tracked && serials && serials.length > 0) {
        const serialNumbers = serials.map((s: any) => s.serial_number.trim());
        const dups = await tx.serialNumber.findMany({
          where: { serial_number: { in: serialNumbers } },
          select: { serial_number: true },
        });

        if (dups.length > 0) {
          throw new Error(`سریال‌های زیر قبلاً ثبت شده‌اند: ${dups.map(d => d.serial_number).join("، ")}`);
        }
      }

      const newProduct = await tx.product.create({
        data: { ...payload, user_id: userId },
      });

      if (payload.is_serial_tracked && serials && serials.length > 0) {
        await tx.serialNumber.createMany({
          data: serials.map((r: any) => ({
            user_id: userId,
            product_id: newProduct.id,
            warehouse_id: payload.warehouse_id || null,
            serial_number: r.serial_number.trim(),
            batch_number: r.batch_number.trim() || null,
            proforma_number: r.proforma_number.trim() || null,
            invoice_number: r.invoice_number.trim() || null,
            status: "available",
          })),
        });
      }
      return { success: true };
    }
  });
}

export async function deleteProduct(productId: string) {
  await prisma.product.delete({
    where: { id: productId },
  });
  return { success: true };
}

export async function fetchProductLabelSerials(productId: string) {
  return prisma.serialNumber.findMany({
    where: { product_id: productId },
    select: { serial_number: true, status: true },
    orderBy: { serial_number: "asc" },
  });
}
