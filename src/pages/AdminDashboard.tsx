import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../services/supabase";
import AdminLayout from "../components/AdminLayout";
import RevenueGraph from "../components/RevenueGraph";
import {
  ShoppingBag,
  TrendingUp,
  Users,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Clock,
  CheckCircle2,
  Trash2,
  Edit3,
  Search,
  X,
  MapPin,
  Phone,
  DollarSign,
  PackageCheck,
  Eye,
  Calendar,
  ChefHat,
  Truck,
  Check,
  Save,
} from "lucide-react";

export type OrderItem = {
  name: string;
  size?: string;
  quantity: number;
  price: number;
  extras?: Array<{ name: string; price: number }>;
  observation?: string;
  promotionActive?: boolean;
};

export type Order = {
  id: number;
  customer_name: string;
  customer_phone: string;
  street: string;
  number: string;
  district: string;
  items: OrderItem[];
  total: number;
  payment_method: string;
  change_for: number | null;
  status: string;
  notes: string;
  created_at: string;
};

type DayRevenue = { day: string; orders_count: number; revenue: number };

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: any; nextStatus?: string; nextLabel?: string }
> = {
  pending: {
    label: "Pendente",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: Clock,
    nextStatus: "preparing",
    nextLabel: "Preparar",
  },
  preparing: {
    label: "Preparando",
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    icon: ChefHat,
    nextStatus: "delivery",
    nextLabel: "Enviar Entrega",
  },
  delivery: {
    label: "Em Entrega",
    badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    icon: Truck,
    nextStatus: "delivered",
    nextLabel: "Concluir",
  },
  delivered: {
    label: "Concluído",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelado",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    icon: X,
  },
};

const playBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Erro ao tocar beep:", e);
  }
};

