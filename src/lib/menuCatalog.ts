import { products, type Product, type ProductExtra } from "../data/products";
import { getDefaultExtrasForProduct } from "../data/extras";
import { supabase } from "../services/supabase";

export type { ProductExtra };

export type MenuCategory = {
  id: string;
  name: string;
  order: number;
  available?: boolean;
};

export type MenuProduct = Product & {
  categoryId: string;
  order: number;
  available?: boolean;
  extras?: ProductExtra[];
};

export type MenuCatalog = {
  categories: MenuCategory[];
  products: MenuProduct[];
};

export const MENU_CATALOG_STORAGE_KEY = "yakinhome_menu_catalog";
export const MENU_CATALOG_EVENT = "yakinhome-menu-catalog-updated";
const DEFAULT_CATEGORY_ID = "yakissobas";

export function normalizeCatalog(catalog: MenuCatalog): MenuCatalog {
  return {
    categories: [...(catalog.categories || [])].sort((a, b) => a.order - b.order),
    products: [...(catalog.products || [])]
      .map((p) => ({
        ...p,
        extras: Array.isArray(p.extras) ? p.extras : undefined,
      }))
      .sort((a, b) => a.order - b.order),
  };
}

export function getDefaultMenuCatalog(): MenuCatalog {
  const categories: MenuCategory[] = [
    { id: "yakissobas", name: "Yakissobas", order: 0 },
    { id: "marmitas", name: "Marmitas", order: 1 },
    { id: "hot-sushi", name: "Hot & Sushi", order: 2 },
  ];
  return normalizeCatalog({
    categories,
    products: products.map((product, index) => ({
      ...product,
      categoryId: product.categoryId || DEFAULT_CATEGORY_ID,
      order: index,
      extras: product.extras ?? getDefaultExtrasForProduct(product.name),
    })),
  });
}

function notifyMenuCatalogUpdated(catalog: MenuCatalog) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MENU_CATALOG_EVENT, { detail: catalog })
  );
}

/**
 * Retorna o cardápio atual do localStorage ou o padrão caso ainda não exista.
 * Importante: NÃO ressurge itens deletados! O que o usuário salvou é a verdade.
 */
export function getMenuCatalog(): MenuCatalog {
  if (typeof localStorage === "undefined") return getDefaultMenuCatalog();

  try {
    const raw = localStorage.getItem(MENU_CATALOG_STORAGE_KEY);
    if (!raw) return getDefaultMenuCatalog();

    const parsed = JSON.parse(raw) as MenuCatalog;
    if (!Array.isArray(parsed?.categories) || !Array.isArray(parsed?.products)) {
      return getDefaultMenuCatalog();
    }

    return normalizeCatalog(parsed);
  } catch {
    return getDefaultMenuCatalog();
  }
}

// ── BUS DE COMUNICAÇÃO LOCAL INSTANTÂNEA ENTRE ABAS (BROADCASTCHANNEL) ──
const localBroadcast =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("yakinhome_menu_catalog_bus")
    : null;

if (localBroadcast) {
  localBroadcast.onmessage = (event) => {
    if (event.data?.catalog) {
      const normalized = normalizeCatalog(event.data.catalog);
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(MENU_CATALOG_STORAGE_KEY, JSON.stringify(normalized));
        } catch {
          // ignore
        }
      }
      notifyMenuCatalogUpdated(normalized);
      notifySubscribers(normalized);
    }
  };
}

/**
 * Salva localmente no localStorage e emite evento de sincronização instantânea
 */
export function saveLocalMenuCatalog(catalog: MenuCatalog, broadcastAcrossTabs = true): MenuCatalog {
  const normalized = normalizeCatalog(catalog);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(MENU_CATALOG_STORAGE_KEY, JSON.stringify(normalized));
    } catch (err) {
      console.warn("Aviso ao salvar cardápio no localStorage:", err);
    }
  }
  notifyMenuCatalogUpdated(normalized);
  if (broadcastAcrossTabs && localBroadcast) {
    try {
      localBroadcast.postMessage({ catalog: normalized });
    } catch {
      // ignore
    }
  }
  return normalized;
}

/**
 * Busca o cardápio mais recente do Supabase (nuvem) e atualiza o cache local.
 * Utiliza a tabela 'site_theme' (linha id: 2), que possui leitura pública (anon)
 * e escrita autenticada para administrador.
 */
export async function fetchMenuCatalog(): Promise<MenuCatalog> {
  try {
    const { data, error } = await supabase
      .from("site_theme")
      .select("theme_data")
      .eq("id", 2)
      .maybeSingle();

    if (!error && data?.theme_data) {
      const parsed = (data.theme_data.catalog || data.theme_data) as MenuCatalog;
      if (Array.isArray(parsed?.categories) && Array.isArray(parsed?.products)) {
        return saveLocalMenuCatalog(parsed, false);
      }
    }

    return getMenuCatalog();
  } catch (error) {
    console.warn("Não foi possível carregar cardápio do Supabase:", error);
    return getMenuCatalog();
  }
}

