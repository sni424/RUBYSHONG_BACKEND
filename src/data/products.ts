import type { Product } from '../types/product';

export const products: Product[] = [
  {
    id: 1,
    name: 'Ruby Point Ring',
    slug: 'ruby-point-ring',
    category: 'ring',
    price: 128000,
    summary: '은은한 루비 포인트가 들어간 데일리 링',
    description: '루비 포인트가 고급스럽게 들어간 데일리 반지입니다.',
    thumbnailUrl: '/images/products/ruby-ring.jpg',
    imageUrls: ['/images/products/ruby-ring.jpg'],
    isNew: true,
    isBest: true,
    isVisible: true,
    stock: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
