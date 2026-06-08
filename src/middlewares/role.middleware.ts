import { Request, Response, NextFunction } from 'express';

// 특정 role만 접근 허용
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const admin = req.admin;

    if (!admin || !allowedRoles.includes(admin.role)) {
      return res.status(403).json({
        success: false,
        message: '권한이 없습니다.',
      });
    }

    next();
  };
};