function cleanPhone(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getLocalDateString(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Database Ground-Truth state (100% from Supabase)
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);

  // Active filters and search for completed orders
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7days" | "30days">("all");
  const [statusFilter, setStatusFilter] = useState<"delivered" | "all" | "active" | "cancelled">("delivered");

  // Modals state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState<{
    customer_name: string;
    customer_phone: string;
    street: string;
    number: string;
    district: string;
    payment_method: string;
    change_for: string;
    total: string;
    status: string;
    notes: string;
    items: OrderItem[];
  }>({
    customer_name: "",
    customer_phone: "",
    street: "",
    number: "",
    district: "",
    payment_method: "Pix",
    change_for: "",
    total: "0.00",
    status: "delivered",
    notes: "",
    items: [],
  });

  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [viewingItemsOrder, setViewingItemsOrder] = useState<Order | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [advancingId, setAdvancingId] = useState<number | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const knownOrderIdsRef = useRef<Set<number>>(new Set());
  const initialLoadDoneRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 4000);
  };

  // ── Load data directly from Supabase ──
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);

    try {
      const [settingsRes, ordersRes, customersRes] = await Promise.all([
        supabase.from("restaurant_settings").select("is_open").eq("id", 1).single(),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("customers").select("id", { count: "exact", head: true }),
      ]);

      if (settingsRes.data) {
        setIsOpen(Boolean(settingsRes.data.is_open));
      }

      const fetchedOrders: Order[] = ordersRes.data || [];
      setOrders(fetchedOrders);
      setTotalCustomers(customersRes.count ?? 0);

      // Track known order IDs for sound notification on new inserts
      if (!initialLoadDoneRef.current) {
        fetchedOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
        initialLoadDoneRef.current = true;
      }
    } catch (err) {
      console.error("Erro ao carregar dados do Supabase:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Supabase Realtime Subscription: listens to INSERT, UPDATE, DELETE ──
  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as Order;
            setOrders((prev) => {
              if (prev.some((o) => o.id === newOrder.id)) return prev;
              return [newOrder, ...prev];
            });

            if (!knownOrderIdsRef.current.has(newOrder.id)) {
              knownOrderIdsRef.current.add(newOrder.id);
              playBeep();
              showToast(`🔔 Novo pedido #${newOrder.id} de ${newOrder.customer_name || "Cliente"}!`);
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Order;
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            setEditingOrder((cur) => (cur && cur.id === updated.id ? updated : cur));
            setViewingItemsOrder((cur) => (cur && cur.id === updated.id ? updated : cur));
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: number }).id;
            setOrders((prev) => prev.filter((o) => o.id !== deletedId));
            setEditingOrder((cur) => (cur && cur.id === deletedId ? null : cur));
            setDeletingOrder((cur) => (cur && cur.id === deletedId ? null : cur));
            setViewingItemsOrder((cur) => (cur && cur.id === deletedId ? null : cur));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Auto-refresh interval (polling fallback every 10 seconds for consistency) ──
  useEffect(() => {
    const interval = window.setInterval(() => {
      loadData(true);
    }, 10000);
    return () => window.clearInterval(interval);
  }, []);

  // ── Toggle restaurant status ──
  const toggleOpen = async () => {
    setToggling(true);
    const nextState = !isOpen;
    const { error } = await supabase.from("restaurant_settings").update({ is_open: nextState }).eq("id", 1);
    if (!error) {
      setIsOpen(nextState);
      showToast(nextState ? "Restaurante aberto para pedidos!" : "Restaurante pausado / fechado.");
    } else {
      alert("Erro ao alterar status da loja: " + error.message);
    }
    setToggling(false);
  };

  // ── Computed metrics (100% mathematically consistent with orders in memory) ──
  const todayStr = useMemo(() => getLocalDateString(new Date()), []);

  const todayOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status === "cancelled") return false;
      const orderDate = o.created_at ? getLocalDateString(new Date(o.created_at)) : "";
      return orderDate === todayStr;
    });
  }, [orders, todayStr]);

  const todayRevenue = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [todayOrders]);

  const allDeliveredOrders = useMemo(() => {
    return orders.filter((o) => o.status === "delivered");
  }, [orders]);

  const totalDeliveredRevenue = useMemo(() => {
    return allDeliveredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [allDeliveredOrders]);

  const activeOrders = useMemo(() => {
    return orders.filter((o) => ["pending", "preparing", "delivery"].includes(o.status));
  }, [orders]);

  const avgDeliveredTicket = useMemo(() => {
    if (allDeliveredOrders.length === 0) return 0;
    return totalDeliveredRevenue / allDeliveredOrders.length;
  }, [allDeliveredOrders, totalDeliveredRevenue]);

  // ── 7-Day Revenue Graph Data (Computed consistently from loaded orders) ──
  const chartData: DayRevenue[] = useMemo(() => {
    const days: DayRevenue[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayStr = getLocalDateString(d);

      const dayOrders = orders.filter((o) => {
        if (o.status === "cancelled") return false;
        const oDate = o.created_at ? getLocalDateString(new Date(o.created_at)) : "";
        return oDate === dayStr;
      });

      const dayRev = dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      days.push({
        day: dayStr,
        orders_count: dayOrders.length,
        revenue: Number(dayRev.toFixed(2)),
      });
    }

    return days;
  }, [orders]);

  // ── Filtered Orders (Linha a Linha com foco em Concluídos) ──
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayDateStr = getLocalDateString(now);

    let base = orders;
    if (statusFilter === "delivered") {
      base = base.filter((o) => o.status === "delivered");
    } else if (statusFilter === "active") {
      base = base.filter((o) => ["pending", "preparing", "delivery"].includes(o.status));
    } else if (statusFilter === "cancelled") {
      base = base.filter((o) => o.status === "cancelled");
    }

    return base.filter((o) => {
      // Date filter
      if (dateFilter !== "all") {
        const orderDate = new Date(o.created_at);
        const orderDateStr = getLocalDateString(orderDate);

        if (dateFilter === "today" && orderDateStr !== todayDateStr) {
          return false;
        }

        if (dateFilter === "7days") {
          const diffDays = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 7) return false;
        }

        if (dateFilter === "30days") {
          const diffDays = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 30) return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const idMatch = String(o.id).includes(term);
        const nameMatch = (o.customer_name || "").toLowerCase().includes(term);
        const phoneMatch = (o.customer_phone || "").includes(term);
        const districtMatch = (o.district || "").toLowerCase().includes(term);
        const streetMatch = (o.street || "").toLowerCase().includes(term);
        if (!idMatch && !nameMatch && !phoneMatch && !districtMatch && !streetMatch) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, dateFilter, searchTerm]);

  const filteredOrdersRevenue = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + (Number(o.total) || 0), 0);
  }, [filteredOrders]);

  // ── Advance status in active orders ──
  const handleAdvanceStatus = async (orderId: number, nextStatus: string) => {
    setAdvancingId(orderId);
    try {
      const { error } = await supabase.from("orders").update({ status: nextStatus }).eq("id", orderId);
      if (error) throw error;
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
      showToast(`Pedido #${orderId} atualizado para "${STATUS_CONFIG[nextStatus]?.label || nextStatus}" no Supabase!`);
    } catch (err: any) {
      alert("Erro ao avançar pedido no Supabase: " + (err?.message || "Erro"));
    } finally {
      setAdvancingId(null);
    }
  };

  // ── Open Edit Modal ──
  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setEditForm({
      customer_name: order.customer_name || "",
      customer_phone: order.customer_phone || "",
      street: order.street || "",
      number: order.number || "",
      district: order.district || "",
      payment_method: order.payment_method || "Dinheiro",
      change_for: order.change_for != null ? String(order.change_for) : "",
      total: Number(order.total || 0).toFixed(2),
      status: order.status || "delivered",
      notes: order.notes || "",
      items: Array.isArray(order.items) ? JSON.parse(JSON.stringify(order.items)) : [],
    });
  };

  // ── Save Edited Order in Supabase (100% database, 0 localstorage) ──
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    setIsSaving(true);

    try {
      const changeVal =
        editForm.payment_method === "Dinheiro" && editForm.change_for.trim()
          ? parseFloat(editForm.change_for.replace(",", "."))
          : null;

      const payload = {
        customer_name: editForm.customer_name.trim(),
        customer_phone: editForm.customer_phone.trim(),
        street: editForm.street.trim(),
        number: editForm.number.trim(),
        district: editForm.district.trim(),
        payment_method: editForm.payment_method,
        change_for: changeVal && !isNaN(changeVal) ? changeVal : null,
        total: parseFloat(editForm.total.replace(",", ".")) || 0,
        status: editForm.status,
        notes: editForm.notes.trim(),
        items: editForm.items,
      };

      const { error } = await supabase.from("orders").update(payload).eq("id", editingOrder.id);

      if (error) {
        throw error;
      }

      setOrders((prev) => prev.map((o) => (o.id === editingOrder.id ? { ...o, ...payload } : o)));
      showToast(`Pedido #${editingOrder.id} alterado com sucesso no Supabase!`);
      setEditingOrder(null);
    } catch (err: any) {
      alert("Falha ao salvar no Supabase: " + (err?.message || "Erro desconhecido"));
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete Order permanently from Supabase ──
  const handleConfirmDelete = async () => {
    if (!deletingOrder) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.from("orders").delete().eq("id", deletingOrder.id);
      if (error) {
        throw error;
      }

      setOrders((prev) => prev.filter((o) => o.id !== deletingOrder.id));
      showToast(`Pedido #${deletingOrder.id} excluído com sucesso do Supabase!`);
      setDeletingOrder(null);
    } catch (err: any) {
      alert("Falha ao excluir pedido do Supabase: " + (err?.message || "Erro desconhecido"));
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Edit items helpers in edit modal ──
  const handleItemQtyChange = (index: number, newQty: number) => {
    setEditForm((prev) => {
      const updated = [...prev.items];
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index] = { ...updated[index], quantity: newQty };
      }
      // Recompute total suggested
      const newTotal = updated.reduce((s, it) => {
        const itemExtras = (it.extras || []).reduce((es, e) => es + Number(e.price || 0), 0);
        return s + (Number(it.price || 0) + itemExtras) * (Number(it.quantity) || 1);
      }, 0);

      return {
        ...prev,
        items: updated,
        total: newTotal > 0 ? newTotal.toFixed(2) : prev.total,
      };
    });
  };

  const handleItemRemove = (index: number) => {
    handleItemQtyChange(index, 0);
  };

  return (
    <AdminLayout>
      {/* ── Toast de Notificação Flutuante ── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/95 text-white shadow-2xl backdrop-blur-md border border-emerald-400/40 animate-in fade-in slide-in-from-top-4 duration-300">
          <Check size={18} className="flex-shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-white font-black text-2xl tracking-tight">Dashboard</h1>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Tempo Real Ativo</span>
            </div>
          </div>
          <p className="text-white/40 text-xs font-medium mt-1">
            Controle total em tempo real com consistência direta do Supabase •{" "}
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status restaurante */}
          <button
            onClick={toggleOpen}
            disabled={toggling}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg ${
              isOpen
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-emerald-950/20"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 shadow-rose-950/20"
            }`}
          >
            {isOpen ? (
              <>
                <ToggleRight size={18} /> Aberto
              </>
            ) : (
              <>
                <ToggleLeft size={18} /> Pausado
              </>
            )}
          </button>

          {/* Botão de atualização manual */}
          <button
            onClick={() => loadData(false)}
            title="Recarregar do Supabase"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20 transition-all cursor-pointer text-xs font-bold"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards (Consistência 100% calculada do Supabase) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {/* Pedidos Hoje */}
        <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Hoje</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-400">
              <ShoppingBag size={16} />
            </div>
          </div>
          <div>
            <div className="text-white font-black text-2xl leading-none">
              {loading ? "..." : todayOrders.length}
            </div>
            <p className="text-white/30 text-[10px] font-medium mt-1">pedidos hoje</p>
          </div>
        </div>

        {/* Faturamento Hoje */}
        <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Faturado Hoje</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div className="text-emerald-400 font-black text-xl leading-none">
              {loading ? "..." : `R$ ${todayRevenue.toFixed(2)}`}
            </div>
            <p className="text-white/30 text-[10px] font-medium mt-1">receita do dia</p>
          </div>
        </div>

        {/* Pedidos Concluídos */}
        <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Concluídos</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 flex items-center justify-center text-teal-400">
              <PackageCheck size={16} />
            </div>
          </div>
          <div>
            <div className="text-white font-black text-2xl leading-none">
              {loading ? "..." : allDeliveredOrders.length}
            </div>
            <p className="text-white/30 text-[10px] font-medium mt-1">pedidos entregues</p>
          </div>
        </div>

        {/* Total Faturado Concluído */}
        <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Faturamento Total</span>
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
              <DollarSign size={16} />
            </div>
          </div>
          <div>
            <div className="text-white font-black text-xl leading-none">
              {loading ? "..." : `R$ ${totalDeliveredRevenue.toFixed(2)}`}
            </div>
            <p className="text-white/30 text-[10px] font-medium mt-1">pedidos finalizados</p>
          </div>
        </div>

        {/* Pedidos Em Andamento (Tempo Real) */}
        <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Ao Vivo</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-black text-2xl leading-none">
                {loading ? "..." : activeOrders.length}
              </span>
              {activeOrders.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black animate-pulse">
                  ativos
                </span>
              )}
            </div>
            <p className="text-white/30 text-[10px] font-medium mt-1">pendentes / preparo</p>
          </div>
        </div>

        {/* Clientes Cadastrados */}
        <div className="rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Clientes</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="text-white font-black text-2xl leading-none">
              {loading ? "..." : totalCustomers}
            </div>
            <p className="text-white/30 text-[10px] font-medium mt-1">cadastrados</p>
          </div>
        </div>
      </div>

      {/* ── Gráfico Dinâmico dos Últimos 7 Dias (100% Sincronizado) ── */}
      <div className="mb-8">
        <RevenueGraph data={chartData} />
      </div>

      {/* ── SEÇÃO: PEDIDOS EM ANDAMENTO EM TEMPO REAL ── */}
      <div className="rounded-3xl p-6 bg-[#141414] border border-white/[0.06] shadow-2xl mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-white font-black text-base tracking-tight flex items-center gap-2">
                <span>Pedidos em Tempo Real</span>
                {activeOrders.length > 0 ? (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-xs font-black">
                    {activeOrders.length} em andamento
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-white/40 text-xs font-bold">
                    0 ativos
                  </span>
                )}
              </h2>
              <p className="text-white/40 text-xs">
                Controle instantâneo de pedidos pendentes, em preparo ou em rota de entrega
              </p>
            </div>
          </div>

          <div className="text-white/30 text-xs">
            {activeOrders.length === 0 ? "Tudo limpo na cozinha" : "Acompanhe e avance cada etapa"}
          </div>
        </div>

        {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08]">
            <CheckCircle2 size={32} className="text-emerald-400/60 mb-2" />
            <p className="text-white/70 text-sm font-bold">Nenhum pedido pendente no momento</p>
            <p className="text-white/30 text-xs mt-1">
              Assim que um cliente fizer um novo pedido no site, ele aparecerá aqui com alerta sonoro em tempo real.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {activeOrders.map((order) => {
              const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;
              const isAdvancing = advancingId === order.id;

              return (
                <div
                  key={order.id}
                  className="rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] p-4 flex flex-col justify-between space-y-3 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-white font-black text-xs">
                        #{order.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusCfg.badgeClass}`}
                      >
                        <StatusIcon size={12} />
                        {statusCfg.label}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-white font-black text-sm">{order.customer_name || "Cliente"}</h3>
                      <div className="flex items-center gap-2 text-white/40 text-xs mt-0.5">
                        <Phone size={12} />
                        <span>{order.customer_phone || "Sem telefone"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/40 text-xs mt-0.5">
                        <MapPin size={12} />
                        <span className="truncate">
                          {order.street ? `${order.street}, ${order.number} - ${order.district}` : "Balcão / Retirada"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-black/40 border border-white/[0.04] p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-white/50">
                        <span>Itens do pedido:</span>
                        <button
                          type="button"
                          onClick={() => setViewingItemsOrder(order)}
                          className="text-primary hover:underline text-[10px] cursor-pointer"
                        >
                          Ver todos ({order.items?.length || 0})
                        </button>
                      </div>
                      <p className="text-white/80 text-xs line-clamp-2">
                        {order.items?.map((i) => `${i.quantity}x ${i.name}`).join(", ") || "Sem descrição"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-white/40 text-xs">Total a pagar</span>
                      <span className="text-emerald-400 font-black text-base">
                        R$ {Number(order.total || 0).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {statusCfg.nextStatus && (
                        <button
                          type="button"
                          disabled={isAdvancing}
                          onClick={() => handleAdvanceStatus(order.id, statusCfg.nextStatus!)}
                          className="flex-1 py-2 px-3 rounded-xl bg-primary hover:bg-[#e06900] text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-orange-950/30"
                        >
                          {isAdvancing ? (
                            <RefreshCw size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          <span>{statusCfg.nextLabel}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(order)}
                        title="Editar pedido no Supabase"
                        className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/[0.08] transition-all cursor-pointer"
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingOrder(order)}
                        title="Deletar pedido do Supabase"
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SEÇÃO: PEDIDOS CONCLUÍDOS (FINALIZADOS) - LINHA A LINHA ── */}
      <div className="rounded-3xl p-6 bg-[#141414] border border-white/[0.06] shadow-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h2 className="text-white font-black text-lg tracking-tight">Pedidos Concluídos (Finalizados)</h2>
                <p className="text-white/40 text-xs mt-0.5">
                  Linha a linha com controle total: edite ou delete pedidos diretamente no banco de dados Supabase
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro por status */}
            <div className="inline-flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.08]">
              {(
                [
                  { key: "delivered", label: `Concluídos (${allDeliveredOrders.length})` },
                  { key: "all", label: `Todos (${orders.length})` },
                  { key: "active", label: `Em Aberto (${activeOrders.length})` },
                  { key: "cancelled", label: `Cancelados (${orders.filter((o) => o.status === "cancelled").length})` },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === key
                      ? "bg-primary text-white shadow-md shadow-orange-950/40"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Filtro por período */}
            <div className="inline-flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.08]">
              {(
                [
                  { key: "all", label: "Todo período" },
                  { key: "today", label: "Hoje" },
                  { key: "7days", label: "7 Dias" },
                  { key: "30days", label: "30 Dias" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setDateFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dateFilter === key
                      ? "bg-white/[0.12] text-white"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Totalizador filtrado */}
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-black">
              {filteredOrders.length} pedido(s) • R$ {filteredOrdersRevenue.toFixed(2)}
              {statusFilter === "delivered" && allDeliveredOrders.length > 0 && ` • Médio: R$ ${avgDeliveredTicket.toFixed(2)}`}
            </div>
          </div>
        </div>

        {/* Barra de Pesquisa */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, telefone, endereço ou #ID do pedido..."
            className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl pl-10 pr-4 py-2.5 text-white text-xs outline-none placeholder:text-white/30 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tabela Linha a Linha */}
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08]">
            <PackageCheck size={36} className="text-white/20 mb-2" />
            <p className="text-white/60 text-sm font-bold">Nenhum pedido encontrado</p>
            <p className="text-white/30 text-xs mt-1">
              {searchTerm || dateFilter !== "all" || statusFilter !== "all"
                ? "Tente ajustar a busca ou os filtros de período e status acima."
                : "Quando novos pedidos forem registrados no Supabase, aparecerão aqui linha a linha."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03] text-white/40 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3 px-4"># ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data & Horário</th>
                  <th className="py-3 px-4">Cliente / Contato</th>
                  <th className="py-3 px-4">Endereço de Entrega</th>
                  <th className="py-3 px-4">Itens</th>
                  <th className="py-3 px-4">Pagamento</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4 text-right">Ações (Supabase)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-xs">
                {filteredOrders.map((order) => {
                  const itemsCount =
                    order.items?.reduce((s, it) => s + (Number(it.quantity) || 1), 0) || 0;
                  const phonePure = cleanPhone(order.customer_phone);
                  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* ID */}
                      <td className="py-3 px-4 font-black text-white/90 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-md bg-white/[0.06] border border-white/[0.08]">
                          #{order.id}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${statusCfg.badgeClass}`}
                        >
                          <StatusIcon size={11} />
                          <span>{statusCfg.label}</span>
                        </span>
                      </td>

                      {/* Data & Hora */}
                      <td className="py-3 px-4 text-white/60 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-white/30" />
                          <span>{formatDateTime(order.created_at)}</span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{order.customer_name || "Cliente"}</div>
                        {order.customer_phone ? (
                          <a
                            href={`https://wa.me/${phonePure}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline mt-0.5"
                          >
                            <Phone size={10} />
                            <span>{order.customer_phone}</span>
                          </a>
                        ) : (
                          <span className="text-white/30 text-[11px]">Sem telefone</span>
                        )}
                      </td>

                      {/* Endereço */}
                      <td className="py-3 px-4 max-w-xs">
                        {order.street ? (
                          <div className="text-white/80 line-clamp-1">
                            {order.street}, {order.number}
                            {order.district ? ` - ${order.district}` : ""}
                          </div>
                        ) : (
                          <span className="text-white/30 italic">Retirada no balcão</span>
                        )}
                      </td>

                      {/* Itens */}
                      <td className="py-3 px-4 max-w-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-white/70 line-clamp-1">
                            {order.items?.map((it) => `${it.quantity}x ${it.name}`).join(", ") ||
                              "Sem itens"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setViewingItemsOrder(order)}
                            title="Ver detalhes de todos os itens"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white text-[10px] font-bold transition-all cursor-pointer flex-shrink-0"
                          >
                            <Eye size={10} />
                            <span>({itemsCount})</span>
                          </button>
                        </div>
                      </td>

                      {/* Pagamento */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/80 font-medium text-[11px]">
                          {order.payment_method || "Dinheiro"}
                        </span>
                        {order.change_for != null && Number(order.change_for) > 0 && (
                          <span className="block text-[10px] text-white/40 mt-0.5">
                            Troco p/ R$ {Number(order.change_for).toFixed(2)}
                          </span>
                        )}
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-emerald-400 font-black text-sm">
                          R$ {Number(order.total || 0).toFixed(2)}
                        </span>
                      </td>

                      {/* Botões de Ação ao Lado: EDITAR e DELETAR */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Botão EDITAR */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(order)}
                            title="Editar pedido no Supabase"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-bold text-xs border border-white/[0.1] hover:border-white/20 transition-all cursor-pointer shadow-sm"
                          >
                            <Edit3 size={13} className="text-amber-400" />
                            <span>Editar</span>
                          </button>

                          {/* Botão DELETAR */}
                          <button
                            type="button"
                            onClick={() => setDeletingOrder(order)}
                            title="Excluir pedido do Supabase permanentemente"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/30 hover:border-rose-500/50 transition-all cursor-pointer shadow-sm"
                          >
                            <Trash2 size={13} />
                            <span>Deletar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: EDITAR PEDIDO (100% SUPABASE) ── */}
      {editingOrder && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
          onClick={() => !isSaving && setEditingOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl bg-[#171717] border border-white/[0.1] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 my-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-white font-black text-lg">
                    Editar Pedido #{editingOrder.id}
                  </h3>
                  <p className="text-white/40 text-xs">
                    As alterações feitas serão salvas diretamente no banco de dados Supabase
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                disabled={isSaving}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nome */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={editForm.customer_phone}
                    onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Rua */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Rua / Endereço
                  </label>
                  <input
                    type="text"
                    value={editForm.street}
                    onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                  />
                </div>

                {/* Número */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Número
                  </label>
                  <input
                    type="text"
                    value={editForm.number}
                    onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Bairro */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={editForm.district}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Status do Pedido
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-[#1b1b1b] border border-white/[0.08] focus:border-primary rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                  >
                    <option value="delivered">Concluído (Entregue)</option>
                    <option value="pending">Pendente</option>
                    <option value="preparing">Preparando</option>
                    <option value="delivery">Em Entrega</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Forma de Pagamento */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Forma de Pagamento
                  </label>
                  <select
                    value={editForm.payment_method}
                    onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                    className="w-full bg-[#1b1b1b] border border-white/[0.08] focus:border-primary rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                  >
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                  </select>
                </div>

                {/* Troco para */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Troco para (R$)
                  </label>
                  <input
                    type="text"
                    disabled={editForm.payment_method !== "Dinheiro"}
                    placeholder="Ex: 50.00"
                    value={editForm.change_for}
                    onChange={(e) => setEditForm({ ...editForm, change_for: e.target.value })}
                    className="w-full bg-white/[0.04] disabled:opacity-30 border border-white/[0.08] focus:border-primary rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                  />
                </div>

                {/* Valor Total */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                    Valor Total (R$)
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.total}
                    onChange={(e) => setEditForm({ ...editForm, total: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-3.5 py-2 text-emerald-400 font-black text-sm outline-none"
                  />
                </div>
              </div>

              {/* Itens do Pedido no Modal */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/50 flex items-center justify-between">
                  <span>Itens do Pedido</span>
                  <span className="text-white/30 text-[10px] font-medium lowercase">
                    ajuste quantidade ou remova itens se necessário
                  </span>
                </label>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {editForm.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs truncate">
                          {it.name} {it.size ? `(${it.size})` : ""}
                        </div>
                        <div className="text-[10px] text-white/40">
                          R$ {Number(it.price || 0).toFixed(2)} cada
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-black/40 border border-white/[0.08] rounded-lg px-2 py-1">
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(idx, it.quantity - 1)}
                            className="text-white/50 hover:text-white px-1 text-xs cursor-pointer font-black"
                          >
                            -
                          </button>
                          <span className="text-white font-bold text-xs min-w-[1.2rem] text-center">
                            {it.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(idx, it.quantity + 1)}
                            className="text-white/50 hover:text-white px-1 text-xs cursor-pointer font-black"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleItemRemove(idx)}
                          className="p-1 text-rose-400/60 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações / Notas */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/50">
                  Observações / Notas do Pedido
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Observações do cliente, instruções de entrega, ponto da carne..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary rounded-xl px-3.5 py-2 text-white text-xs outline-none"
                />
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.06] text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-[#e06900] text-white text-xs font-black transition-all shadow-lg shadow-orange-950/40 cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>{isSaving ? "Salvando no Supabase..." : "Salvar no Supabase"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMAÇÃO DE DELEÇÃO PERMANENTE (100% SUPABASE) ── */}
      {deletingOrder && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => !isDeleting && setDeletingOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#171717] border border-rose-500/30 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-white font-black text-lg">
                  Excluir Pedido #{deletingOrder.id}?
                </h3>
                <p className="text-white/40 text-xs mt-0.5">Exclusão permanente do Supabase</p>
              </div>
            </div>

            <div className="rounded-2xl bg-rose-500/[0.06] border border-rose-500/20 p-3.5 text-xs text-rose-300 space-y-1.5">
              <p className="font-bold">Atenção: Esta ação não pode ser desfeita.</p>
              <p className="text-white/70">
                O pedido #{deletingOrder.id} de{" "}
                <span className="text-white font-bold">{deletingOrder.customer_name || "Cliente"}</span>{" "}
                (R$ {Number(deletingOrder.total || 0).toFixed(2)}) será permanentemente deletado do
                banco de dados Supabase e as métricas do painel serão recalculadas instantaneamente.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingOrder(null)}
                className="px-4 py-2.5 rounded-xl border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.06] text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-lg shadow-rose-950/40 cursor-pointer"
              >
                {isDeleting ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                <span>{isDeleting ? "Excluindo..." : "Sim, Excluir do Banco"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VER ITENS DETALHADOS DO PEDIDO ── */}
      {viewingItemsOrder && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setViewingItemsOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-[#171717] border border-white/[0.1] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <h3 className="text-white font-black text-lg">
                  Itens do Pedido #{viewingItemsOrder.id}
                </h3>
                <p className="text-white/40 text-xs">
                  {viewingItemsOrder.customer_name} • {formatDateTime(viewingItemsOrder.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingItemsOrder(null)}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {viewingItemsOrder.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-sm">
                      {item.quantity}x {item.name} {item.size ? `(${item.size})` : ""}
                    </span>
                    <span className="text-emerald-400 font-black text-sm">
                      R$ {(Number(item.price || 0) * (Number(item.quantity) || 1)).toFixed(2)}
                    </span>
                  </div>

                  {item.extras && item.extras.length > 0 && (
                    <div className="pl-3 border-l-2 border-primary/40 text-[11px] text-white/60 space-y-0.5">
                      <div className="font-bold text-primary text-[10px] uppercase tracking-wider">
                        Adicionais:
                      </div>
                      {item.extras.map((extra, eIdx) => (
                        <div key={eIdx} className="flex items-center justify-between">
                          <span>+ {extra.name}</span>
                          <span>R$ {Number(extra.price || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.observation && (
                    <div className="text-[11px] text-amber-300/80 bg-amber-500/10 rounded-lg px-2.5 py-1">
                      Obs: {item.observation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {viewingItemsOrder.notes && (
              <div className="rounded-xl bg-white/[0.04] p-3 text-xs text-white/70 space-y-1">
                <span className="font-bold text-white/40 text-[10px] uppercase tracking-wider block">
                  Observações Gerais da Entrega:
                </span>
                <p>{viewingItemsOrder.notes}</p>
              </div>
            )}

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-white/50 text-xs">Valor Total do Pedido:</span>
              <span className="text-emerald-400 font-black text-lg">
                R$ {Number(viewingItemsOrder.total || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
