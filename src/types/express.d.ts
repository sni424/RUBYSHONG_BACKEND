import 'express';
import { UserRole } from '@prisma/client';

declare module 'express-serve-static-core' {
  interface Request {
    admin?: {
      id: number;
      email: string;
      role: string;
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      // 관리자 로그인 후 adminAuth.middleware.ts에서 넣어주는 관리자 정보
      adminUser?: {
        id: number;
        email: string;
        role: UserRole;
      };
      user?: {
        id: number;
        email: string;
        name: string;
        phone: string | null;
        phoneVerified?: boolean;
      };
    }
  }
}
