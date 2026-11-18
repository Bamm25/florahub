import type { CartItem } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// Interface data produk minimal saat ditambahkan ke keranjang belanja
interface AddToCartProduct {
  id: string;
  name: string;
  price: number;
  image: string | null;
  stock: number;
  floristId: string;
}

// Interface state dan aksi untuk store keranjang belanja
interface CartStore {
  items: CartItem[];
  _hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  addItem: (product: AddToCartProduct, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

function clampQuantity(qty: number, stock: number): number {
  const normalized = Math.max(1, Math.floor(qty));
  return stock > 0 ? Math.min(normalized, stock) : normalized;
}

// Hook Zustand untuk mengelola state keranjang belanja dengan persistensi data
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      _hasHydrated: false,
      setHasHydrated: (hydrated: boolean) => {
        set({ _hasHydrated: hydrated });
      },
      // Tambah item ke keranjang atau perbarui kuantitas jika sudah ada
      addItem: (product: AddToCartProduct, quantity: number = 1) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.productId === product.id,
          );
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.productId === product.id
                  ? {
                      ...item,
                      stock: product.stock,
                      price: product.price,
                      quantity: clampQuantity(
                        item.quantity + quantity,
                        product.stock,
                      ),
                    }
                  : item,
              ),
            };
          }

          const newItem: CartItem = {
            productId: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: clampQuantity(quantity, product.stock),
            stock: product.stock,
            floristId: product.floristId,
          };

          return { items: [...state.items, newItem] };
        });
      },
      // Hapus item dari keranjang berdasarkan ID produk
      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },
      // Perbarui kuantitas item produk tertentu di keranjang
      updateQuantity: (productId: string, quantity: number) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId
              ? { ...item, quantity: clampQuantity(quantity, item.stock) }
              : item,
          ),
        }));
      },
      // Kosongkan seluruh isi keranjang belanja
      clearCart: () => {
        set({ items: [] });
      },
      getTotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
      getItemCount: () => {
        const { items } = get();
        return items.length; // Menghitung jumlah item unik, bukan total quantity
      },
    }),
    {
      name: "florahub-cart",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
