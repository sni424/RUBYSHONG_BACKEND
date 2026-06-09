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

// 추가할 관리자 계정 목록
// owner: 전체 권한, 예약 삭제 가능
// manager: 예약 변경 가능, 삭제 불가
// staff: 예약 변경 가능, 삭제 불가
const adminUsers = [
  {
    email: 'admin@rubyshong.com',
    password: '1111',
    role: 'owner',
  },
  {
    email: 'sni424@rubyshong.com',
    password: '8107',
    role: 'manager',
  },
  {
    email: 'chu8107@rubyshong.com',
    password: '1234',
    role: 'staff',
  },
] as const;

async function main() {
  // 관리자 계정을 하나씩 추가 또는 업데이트
  for (const adminUser of adminUsers) {
    // 비밀번호 해시 생성
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);

    // 이메일이 있으면 업데이트, 없으면 새로 생성
    await prisma.adminUser.upsert({
      where: {
        email: adminUser.email,
      },
      update: {
        password: hashedPassword,
        role: adminUser.role,
      },
      create: {
        email: adminUser.email,
        password: hashedPassword,
        role: adminUser.role,
      },
    });
  }

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
