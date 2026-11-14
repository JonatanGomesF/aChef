import { supabase } from "../services/supabase";

export type BalcaoProduct = {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  available?: boolean;
  isBalcaoOnly: true;
  created_at?: string;
};

export const BALCAO_STORAGE_KEY = "sabordapraia_balcao_products";
export const BALCAO_EVENT = "sabordapraia-balcao-products-updated";

const DEFAULT_BALCAO_PRODUCTS: BalcaoProduct[] = [
  {
    id: "balcao-1",
    name: "Cerveja Litrão (Skol / Brahma)",
    price: 14.0,
    category: "Bebidas",
    description: "Consumo exclusivo no local (garrafa retornável)",
    available: true,
    isBalcaoOnly: true,
  },
  {
    id: "balcao-2",
    name: "Cigarro (Maço)",
    price: 13.0,
    category: "Tabacaria",
    description: "Venda exclusiva no balcão (+18)",
    available: true,
    isBalcaoOnly: true,
  },
  {
    id: "balcao-3",
    name: "Dose de Cachaça Artesanal",
    price: 6.0,
    category: "Bebidas",
    description: "Dose no balcão",
    available: true,
    isBalcaoOnly: true,
  },
];

const subscribers = new Set<(products: BalcaoProduct[]) => void>();

function notifySubscribers(products: BalcaoProduct[]) {
  subscribers.forEach((fn) => {
    try {
      fn(products);
    } catch {
      // ignore
    }
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BALCAO_EVENT, { detail: products }));
  }
}

// BroadcastChannel para sincronizar instantaneamente entre abas abertas no mesmo navegador
const localBroadcast =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("sabordapraia_balcao_bus")
    : null;

if (localBroadcast) {
  localBroadcast.onmessage = (event) => {
    if (event.data?.products && Array.isArray(event.data.products)) {
      const items = event.data.products as BalcaoProduct[];
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(BALCAO_STORAGE_KEY, JSON.stringify(items));
        } catch {
          // ignore
        }
      }
      notifySubscribers(items);
    }
  };
}

export function getBalcaoProducts(): BalcaoProduct[] {
  if (typeof localStorage === "undefined") return DEFAULT_BALCAO_PRODUCTS;
  try {
    const raw = localStorage.getItem(BALCAO_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BALCAO_STORAGE_KEY, JSON.stringify(DEFAULT_BALCAO_PRODUCTS));
      return DEFAULT_BALCAO_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return DEFAULT_BALCAO_PRODUCTS;
  } catch {
    return DEFAULT_BALCAO_PRODUCTS;
  }
}

export function saveLocalBalcaoProducts(products: BalcaoProduct[]): BalcaoProduct[] {
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(BALCAO_STORAGE_KEY, JSON.stringify(products));
    } catch (err) {
      console.warn("Aviso ao salvar produtos de balcão localmente:", err);
    }
  }
  notifySubscribers(products);
  if (localBroadcast) {
    try {
      localBroadcast.postMessage({ products });
    } catch {
      // ignore
    }
  }
  return products;
}

export async function fetchBalcaoProducts(): Promise<BalcaoProduct[]> {
  try {
    const { data, error } = await supabase
      .from("site_theme")
      .select("theme_data")
      .eq("id", 3)
      .maybeSingle();

    if (!error && data?.theme_data && Array.isArray(data.theme_data.products)) {
      return saveLocalBalcaoProducts(data.theme_data.products);
    }
    return getBalcaoProducts();
  } catch (err) {
    console.warn("Não foi possível carregar produtos de balcão do Supabase:", err);
    return getBalcaoProducts();
  }
}

export async function saveBalcaoProducts(products: BalcaoProduct[]): Promise<BalcaoProduct[]> {
  // Salva localmente primeiro para resposta imediata
  saveLocalBalcaoProducts(products);

  // Tenta sincronizar na nuvem (Supabase site_theme id: 3)
  try {
    await supabase.from("site_theme").upsert({
      id: 3,
      theme_data: {
        products,
        updated_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Aviso ao sincronizar produtos de balcão com Supabase:", err);
  }

  return products;
}

export function subscribeBalcaoProducts(callback: (products: BalcaoProduct[]) => void): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

