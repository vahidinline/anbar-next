"use server";

import { prisma } from "@/lib/prisma";

export async function fetchContactsData() {
  return prisma.contact.findMany({ orderBy: { created_at: "desc" } });
}

export async function saveContact(data: any, userId: string) {
  const { id, name, mobile, phone, address } = data;

  if (id) {
    await prisma.contact.update({
      where: { id },
      data: { name, mobile: mobile || null, phone: phone || null, address: address || null },
    });
  } else {
    await prisma.contact.create({
      data: {
        name,
        mobile: mobile || null,
        phone: phone || null,
        address: address || null,
        user_id: userId,
      },
    });
  }
  return { success: true };
}

export async function deleteContact(id: string) {
  await prisma.contact.delete({ where: { id } });
  return { success: true };
}
