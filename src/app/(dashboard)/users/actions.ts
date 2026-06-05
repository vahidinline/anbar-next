"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function fetchUsersData() {
  const [profiles, userRoles] = await Promise.all([
    prisma.profile.findMany({ orderBy: { created_at: "desc" } }),
    prisma.userRole.findMany(),
  ]);

  return { profiles, userRoles };
}

export async function saveUser(data: any, adminId: string) {
  const { id, full_name, phone, is_active, role } = data;

  await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { id },
      data: { full_name, phone, is_active },
    });

    await tx.userRole.deleteMany({ where: { user_id: id } });
    await tx.userRole.create({
      data: { user_id: id, role },
    });

    await tx.auditLog.create({
      data: {
        action: "update",
        entity: "user",
        entity_id: id,
        user_id: adminId,
        details: JSON.stringify({ role, is_active }),
      },
    });
  });

  return { success: true };
}

export async function toggleUserActive(userId: string, currentActive: boolean, adminId: string) {
  const newActive = !currentActive;
  await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { id: userId },
      data: { is_active: newActive },
    });

    await tx.auditLog.create({
      data: {
        action: newActive ? "activate" : "deactivate",
        entity: "user",
        entity_id: userId,
        user_id: adminId,
      },
    });
  });
  return { success: true };
}

export async function inviteUser(data: any, adminId: string) {
  const { email, password, full_name, phone, role } = data;

  const existing = await prisma.profile.findUnique({ where: { email } });
  if (existing) throw new Error("این ایمیل قبلا ثبت شده است");

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    const newUser = await tx.profile.create({
      data: {
        email,
        password: hashedPassword,
        full_name,
        phone,
        is_active: true,
      },
    });

    await tx.userRole.create({
      data: { user_id: newUser.id, role },
    });

    await tx.auditLog.create({
      data: {
        action: "create",
        entity: "user",
        entity_id: newUser.id,
        user_id: adminId,
        details: JSON.stringify({ email, role }),
      },
    });
  });

  return { success: true };
}
