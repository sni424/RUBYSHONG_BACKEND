import 'dotenv/config';

import bcrypt from 'bcryptjs';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const hashedPassword = await bcrypt.hash('1111', 10);

  await prisma.adminUser.create({
    data: {
      email: 'admin@rubyshong.com',
      password: hashedPassword,
    },
  });

  console.log('Seed completed');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
