// Type definitions for database entities and actions

export interface User {
  id: number;
  clerk_id: string;
  email: string;
  username: string | null;
  coins: number;
  image_url: string | null;
  title: string | null;
  bio: string | null;
  height: string | null;
  weight: string | null;
  equipped_badge: string | null;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  item_type: string | null;
}

export interface CartItem {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  name?: string;
  price?: number;
  image_url?: string;
  category?: string;
}

export interface Order {
  id: number;
  user_id: number;
  total_price: number;
  status: string;
  address: string;
  created_at?: Date;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface DatabaseError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
}
