"use server";

import { prisma } from "@/lib/prisma";

export async function fetchProductGroupsData() {
  return prisma.productGroup.findMany({ orderBy: { created_at: "desc" } });
}

export async function saveProductGroup(data: any, userId: string) {
  const { id, title, description } = data;

  if (id) {
    await prisma.productGroup.update({
      where: { id },
      data: { title, description: description || null },
    });
  } else {
    await prisma.productGroup.create({
      data: { title, description: description || null, user_id: userId },
    });
  }
  return { success: true };
}

export async function deleteProductGroup(id: string) {
  await prisma.productGroup.delete({ where: { id } });
  return { success: true };
}
