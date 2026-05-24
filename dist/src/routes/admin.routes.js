"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("@/lib/prisma"));
const router = (0, express_1.Router)();
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const admin = await prisma_1.default.adminUser.findUnique({
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
    const isMatch = await bcryptjs_1.default.compare(password, admin.password);
    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: '비밀번호가 올바르지 않습니다.',
        });
    }
    const token = jsonwebtoken_1.default.sign({
        adminId: admin.id,
    }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
    res.json({
        success: true,
        token,
    });
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map