import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { PrismaLibSql } from '@prisma/adapter-libsql'

const adapter = new PrismaLibSql({
  url: "file:./dev.db",
})

const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'admin@test.com';
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.profile.upsert({
    where: { email },
    update: {
      password: hashedPassword,
    },
    create: {
      email,
      password: hashedPassword,
      full_name: 'Admin User',
      is_active: true,
    },
  });

  // Ensure they have the admin role
  await prisma.userRole.deleteMany({
    where: { user_id: user.id }
  });
  
  await prisma.userRole.create({
    data: {
      user_id: user.id,
      role: 'admin',
    }
  });

  console.log(`Admin user seeded: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });