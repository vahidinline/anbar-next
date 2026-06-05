"use server";

import { prisma } from "@/lib/prisma";

export async function fetchWarehousesData() {
  return prisma.warehouse.findMany({ orderBy: { created_at: "desc" } });
}

export async function saveWarehouse(data: any, userId: string) {
  const { id, name, description } = data;
  
  if (id) {
    await prisma.warehouse.update({
      where: { id },
      data: { name, description: description || null },
    });
  } else {
    await prisma.warehouse.create({
      data: { name, description: description || null, user_id: userId },
    });
  }
  return { success: true };
}

export async function deleteWarehouse(id: string) {
  await prisma.warehouse.delete({ where: { id } });
  return { success: true };
}
