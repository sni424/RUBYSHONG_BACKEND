import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

// 관리자 JWT 인증
export const authAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Authorization 헤더에서 토큰 가져오기
    const authHeader = req.headers.authorization;

    // Bearer 토큰이 없으면 요청 거절
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다.',
      });
    }

    // Bearer 뒤의 실제 토큰만 추출
    const token = authHeader.replace('Bearer ', '');

    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      email: string;
      role: string;
    };

    // 다음 미들웨어에서 사용할 수 있게 관리자 정보 저장
    req.admin = decoded;

    next();
  } catch (error) {
    console.error('관리자 인증 실패:', error);

    return res.status(401).json({
      success: false,
      message: '유효하지 않은 인증입니다.',
    });
  }
};
