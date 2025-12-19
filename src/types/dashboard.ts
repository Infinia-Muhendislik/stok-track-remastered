export type OrderStatus =
  | "Pending"
  | "Approved"
  | "Shipped"
  | "Delivered"
  | "Canceled";

export type OrderItem = {
  productName: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: string;
  customer: string;
  amount: number;
  status: OrderStatus;
  date: string;
  invoiceUrl?: string | null;
  items?: OrderItem[];
};

export type ProductStatus = "In Stock" | "Low Stock" | "Out of Stock";

export type Product = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  minStock?: number;
  unit?: string;
  supplier?: string | null;
  description?: string | null;
  location?: string | null;
  status: ProductStatus;
};

export type SalesPoint = {
  name: string;
  sales: number;
};

export type RevenuePoint = {
  name: string;
  revenue: number;
};

export type CategorySlice = {
  name: string;
  value: number;
};

export type StatTile = {
  title: string;
  value: string;
  change: string;
  trendColor: string;
};
