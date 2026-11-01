import { supabase } from "../services/supabase";

export const PRODUCT_AVAILABILITY_KEY = "yakinhome_product_availability";
export const PRODUCT_AVAILABILITY_EVENT = "yakinhome-product-availability-updated";

export type ProductAvailabilityMap = Record<number, boolean>;

type ProductAvailabilityRow = {
  product_id: number;
  available: boolean;
};

// ── BUS DE COMUNICAÇÃO LOCAL INSTANTÂNEA ENTRE ABAS ──
const localAvailabilityBroadcast =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("yakinhome_availability_bus")
    : null;

if (localAvailabilityBroadcast) {
  localAvailabilityBroadcast.onmessage = (event) => {
    if (event.data?.availability) {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(PRODUCT_AVAILABILITY_KEY, JSON.stringify(event.data.availability));
        } catch {
          // ignore
        }
      }
      notifyProductAvailabilityUpdated();
      notifyAvailabilitySubscribers();
    }
  };
}

const availabilitySubscribers = new Set<() => void>();
let globalAvailabilityChannel: ReturnType<typeof supabase.channel> | null = null;

function notifyAvailabilitySubscribers() {
  availabilitySubscribers.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error(e);
    }
  });
}

function notifyProductAvailabilityUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PRODUCT_AVAILABILITY_EVENT));
}

export function getProductAvailability(): ProductAvailabilityMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PRODUCT_AVAILABILITY_KEY);
    return raw ? (JSON.parse(raw) as ProductAvailabilityMap) : {};
  } catch {
    return {};
  }
}

function saveLocalProductAvailability(availability: ProductAvailabilityMap, broadcastAcrossTabs = true) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PRODUCT_AVAILABILITY_KEY, JSON.stringify(availability));
  notifyProductAvailabilityUpdated();
  if (broadcastAcrossTabs && localAvailabilityBroadcast) {
    try {
      localAvailabilityBroadcast.postMessage({ availability });
    } catch {
      // ignore
    }
  }
}

function rowsToAvailability(rows: ProductAvailabilityRow[]): ProductAvailabilityMap {
  return rows.reduce<ProductAvailabilityMap>((acc, row) => {
    acc[row.product_id] = row.available;
    return acc;
  }, {});
}

export async function fetchProductAvailability(): Promise<ProductAvailabilityMap> {
  try {
    const { data, error } = await supabase
      .from("product_availability")
      .select("product_id, available");

    if (error) throw error;

    const availability = rowsToAvailability(data ?? []);
    saveLocalProductAvailability(availability, false);
    return availability;
  } catch (error) {
    console.warn("Nao foi possivel carregar estoque do Supabase.", error);
    return getProductAvailability();
  }
}

export async function setProductAvailability(
  productId: number,
  available: boolean
): Promise<ProductAvailabilityMap> {
  const current = getProductAvailability();
  const next = { ...current, [productId]: available };
  saveLocalProductAvailability(next);
  notifyAvailabilitySubscribers();

  try {
    const { error } = await supabase
      .from("product_availability")
      .upsert(
        { product_id: productId, available, updated_at: new Date().toISOString() },
        { onConflict: "product_id" }
      );

    if (error) throw error;
  } catch (error) {
    console.warn("Nao foi possivel salvar estoque no Supabase.", error);
  }

  // Notifica via broadcast WebSocket do Supabase para todos os clientes
  try {
    ensureAvailabilityChannel();
    if (globalAvailabilityChannel) {
      globalAvailabilityChannel.send({
        type: "broadcast",
        event: "availability-updated",
        payload: { productId, available, next },
      });
    }
  } catch {
    // ignore
  }

  return next;
}

function ensureAvailabilityChannel() {
  if (typeof window === "undefined" || globalAvailabilityChannel) return;

  try {
    globalAvailabilityChannel = supabase
      .channel("product-availability-bus", {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "availability-updated" }, async (payload: any) => {
        if (payload?.payload?.next) {
          saveLocalProductAvailability(payload.payload.next, false);
        } else {
          await fetchProductAvailability();
        }
        notifyAvailabilitySubscribers();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_availability" },
        async () => {
          await fetchProductAvailability();
          notifyAvailabilitySubscribers();
        }
      )
      .subscribe();
  } catch (err) {
    console.warn("Nao foi possivel conectar canal de estoque:", err);
  }
}

export function subscribeProductAvailability(onChange: () => void) {
  availabilitySubscribers.add(onChange);
  ensureAvailabilityChannel();

  return () => {
    availabilitySubscribers.delete(onChange);
    if (availabilitySubscribers.size === 0 && globalAvailabilityChannel) {
      try {
        supabase.removeChannel(globalAvailabilityChannel);
      } catch {
        // ignore
      }
      globalAvailabilityChannel = null;
    }
  };
}
