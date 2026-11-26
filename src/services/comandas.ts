import { supabase } from "./supabase";
import type { ReceiptOrderData } from "./usbPrinter";

export type ComandaStatus = "open" | "closed";

export type Comanda = {
  id: number;
  code: string;
  label: string;
  status: ComandaStatus;
  items_count: number;
  total_amount: number;
  opened_by: string;
  opened_at: string;
  closed_by: string | null;
  closed_at: string | null;
  payment_method: string | null;
  change_for: number | null;
  notes: string;
  order_id: number | null;
  close_token?: string | null;
  updated_at: string;
};

export type ComandaItem = {
  id: number;
  comanda_id: number;
  product_key: string;
  product_name: string;
  product_size: string | null;
  category: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  is_balcao_only: boolean;
  observation: string;
  added_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type ComandaHistoryAction =
  | "opened"
  | "item_added"
  | "item_updated"
  | "item_removed"
  | "notes_updated"
  | "closed";

export type ComandaHistoryEntry = {
  id: number;
  comanda_id: number;
  action: ComandaHistoryAction;
  product_name: string | null;
  old_quantity: number | null;
  new_quantity: number | null;
  unit_price: number | null;
  details: string;
  actor_email: string;
  created_at: string;
};

export type CloseComandaResult = {
  comanda: Comanda;
  order: ReceiptOrderData | null;
  already_closed?: boolean;
};

export function getErrorMessage(error: unknown, fallback = "Erro inesperado."): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

export function isMissingComandasSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string; details?: string };
  const code = String(err.code || "").toUpperCase();
  const msg = `${err.message || ""} ${err.details || ""}`.toLowerCase();

  return (
    code === "42P01" ||
    code === "42883" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the function") ||
    msg.includes("relation \"public.comandas\" does not exist") ||
    msg.includes("relation \"comandas\" does not exist")
  );
}

export function formatActorName(email?: string | null): string {
  if (!email) return "Equipe";
  const local = email.split("@")[0] || email;
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function generateCloseToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `close-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function fetchComandas(): Promise<Comanda[]> {
  const { data, error } = await supabase
    .from("comandas")
    .select("*")
    .order("status", { ascending: true })
    .order("opened_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as Comanda[];
}

export async function fetchComandaDetails(comandaId: number): Promise<{
  items: ComandaItem[];
  history: ComandaHistoryEntry[];
}> {
  const [itemsRes, historyRes] = await Promise.all([
    supabase
      .from("comanda_items")
      .select("*")
      .eq("comanda_id", comandaId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("comanda_history")
      .select("*")
      .eq("comanda_id", comandaId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(100),
  ]);

  if (itemsRes.error) throw itemsRes.error;
  if (historyRes.error) throw historyRes.error;

  return {
    items: (itemsRes.data ?? []) as ComandaItem[],
    history: (historyRes.data ?? []) as ComandaHistoryEntry[],
  };
}

export async function openComanda(label: string, notes = ""): Promise<Comanda> {
  const cleanLabel = label.trim();
  if (!cleanLabel) {
    throw new Error("Informe a identificação da comanda (ex: Mesa 01, João, Varanda).");
  }

  const { data, error } = await supabase.rpc("open_comanda", {
    p_label: cleanLabel,
    p_notes: notes.trim(),
  });

  if (error) throw error;
  return data as Comanda;
}

export async function addComandaItem(params: {
  comandaId: number;
  productKey: string;
  productName: string;
  productSize?: string;
  category: string;
  unitPrice: number;
  quantity: number;
  isBalcaoOnly: boolean;
  observation?: string;
}): Promise<Comanda> {
  const { data, error } = await supabase.rpc("add_comanda_item", {
    p_comanda_id: params.comandaId,
    p_product_key: params.productKey,
    p_product_name: params.productName,
    p_product_size: params.productSize || null,
    p_category: params.category || "",
    p_unit_price: Number(params.unitPrice) || 0,
    p_quantity: Math.max(1, Math.floor(Number(params.quantity) || 1)),
    p_is_balcao_only: Boolean(params.isBalcaoOnly),
    p_observation: (params.observation || "").trim(),
  });

  if (error) throw error;
  return data as Comanda;
}

export async function updateComandaItemQty(
  itemId: number,
  newQuantity: number
): Promise<Comanda> {
  const { data, error } = await supabase.rpc("update_comanda_item_qty", {
    p_item_id: itemId,
    p_new_quantity: Math.max(0, Math.floor(Number(newQuantity) || 0)),
  });

  if (error) throw error;
  return data as Comanda;
}

export async function removeComandaItem(itemId: number): Promise<Comanda> {
  const { data, error } = await supabase.rpc("remove_comanda_item", {
    p_item_id: itemId,
  });

  if (error) throw error;
  return data as Comanda;
}

export async function updateComandaNotes(
  comandaId: number,
  notes: string
): Promise<Comanda> {
  const { data, error } = await supabase.rpc("update_comanda_notes", {
    p_comanda_id: comandaId,
    p_notes: notes.trim(),
  });

  if (error) throw error;
  return data as Comanda;
}

export async function deleteEmptyComanda(comandaId: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("delete_empty_comanda", {
    p_comanda_id: comandaId,
  });

  if (error) throw error;
  return Boolean(data);
}

export async function closeComanda(params: {
  comandaId: number;
  paymentMethod: string;
  changeFor: number | null;
  notes?: string;
  closeToken: string;
}): Promise<CloseComandaResult> {
  const { data, error } = await supabase.rpc("close_comanda", {
    p_comanda_id: params.comandaId,
    p_payment_method: params.paymentMethod,
    p_change_for: params.changeFor,
    p_notes: (params.notes || "").trim(),
    p_close_token: params.closeToken,
  });

  if (error) throw error;
  return data as CloseComandaResult;
}

export function subscribeComandasRealtime(handlers: {
  onComandasChange: () => void;
  onComandaItemsChange: (comandaId?: number) => void;
  onComandaHistoryChange: (comandaId?: number) => void;
}): () => void {
  const channel = supabase
    .channel(`comandas-realtime-${Date.now()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comandas" },
      () => {
        handlers.onComandasChange();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comanda_items" },
      (payload) => {
        const record = (payload.new || payload.old) as { comanda_id?: number } | undefined;
        handlers.onComandaItemsChange(record?.comanda_id);
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "comanda_history" },
      (payload) => {
        const record = (payload.new || payload.old) as { comanda_id?: number } | undefined;
        handlers.onComandaHistoryChange(record?.comanda_id);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
