import type { CartItem } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AddToCartProduct {
  id: string;
  name: string;
  price: number;
  image: string | null;
  stock: number;
  floristId: string;
}

// state + actions
interface CartStore {
  items: CartItem[];
  addItem: (product: AddToCartProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      // Tambah item ke cart / update quantity
      addItem: (product: AddToCartProduct, quantity: number = 1) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.productId === product.id,
          );
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.productId === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              ),
            };
          }

          const newItem: CartItem = {
            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity,
            stock: product.stock,
            floristId: product.floristId,
          };

          return { items: [...state.items, newItem] };
        });
      },
      // Hapus item dari cart by productId
      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },
      // Update quantity item tertentu
      updateQuantity: (productId: string, quantity: number) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item,
          ),
        }));
      },
      // Kosongkan cart setelah checkout
      clearCart: () => {
        set({ items: [] });
      },
      getTotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
      getItemCount: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "florahub-cart",
    },
  ),
);
