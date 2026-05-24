import { Router, type Request, type Response } from 'express';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const admin = await prisma.adminUser.findUnique({
    where: {
      email,
    },
  });

  if (!admin) {
    return res.status(401).json({
      success: false,
      message: '존재하지 않는 계정입니다.',
    });
  }

  const isMatch = await bcrypt.compare(password, admin.password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: '비밀번호가 올바르지 않습니다.',
    });
  }

  const token = jwt.sign(
    {
      adminId: admin.id,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: '7d',
    },
  );

  res.json({
    success: true,
    token,
  });
});

export default router;
