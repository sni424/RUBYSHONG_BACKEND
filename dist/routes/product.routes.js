"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("@/lib/prisma"));
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    const products = await prisma_1.default.product.findMany({
        where: {
            isVisible: true,
        },
    });
    res.json({
        success: true,
        data: products,
    });
});
router.get('/category/:category', async (req, res) => {
    const { category } = req.params;
    const products = await prisma_1.default.product.findMany({
        where: {
            category,
            isVisible: true,
        },
    });
    res.json({
        success: true,
        data: products,
    });
});
router.get('/:id', async (req, res) => {
    const productId = Number(req.params.id);
    const product = await prisma_1.default.product.findUnique({
        where: {
            id: productId,
        },
    });
    if (!product) {
        return res.status(404).json({
            success: false,
            message: '상품을 찾을 수 없습니다.',
        });
    }
    res.json({
        success: true,
        data: product,
    });
});
router.post('/', async (req, res) => {
    const product = await prisma_1.default.product.create({
        data: req.body,
    });
    res.status(201).json({
        success: true,
        data: product,
    });
});
exports.default = router;
//# sourceMappingURL=product.routes.js.map