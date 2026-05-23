export type ProductCategory = 'ring' | 'necklace' | 'earring' | 'bracelet';

export interface Product {
  id: number;
  name: string;
  slug: string;
  category: ProductCategory;
  price: number;
  salePrice?: number;
  summary: string;
  description: string;
  thumbnailUrl: string;
  imageUrls: string[];
  isNew: boolean;
  isBest: boolean;
  isVisible: boolean;
  stock: number;
  createdAt: string;
  updatedAt: string;
}
