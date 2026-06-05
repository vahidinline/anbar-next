"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function registerUser(email: string, password: string) {
  try {
    const existing = await prisma.profile.findUnique({
      where: { email },
    });
    if (existing) {
      return { error: "این ایمیل قبلا ثبت شده است" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.profile.create({
      data: {
        email,
        password: hashedPassword,
        is_active: true,
      },
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || "خطا در ثبت نام" };
  }
}
