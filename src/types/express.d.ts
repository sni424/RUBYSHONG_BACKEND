import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    admin?: {
      id: number;
      email: string;
      role: string;
    };
  }
}