/**
 * Salva o cardápio tanto localmente quanto no Supabase.
 * Salva localmente primeiro para resposta instantânea na UI, depois sincroniza na nuvem
 * e dispara broadcast em tempo real para todos os clientes conectados.
 */
export async function saveMenuCatalog(
  catalog: MenuCatalog
): Promise<{ success: boolean; catalog: MenuCatalog; error?: string }> {
  const normalized = saveLocalMenuCatalog(catalog);
  let savedToRemote = false;
  let remoteError: string | undefined;

  try {
    const { error: themeError } = await supabase.from("site_theme").upsert({
      id: 2,
      theme_data: {
        catalog: normalized,
      },
      updated_at: new Date().toISOString(),
    });

    if (themeError) {
      console.warn("Aviso ao sincronizar cardápio no site_theme (Supabase):", themeError.message);
      remoteError = themeError.message;
    } else {
      savedToRemote = true;
    }
  } catch (err: any) {
    console.warn("Erro ao salvar cardápio no Supabase:", err);
    remoteError = err?.message || String(err);
  }

  // Notifica assinantes locais da aba
  notifySubscribers(normalized);

  // Envia broadcast em tempo real via WebSocket do Supabase para todos os clientes conectados
  try {
    ensureRealtimeSubscription();
    if (globalRealtimeChannel) {
      globalRealtimeChannel.send({
        type: "broadcast",
        event: "menu-catalog-updated",
        payload: { catalog: normalized, timestamp: Date.now() },
      });
    }
  } catch (e) {
    console.warn("Aviso ao enviar broadcast realtime:", e);
  }

  return {
    success: savedToRemote,
    catalog: normalized,
    error: savedToRemote ? undefined : remoteError,
  };
}

// ── GERENCIADOR SINGLETON DE REALTIME PARA EVITAR ERRO DE CANAL DUPLICADO ──
const subscribers = new Set<(catalog: MenuCatalog) => void>();
let globalRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;

function notifySubscribers(catalog: MenuCatalog) {
  subscribers.forEach((callback) => {
    try {
      callback(catalog);
    } catch (e) {
      console.error("Erro no callback do realtime de cardápio:", e);
    }
  });
}

function ensureRealtimeSubscription() {
  if (typeof window === "undefined" || globalRealtimeChannel) return;

  try {
    globalRealtimeChannel = supabase
      .channel("menu-catalog-realtime-bus", {
        config: {
          broadcast: { self: false },
        },
      })
      // 1. Escuta Broadcast direto via WebSocket (instantâneo entre dispositivos)
      .on("broadcast", { event: "menu-catalog-updated" }, async (payload: any) => {
        const remoteCatalog = payload?.payload?.catalog;
        if (remoteCatalog && Array.isArray(remoteCatalog.categories) && Array.isArray(remoteCatalog.products)) {
          const saved = saveLocalMenuCatalog(remoteCatalog, false);
          notifySubscribers(saved);
        } else {
          const latest = await fetchMenuCatalog();
          notifySubscribers(latest);
        }
      })
      // 2. Escuta alterações no banco de dados Postgres (fallback se realtime DB ativo)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_theme" },
        async (payload: any) => {
          if (!payload?.new || (payload.new as any).id === 2) {
            const latest = await fetchMenuCatalog();
            notifySubscribers(latest);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Cardápio] Canal realtime sincronizado com sucesso.");
        }
      });
  } catch (err) {
    console.warn("Não foi possível iniciar canal realtime do cardápio:", err);
  }
}

/**
 * Registra um callback para ouvir alterações em tempo real do cardápio via Supabase
 */
export function subscribeMenuCatalog(onChange: (catalog: MenuCatalog) => void) {
  subscribers.add(onChange);
  ensureRealtimeSubscription();

  return () => {
    subscribers.delete(onChange);
    if (subscribers.size === 0 && globalRealtimeChannel) {
      try {
        supabase.removeChannel(globalRealtimeChannel);
      } catch (err) {
        console.warn("Erro ao remover canal de realtime:", err);
      }
      globalRealtimeChannel = null;
    }
  };
}

/**
 * Redefine o cardápio para os itens originais de fábrica
 */
export async function resetMenuCatalog(): Promise<MenuCatalog> {
  const defaultCatalog = getDefaultMenuCatalog();
  await saveMenuCatalog(defaultCatalog);
  return defaultCatalog;
}

export function createCategoryId(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base || "categoria"}-${Date.now()}`;
}

export function createProductId(catalog: MenuCatalog) {
  const highestId = (catalog.products || []).reduce(
    (max, product) => Math.max(max, product.id),
    0
  );
  return highestId + 1;
}
