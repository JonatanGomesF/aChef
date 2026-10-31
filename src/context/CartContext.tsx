import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import type { ReactNode } from "react";

export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  size: string;
  image: string;

  quantity?: number;

  observation?: string;

  extras?: {
    id: number | string;
    name: string;
    price: number;
    category?: string;
  }[];

  promotionalPrice?: number;
  promotionActive?: boolean;
};
export type CartItem = Product & {
  quantity: number;
};

type CartContextType = {
  cartItems: CartItem[];

  addToCart: (product: Product) => void;

  removeFromCart: (id: number) => void;

  increaseQuantity: (id: number) => void;

  decreaseQuantity: (id: number) => void;

  clearCart: () => void;

  totalPrice: number;

  totalItems: number;
};

const CartContext = createContext<CartContextType | null>(null);

type ProviderProps = {
  children: ReactNode;
};

export function CartProvider({ children }: ProviderProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Carrega do LocalStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("yakinhome-cart");

    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  // Salva no LocalStorage
  useEffect(() => {
    localStorage.setItem(
      "yakinhome-cart",
      JSON.stringify(cartItems)
    );
  }, [cartItems]);

  const addToCart = (product: Product) => {
    setCartItems((currentItems) => {
      const serializeExtras = (exts?: { id: number | string }[]) =>
        (exts || []).map((e) => String(e.id)).sort().join(",");

      const existingItem = currentItems.find(
        (item) =>
          item.id === product.id &&
          item.size === product.size &&
          (item.observation || "") === (product.observation || "") &&
          serializeExtras(item.extras) === serializeExtras(product.extras)
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item === existingItem
            ? {
              ...item,
              quantity:
                item.quantity +
                (product.quantity || 1),
            }
            : item
        );
      }

      return [
        ...currentItems,
        {
          ...product,

          price:
            product.promotionActive &&
              product.promotionalPrice
              ? product.promotionalPrice
              : product.price,

          quantity:
            product.quantity || 1,
        },
      ];
    });
  };
  const removeFromCart = (id: number) => {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.id !== id)
    );
  };

  const increaseQuantity = (id: number) => {
    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
            ...item,
            quantity: item.quantity + 1,
          }
          : item
      )
    );
  };

  const decreaseQuantity = (id: number) => {
    setCartItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === id
            ? {
              ...item,
              quantity: item.quantity - 1,
            }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalPrice = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const totalItems = cartItems.reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        totalPrice,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart deve ser usado dentro de CartProvider"
    );
  }

  return context;
}