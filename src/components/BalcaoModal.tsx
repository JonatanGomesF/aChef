import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  fetchMenuCatalog,
  getMenuCatalog,
  subscribeMenuCatalog,
  type MenuCatalog,
} from "../lib/menuCatalog";
import {
  fetchBalcaoProducts,
  getBalcaoProducts,
  subscribeBalcaoProducts,
  type BalcaoProduct,
} from "../lib/balcaoProducts";
import {
  fetchProductAvailability,
  getProductAvailability,
  subscribeProductAvailability,
  type ProductAvailabilityMap,
} from "../lib/productAvailability";
import {
  fetchComandas,
  fetchComandaDetails,
  openComanda,
  addComandaItem,
  updateComandaItemQty,
  removeComandaItem,
  deleteEmptyComanda,
  closeComanda,
  subscribeComandasRealtime,
  formatActorName,
  generateCloseToken,
  getErrorMessage,
  isMissingComandasSchemaError,
  type Comanda,
  type ComandaItem,
  type ComandaHistoryEntry,
} from "../services/comandas";
import { printOrderReceipt, type ReceiptOrderData } from "../services/usbPrinter";
import ProductDropdown, { type UnifiedProductItem } from "./ProductDropdown";
import CloseComandaConfirmModal from "./CloseComandaConfirmModal";
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  Store,
  Clock,
  ArrowLeft,
  History,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Receipt,
  AlertCircle,
  User,
  Lock,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onOrderCreated?: (order: ReceiptOrderData) => void;
  onOpenCadastrarProdutoBalcao?: () => void;
};

function formatDateTimeShort(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    if (sameDay) {
      return `Hoje, ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function BalcaoModal({
  open,
  onClose,
  onOrderCreated,
  onOpenCadastrarProdutoBalcao,
}: Props) {
  // ── Catalogs (reutiliza cadastro existente do sistema) ──
  const [menuCatalog, setMenuCatalog] = useState<MenuCatalog>(getMenuCatalog);
  const [balcaoProducts, setBalcaoProducts] = useState<BalcaoProduct[]>(getBalcaoProducts);
  const [availability, setAvailability] = useState<ProductAvailabilityMap>(getProductAvailability);

  // ── Comandas State ──
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loadingComandas, setLoadingComandas] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [activeTab, setActiveTab] = useState<"open" | "closed">("open");
  const [searchComandas, setSearchComandas] = useState("");

  // ── New Comanda Input (texto livre obrigatório) ──
  const [newLabel, setNewLabel] = useState("");
  const [openingComanda, setOpeningComanda] = useState(false);

  // ── Selected Comanda & Details ──
  const [selectedComandaId, setSelectedComandaId] = useState<number | null>(null);
  const [detailsState, setDetailsState] = useState<{
    comandaId: number | null;
    items: ComandaItem[];
    history: ComandaHistoryEntry[];
  }>({ comandaId: null, items: [], history: [] });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const comandaItems = useMemo(
    () => (detailsState.comandaId === selectedComandaId ? detailsState.items : []),
    [detailsState, selectedComandaId]
  );
  const comandaHistory = useMemo(
    () => (detailsState.comandaId === selectedComandaId ? detailsState.history : []),
    [detailsState, selectedComandaId]
  );

  // ── Add Product Form inside Comanda ──
  const [selectedProductId, setSelectedProductId] = useState("");
  const [addQty, setAddQty] = useState("1");
  const [addObs, setAddObs] = useState("");
  const [addingItem, setAddingItem] = useState(false);

  // ── Item Editing & Removal ──
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [confirmRemoveItemId, setConfirmRemoveItemId] = useState<number | null>(null);
  const [deletingEmptyId, setDeletingEmptyId] = useState<number | null>(null);

  // ── Close Comanda Flow ──
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [isClosingComanda, setIsClosingComanda] = useState(false);
  const closeTokenRef = useRef<string | null>(null);

  // ── Feedback Banners ──
  const [inlineToast, setInlineToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [closedOrderBanner, setClosedOrderBanner] = useState<{
    comandaCode: string;
    label: string;
    order: ReceiptOrderData;
  } | null>(null);

  const showNotice = useCallback((type: "success" | "error", text: string) => {
    setInlineToast({ type, text });
    window.setTimeout(() => {
      setInlineToast((cur) => (cur?.text === text ? null : cur));
    }, 4500);
  }, []);

  // ── Load & Subscribe Catalogs ──
  useEffect(() => {
    if (!open) return;

    fetchMenuCatalog().then(setMenuCatalog);
    fetchBalcaoProducts().then(setBalcaoProducts);
    fetchProductAvailability().then(setAvailability);

    const unsubMenu = subscribeMenuCatalog(setMenuCatalog);
    const unsubBalcao = subscribeBalcaoProducts(setBalcaoProducts);
    const unsubAvail = subscribeProductAvailability(() => {
      setAvailability(getProductAvailability());
    });

    return () => {
      unsubMenu();
      unsubBalcao();
      unsubAvail();
    };
  }, [open]);

  // ── Unified Product List ──
  const allProducts: UnifiedProductItem[] = useMemo(() => {
    const list: UnifiedProductItem[] = [];

    (menuCatalog.products || []).forEach((p) => {
      const cat = (menuCatalog.categories || []).find((c) => c.id === p.categoryId);
      const isAvail = availability[p.id] !== false && p.available !== false;
      list.push({
        id: `cardapio-${p.id}`,
        numericId: p.id,
        name: p.name,
        price: Number(p.promotionalPrice && p.promotionalPrice > 0 ? p.promotionalPrice : p.price) || 0,
        size: p.size,
        category: cat?.name || "Cardápio",
        categoryId: p.categoryId,
        description: p.description,
        isBalcaoOnly: false,
        available: isAvail,
      });
    });

    (balcaoProducts || []).forEach((b) => {
      list.push({
        id: `balcao-${b.id}`,
        name: b.name,
        price: Number(b.price) || 0,
        category: b.category || "Exclusivos Balcão",
        description: b.description,
        isBalcaoOnly: true,
        available: b.available !== false,
      });
    });

    return list;
  }, [menuCatalog, balcaoProducts, availability]);

  const selectedProduct = useMemo(
    () => allProducts.find((p) => p.id === selectedProductId) || null,
    [allProducts, selectedProductId]
  );

  // ── Load Comandas List ──
  const loadComandas = useCallback(async (silent = false) => {
    if (!silent) setLoadingComandas(true);
    try {
      const list = await fetchComandas();
      setComandas(list);
      setSchemaMissing(false);
    } catch (err) {
      if (isMissingComandasSchemaError(err)) {
        setSchemaMissing(true);
      } else {
        console.error("Erro ao carregar comandas:", err);
      }
    } finally {
      setLoadingComandas(false);
    }
  }, []);

  // ── Load Selected Comanda Details ──
  const loadSelectedDetails = useCallback(async (comandaId: number, silent = false) => {
    if (!silent) setLoadingDetails(true);
    try {
      const details = await fetchComandaDetails(comandaId);
      setDetailsState({
        comandaId,
        items: details.items,
        history: details.history,
      });
    } catch (err) {
      console.error("Erro ao carregar itens da comanda:", err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetchComandas()
      .then((list) => {
        if (!active) return;
        setComandas(list);
        setSchemaMissing(false);
        setLoadingComandas(false);
      })
      .catch((err) => {
        if (!active) return;
        if (isMissingComandasSchemaError(err)) {
          setSchemaMissing(true);
        } else {
          console.error("Erro ao carregar comandas:", err);
        }
        setLoadingComandas(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !selectedComandaId) return;
    let active = true;
    fetchComandaDetails(selectedComandaId)
      .then((details) => {
        if (!active) return;
        setDetailsState({
          comandaId: selectedComandaId,
          items: details.items,
          history: details.history,
        });
        setConfirmRemoveItemId(null);
        setLoadingDetails(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Erro ao carregar itens da comanda:", err);
        setLoadingDetails(false);
      });
    return () => {
      active = false;
    };
  }, [open, selectedComandaId]);

  // ── Supabase Realtime + Fallback Polling for Multi-Waiter Sync ──
  useEffect(() => {
    if (!open) return;

    const unsubscribe = subscribeComandasRealtime({
      onComandasChange: () => {
        loadComandas(true);
      },
      onComandaItemsChange: (changedComandaId) => {
        loadComandas(true);
        if (selectedComandaId && (!changedComandaId || changedComandaId === selectedComandaId)) {
          loadSelectedDetails(selectedComandaId, true);
        }
      },
      onComandaHistoryChange: (changedComandaId) => {
        if (selectedComandaId && (!changedComandaId || changedComandaId === selectedComandaId)) {
          loadSelectedDetails(selectedComandaId, true);
        }
      },
    });

    const interval = window.setInterval(() => {
      loadComandas(true);
      if (selectedComandaId) {
        loadSelectedDetails(selectedComandaId, true);
      }
    }, 12000);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [open, selectedComandaId, loadComandas, loadSelectedDetails]);

  // Reset close token whenever modal closes or selected comanda changes
  useEffect(() => {
    if (!closeModalOpen) {
      closeTokenRef.current = null;
    }
  }, [closeModalOpen, selectedComandaId]);

  const selectedComanda = useMemo(
    () => comandas.find((c) => c.id === selectedComandaId) || null,
    [comandas, selectedComandaId]
  );

  const openComandas = useMemo(
    () =>
      comandas
        .filter((c) => c.status === "open")
        .sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()),
    [comandas]
  );

  const closedComandas = useMemo(
    () =>
      comandas
        .filter((c) => c.status === "closed")
        .sort(
          (a, b) =>
            new Date(b.closed_at || b.opened_at).getTime() -
            new Date(a.closed_at || a.opened_at).getTime()
        ),
    [comandas]
  );

  const visibleComandas = useMemo(() => {
    const base = activeTab === "open" ? openComandas : closedComandas;
    if (!searchComandas.trim()) return base;
    const q = searchComandas.toLowerCase();
    return base.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.opened_by && c.opened_by.toLowerCase().includes(q))
    );
  }, [activeTab, openComandas, closedComandas, searchComandas]);

  // ── Actions ──
  const handleOpenNewComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newLabel.trim();
    if (!clean) {
      showNotice("error", "Digite uma identificação para abrir a comanda (ex: Mesa 01, João, Varanda).");
      return;
    }
    setOpeningComanda(true);
    try {
      const created = await openComanda(clean);
      setNewLabel("");
      setActiveTab("open");
      setComandas((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      setSelectedComandaId(created.id);
      showNotice("success", `Comanda "${created.label}" (${created.code}) aberta!`);
    } catch (err: unknown) {
      showNotice("error", getErrorMessage(err, "Não foi possível abrir a comanda."));
    } finally {
      setOpeningComanda(false);
    }
  };

  const parsedQty = Math.max(1, parseInt(addQty, 10) || 1);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComanda || selectedComanda.status !== "open") return;
    if (!selectedProduct) {
      showNotice("error", "Selecione um produto no dropdown antes de adicionar.");
      return;
    }

    setAddingItem(true);
    try {
      const updated = await addComandaItem({
        comandaId: selectedComanda.id,
        productKey: selectedProduct.id,
        productName: selectedProduct.name,
        productSize: selectedProduct.size,
        category: selectedProduct.category,
        unitPrice: selectedProduct.price,
        quantity: parsedQty,
        isBalcaoOnly: selectedProduct.isBalcaoOnly,
        observation: addObs,
      });

      setComandas((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      await loadSelectedDetails(selectedComanda.id, true);
      setAddQty("1");
      setAddObs("");
      showNotice("success", `+${parsedQty}x ${selectedProduct.name} lançado em ${selectedComanda.label}`);
    } catch (err: unknown) {
      showNotice("error", getErrorMessage(err, "Erro ao adicionar produto na comanda."));
    } finally {
      setAddingItem(false);
    }
  };

  const handleChangeItemQty = async (item: ComandaItem, newQty: number) => {
    if (!selectedComanda || selectedComanda.status !== "open") return;
    setUpdatingItemId(item.id);
    try {
      const updated = await updateComandaItemQty(item.id, newQty);
      setComandas((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      await loadSelectedDetails(selectedComanda.id, true);
      setConfirmRemoveItemId(null);
    } catch (err: unknown) {
      showNotice("error", getErrorMessage(err, "Erro ao atualizar quantidade."));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (item: ComandaItem) => {
    if (!selectedComanda || selectedComanda.status !== "open") return;
    if (confirmRemoveItemId !== item.id) {
      setConfirmRemoveItemId(item.id);
      window.setTimeout(() => {
        setConfirmRemoveItemId((cur) => (cur === item.id ? null : cur));
      }, 3500);
      return;
    }

    setUpdatingItemId(item.id);
    try {
      const updated = await removeComandaItem(item.id);
      setComandas((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      await loadSelectedDetails(selectedComanda.id, true);
      setConfirmRemoveItemId(null);
      showNotice("success", `${item.product_name} removido da comanda.`);
    } catch (err: unknown) {
      showNotice("error", getErrorMessage(err, "Erro ao remover item."));
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleDeleteEmpty = async (comanda: Comanda) => {
    if (comanda.status !== "open" || comanda.items_count > 0) return;
    setDeletingEmptyId(comanda.id);
    try {
      await deleteEmptyComanda(comanda.id);
      setComandas((prev) => prev.filter((c) => c.id !== comanda.id));
      if (selectedComandaId === comanda.id) setSelectedComandaId(null);
      showNotice("success", `Comanda vazia "${comanda.label}" removida.`);
    } catch (err: unknown) {
      showNotice("error", getErrorMessage(err, "Erro ao remover comanda vazia."));
    } finally {
      setDeletingEmptyId(null);
    }
  };

  const handleOpenCloseConfirm = () => {
    if (!selectedComanda || selectedComanda.status !== "open" || comandaItems.length === 0) return;
    if (!closeTokenRef.current) {
      closeTokenRef.current = generateCloseToken();
    }
    setCloseModalOpen(true);
  };

  const handleConfirmCloseComanda = async (params: {
    paymentMethod: string;
    changeFor: number | null;
    notes: string;
    printReceipt: boolean;
  }) => {
    if (!selectedComanda || isClosingComanda) return;
    setIsClosingComanda(true);

    const token = closeTokenRef.current || generateCloseToken();
    closeTokenRef.current = token;

    try {
      const result = await closeComanda({
        comandaId: selectedComanda.id,
        paymentMethod: params.paymentMethod,
        changeFor: params.changeFor,
        notes: params.notes,
        closeToken: token,
      });

      setCloseModalOpen(false);
      closeTokenRef.current = null;

      setComandas((prev) =>
        prev.map((c) => (c.id === result.comanda.id ? result.comanda : c))
      );
      await loadSelectedDetails(result.comanda.id, true);

      const receiptOrder: ReceiptOrderData = {
        id: result.order?.id || result.comanda.order_id || result.comanda.id,
        customer_name: result.comanda.label,
        customer_phone: "",
        street: "Consumo no Balcão",
        number: result.comanda.code,
        district: "Presencial",
        items: comandaItems.map((it) => ({
          name: it.product_name,
          size: it.product_size || undefined,
          quantity: it.quantity,
          price: Number(it.unit_price),
          observation: it.observation || undefined,
        })),
        total: Number(result.comanda.total_amount),
        payment_method: params.paymentMethod,
        change_for: params.changeFor,
        notes: params.notes || result.comanda.notes,
        created_at: result.comanda.closed_at || new Date().toISOString(),
      };

      setClosedOrderBanner({
        comandaCode: result.comanda.code,
        label: result.comanda.label,
        order: receiptOrder,
      });

      if (params.printReceipt) {
        try {
          await printOrderReceipt(receiptOrder);
        } catch (printErr) {
          console.warn("Aviso ao imprimir recibo:", printErr);
        }
      }

      if (onOrderCreated && result.order) {
        onOrderCreated(result.order);
      }

      showNotice(
        "success",
        `Conta "${result.comanda.label}" fechada! Venda #${receiptOrder.id} registrada no financeiro.`
      );
    } catch (err: unknown) {
      showNotice("error", getErrorMessage(err, "Falha ao fechar comanda. Tente novamente."));
      loadComandas(true);
      if (selectedComanda) loadSelectedDetails(selectedComanda.id, true);
    } finally {
      setIsClosingComanda(false);
    }
  };

  const handlePrintComanda = (comanda: Comanda, items: ComandaItem[]) => {
    const receipt: ReceiptOrderData = {
      id: comanda.order_id || comanda.id,
      customer_name: comanda.label,
      customer_phone: "",
      street: "Consumo no Balcão",
      number: comanda.code,
      district: "Presencial",
      items: items.map((it) => ({
        name: it.product_name,
        size: it.product_size || undefined,
        quantity: it.quantity,
        price: Number(it.unit_price),
        observation: it.observation || undefined,
      })),
      total: Number(comanda.total_amount || 0),
      payment_method: comanda.payment_method || "Em aberto",
      change_for: comanda.change_for,
      notes: comanda.notes,
      created_at: comanda.closed_at || comanda.opened_at,
    };
    printOrderReceipt(receipt).catch((err) => {
      console.warn("Erro ao imprimir comprovante:", err);
      showNotice("error", "Não foi possível abrir a impressão neste dispositivo.");
    });
  };

  const computedTotal = useMemo(() => {
    if (comandaItems.length > 0) {
      return comandaItems.reduce(
        (sum, it) => sum + Number(it.unit_price || 0) * Number(it.quantity || 0),
        0
      );
    }
    return Number(selectedComanda?.total_amount || 0);
  }, [comandaItems, selectedComanda]);

  const computedItemsCount = useMemo(() => {
    if (comandaItems.length > 0) {
      return comandaItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
    }
    return Number(selectedComanda?.items_count || 0);
  }, [comandaItems, selectedComanda]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full h-[100dvh] sm:max-w-7xl sm:h-[94vh] flex flex-col rounded-none sm:rounded-3xl bg-[#121212] border-0 sm:border sm:border-orange-500/30 shadow-2xl overflow-hidden font-sans"
      >
        {/* ── Top Header ── */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] bg-[#191919] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-950/40 flex-shrink-0">
              <Store size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-white font-black text-base sm:text-xl tracking-tight truncate">
                  Comandas — Balcão
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Tempo Real
                </span>
              </div>
              <p className="text-white/45 text-[11px] sm:text-xs truncate">
                {openComandas.length} aberta(s) • Venda entra no financeiro só ao fechar conta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {onOpenCadastrarProdutoBalcao && (
              <button
                type="button"
                onClick={onOpenCadastrarProdutoBalcao}
                title="Cadastrar Produto de Balcão"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span className="hidden md:inline">Produto Balcão</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                loadComandas(false);
                if (selectedComandaId) loadSelectedDetails(selectedComandaId, false);
              }}
              title="Sincronizar agora"
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw size={17} className={loadingComandas ? "animate-spin" : ""} />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar janela"
              className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Inline Toast Feedback ── */}
        {inlineToast && (
          <div
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between gap-2 border-b flex-shrink-0 ${
              inlineToast.type === "success"
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/20 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {inlineToast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{inlineToast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setInlineToast(null)}
              className="text-white/60 hover:text-white p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Banner de Conta Fechada Recente ── */}
        {closedOrderBanner && (
          <div className="px-4 sm:px-6 py-3 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-200 text-xs sm:text-sm font-bold flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
              <span>
                Comanda <strong>{closedOrderBanner.label}</strong> ({closedOrderBanner.comandaCode}) fechada!
                Venda #{closedOrderBanner.order.id} • R$ {Number(closedOrderBanner.order.total).toFixed(2)} registrada.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => printOrderReceipt(closedOrderBanner.order)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold cursor-pointer"
              >
                <Printer size={14} /> Imprimir Cupom
              </button>
              <button
                type="button"
                onClick={() => setClosedOrderBanner(null)}
                className="text-white/60 hover:text-white text-xs underline px-1 cursor-pointer"
              >
                Fechar aviso
              </button>
            </div>
          </div>
        )}

        {/* ── Schema Missing Alert (caso migration SQL ainda não tenha sido aplicada) ── */}
        {schemaMissing ? (
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
            <div className="max-w-lg w-full rounded-3xl bg-[#1a1a1a] border border-amber-500/40 p-6 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle size={28} />
              </div>
              <h3 className="text-white font-black text-lg">
                Tabelas de Comandas ainda não criadas no Supabase
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                Para habilitar comandas abertas em tempo real entre todos os celulares dos garçons,
                execute a <strong>Seção 14</strong> do arquivo{" "}
                <code className="px-1.5 py-0.5 rounded bg-white/10 text-amber-300 text-xs">
                  supabase/migration.sql
                </code>{" "}
                no <strong>SQL Editor</strong> do seu projeto Supabase.
              </p>
              <button
                type="button"
                onClick={() => loadComandas(false)}
                className="w-full py-3.5 px-5 rounded-2xl bg-primary hover:bg-orange-600 text-white font-black text-sm cursor-pointer transition-all"
              >
                Já executei no Supabase — Tentar Novamente
              </button>
            </div>
          </div>
        ) : (
          /* ── Main Responsive Master-Detail Workspace ── */
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            {/* ══════════════════════════════════════════════════════════════
                LISTA DE COMANDAS (Mobile: visível quando nenhuma está selecionada | Desktop: 5 cols)
               ══════════════════════════════════════════════════════════════ */}
            <div
              className={`lg:col-span-5 flex-col h-full border-r border-white/[0.08] bg-[#141414] overflow-hidden ${
                selectedComandaId ? "hidden lg:flex" : "flex"
              }`}
            >
              {/* Form: Abrir Nova Comanda (Texto Livre) */}
              <form
                onSubmit={handleOpenNewComanda}
                className="p-4 border-b border-white/[0.08] bg-[#181818] space-y-2.5 flex-shrink-0"
              >
                <label className="text-[11px] font-black uppercase tracking-wider text-amber-400 block">
                  Abrir Nova Comanda
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Ex: Mesa 01, Varanda, João, Família Silva..."
                    maxLength={80}
                    className="flex-1 min-h-[48px] bg-[#101010] border border-white/[0.12] focus:border-orange-500 rounded-2xl px-4 py-3 text-white text-sm sm:text-base font-bold outline-none placeholder:text-white/30"
                  />
                  <button
                    type="submit"
                    disabled={openingComanda || !newLabel.trim()}
                    className="min-h-[48px] px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-[0.98] text-white font-black text-sm shadow-lg shadow-orange-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 flex-shrink-0"
                  >
                    <Plus size={18} />
                    <span>{openingComanda ? "Abrindo..." : "Abrir Comanda"}</span>
                  </button>
                </div>
              </form>

              {/* Tabs Abertas / Fechadas + Busca */}
              <div className="p-3.5 border-b border-white/[0.06] bg-[#151515] space-y-2.5 flex-shrink-0">
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#0e0e0e] border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setActiveTab("open")}
                    className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      activeTab === "open"
                        ? "bg-amber-500 text-stone-950 shadow-md"
                        : "text-white/55 hover:text-white"
                    }`}
                  >
                    <span>Abertas</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                        activeTab === "open" ? "bg-black/20 text-stone-950" : "bg-white/10 text-white"
                      }`}
                    >
                      {openComandas.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("closed")}
                    className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      activeTab === "closed"
                        ? "bg-emerald-500 text-stone-950 shadow-md"
                        : "text-white/55 hover:text-white"
                    }`}
                  >
                    <span>Fechadas</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                        activeTab === "closed" ? "bg-black/20 text-stone-950" : "bg-white/10 text-white"
                      }`}
                    >
                      {closedComandas.length}
                    </span>
                  </button>
                </div>

                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
                  <input
                    type="text"
                    value={searchComandas}
                    onChange={(e) => setSearchComandas(e.target.value)}
                    placeholder="Buscar por identificação ou código..."
                    className="w-full bg-[#1d1d1d] border border-white/[0.08] focus:border-orange-500 rounded-xl pl-10 pr-8 py-2.5 text-white text-xs sm:text-sm outline-none placeholder:text-white/30"
                  />
                  {searchComandas && (
                    <button
                      type="button"
                      onClick={() => setSearchComandas("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de Cards das Comandas */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                {loadingComandas && comandas.length === 0 ? (
                  <div className="py-12 text-center text-white/40 text-sm">
                    Carregando comandas...
                  </div>
                ) : visibleComandas.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08] space-y-2">
                    <Receipt size={32} className="mx-auto text-white/20" />
                    <p className="text-white/65 font-bold text-sm">
                      {activeTab === "open"
                        ? "Nenhuma comanda aberta no momento"
                        : "Nenhuma comanda fechada encontrada"}
                    </p>
                    <p className="text-white/35 text-xs">
                      {activeTab === "open"
                        ? "Digite a identificação acima (Mesa, Cliente ou Local) e toque em Abrir Comanda."
                        : "As comandas fechadas aparecerão aqui com o histórico completo."}
                    </p>
                  </div>
                ) : (
                  visibleComandas.map((cmd) => {
                    const isSelected = cmd.id === selectedComandaId;
                    const isOpenCmd = cmd.status === "open";

                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        onClick={() => setSelectedComandaId(cmd.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] space-y-2.5 ${
                          isSelected
                            ? "bg-orange-500/[0.12] border-orange-500 shadow-lg shadow-orange-950/20"
                            : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-white font-black text-base sm:text-lg leading-tight truncate">
                              {cmd.label}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-white/45">
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-white/[0.07] text-white/75">
                                {cmd.code}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock size={11} />
                                {formatDateTimeShort(isOpenCmd ? cmd.opened_at : cmd.closed_at || cmd.opened_at)}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase flex-shrink-0 border ${
                              isOpenCmd
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/35"
                                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/35"
                            }`}
                          >
                            {isOpenCmd ? "Aberta" : "Fechada"}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs text-white/55">
                            <span className="font-bold text-white/80">
                              {cmd.items_count} {cmd.items_count === 1 ? "item" : "itens"}
                            </span>
                            {cmd.opened_by && (
                              <span className="text-white/35 truncate max-w-[130px]">
                                • {formatActorName(cmd.opened_by)}
                              </span>
                            )}
                          </div>

                          <span className="text-emerald-400 font-black text-lg leading-none">
                            R$ {Number(cmd.total_amount || 0).toFixed(2)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                DETALHE DA COMANDA SELECIONADA (Mobile: visível ao selecionar | Desktop: 7 cols)
               ══════════════════════════════════════════════════════════════ */}
            <div
              className={`lg:col-span-7 flex-col h-full bg-[#111111] overflow-hidden ${
                selectedComandaId ? "flex" : "hidden lg:flex"
              }`}
            >
              {!selectedComanda ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/25">
                    <Receipt size={32} />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-white/85 font-black text-lg">
                      Selecione ou abra uma comanda
                    </h3>
                    <p className="text-white/40 text-xs sm:text-sm">
                      Escolha uma comanda aberta ao lado para lançar produtos, ajustar quantidades ou fechar a conta.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header da Comanda Selecionada */}
                  <div className="px-4 sm:px-6 py-3.5 border-b border-white/[0.08] bg-[#181818] space-y-2 flex-shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedComandaId(null)}
                        className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-white font-bold text-xs cursor-pointer"
                      >
                        <ArrowLeft size={15} />
                        <span>Comandas</span>
                      </button>

                      <div className="flex items-center gap-2 ml-auto">
                        {selectedComanda.status === "open" && computedItemsCount === 0 && (
                          <button
                            type="button"
                            disabled={deletingEmptyId === selectedComanda.id}
                            onClick={() => handleDeleteEmpty(selectedComanda)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Cancelar vazia</span>
                          </button>
                        )}
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                            selectedComanda.status === "open"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/35"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/35"
                          }`}
                        >
                          {selectedComanda.status === "open" ? "Comanda Aberta" : "Comanda Fechada"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="text-white font-black text-xl sm:text-2xl tracking-tight truncate">
                          {selectedComanda.label}
                        </h3>
                        <div className="flex items-center gap-2.5 flex-wrap text-xs text-white/45 mt-0.5">
                          <span className="font-mono font-bold text-white/75">{selectedComanda.code}</span>
                          <span>• Aberta {formatDateTimeShort(selectedComanda.opened_at)}</span>
                          {selectedComanda.opened_by && (
                            <span className="inline-flex items-center gap-1">
                              <User size={11} />
                              {formatActorName(selectedComanda.opened_by)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">
                          Acumulado
                        </span>
                        <span className="text-emerald-400 font-black text-2xl leading-none">
                          R$ {computedTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {selectedComanda.status === "closed" && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Lock size={14} className="text-emerald-400" />
                          <span>
                            Fechada {formatDateTimeShort(selectedComanda.closed_at)} •{" "}
                            <strong>{selectedComanda.payment_method || "PIX"}</strong>
                            {selectedComanda.order_id ? ` • Venda #${selectedComanda.order_id}` : ""}
                          </span>
                        </div>
                        {selectedComanda.closed_by && (
                          <span className="text-emerald-300/75">
                            por {formatActorName(selectedComanda.closed_by)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Corpo Scrollável: Lançamento de Produtos + Itens Lançados + Histórico */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                    {/* Área para Adicionar Produtos (somente comanda aberta) */}
                    {selectedComanda.status === "open" && (
                      <form
                        onSubmit={handleAddProduct}
                        className="p-4 rounded-2xl bg-[#181818] border border-white/[0.08] space-y-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-white font-black text-sm sm:text-base">
                            Lançar Produto na Comanda
                          </h4>
                          {selectedProduct && (
                            <span className="text-xs font-bold text-emerald-400">
                              Unit: R$ {selectedProduct.price.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Dropdown de Seleção de Produtos */}
                        <ProductDropdown
                          items={allProducts}
                          selectedId={selectedProductId}
                          onSelect={(item) => setSelectedProductId(item.id)}
                          disabled={addingItem}
                        />

                        {/* Quantidade + Observação */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-5 space-y-1.5">
                            <label className="text-[11px] font-black uppercase tracking-wider text-white/60 block">
                              Quantidade
                            </label>
                            <div className="flex items-center bg-[#121212] border border-white/[0.12] rounded-2xl p-1">
                              <button
                                type="button"
                                onClick={() => setAddQty(String(Math.max(1, parsedQty - 1)))}
                                className="w-11 h-11 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white flex items-center justify-center cursor-pointer"
                              >
                                <Minus size={18} />
                              </button>
                              <input
                                type="number"
                                min={1}
                                inputMode="numeric"
                                value={addQty}
                                onChange={(e) => setAddQty(e.target.value)}
                                className="flex-1 min-w-0 bg-transparent text-center text-white font-black text-lg outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setAddQty(String(parsedQty + 1))}
                                className="w-11 h-11 rounded-xl bg-primary hover:bg-orange-600 text-white flex items-center justify-center cursor-pointer"
                              >
                                <Plus size={18} />
                              </button>
                            </div>
                          </div>

                          <div className="sm:col-span-7 space-y-1.5">
                            <label className="text-[11px] font-black uppercase tracking-wider text-white/60 block">
                              Observação do Item (Opcional)
                            </label>
                            <input
                              type="text"
                              value={addObs}
                              onChange={(e) => setAddObs(e.target.value)}
                              placeholder="Ex: Bem gelada, sem cebola, copo c/ gelo..."
                              className="w-full min-h-[54px] bg-[#121212] border border-white/[0.12] focus:border-orange-500 rounded-2xl px-3.5 py-3 text-white text-sm outline-none placeholder:text-white/25"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={addingItem || !selectedProduct}
                          className="w-full min-h-[52px] py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-lg shadow-orange-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                        >
                          <Plus size={19} />
                          <span>
                            {addingItem
                              ? "Adicionando..."
                              : selectedProduct
                                ? `Adicionar ${parsedQty}x • R$ ${(selectedProduct.price * parsedQty).toFixed(2)}`
                                : "Selecione um produto acima"}
                          </span>
                        </button>
                      </form>
                    )}

                    {/* Lista de Produtos Lançados */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-black text-sm sm:text-base">
                          Produtos Lançados ({computedItemsCount})
                        </h4>
                        {loadingDetails && (
                          <span className="text-xs text-white/40">Atualizando...</span>
                        )}
                      </div>

                      {comandaItems.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08] space-y-1.5">
                          <p className="text-white/60 font-bold text-sm">
                            Nenhum produto lançado ainda nesta comanda
                          </p>
                          <p className="text-white/35 text-xs">
                            Use o dropdown acima para adicionar bebidas, porções ou pratos.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {comandaItems.map((item) => {
                            const isUpdating = updatingItemId === item.id;
                            const isConfirmingRemove = confirmRemoveItemId === item.id;
                            const subtotal = Number(item.unit_price) * Number(item.quantity);

                            return (
                              <div
                                key={item.id}
                                className="p-3.5 sm:p-4 rounded-2xl bg-[#181818] border border-white/[0.08] space-y-2.5"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-white font-extrabold text-sm sm:text-base">
                                        {item.product_name}
                                      </span>
                                      {item.product_size && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                                          {item.product_size}
                                        </span>
                                      )}
                                      {item.is_balcao_only && (
                                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                          Balcão
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-xs text-white/50 flex items-center gap-2 flex-wrap">
                                      <span>
                                        {item.quantity}x R$ {Number(item.unit_price).toFixed(2)}
                                      </span>
                                      {item.added_by && (
                                        <span className="text-white/35">
                                          • por {formatActorName(item.added_by)}
                                        </span>
                                      )}
                                    </div>

                                    {item.observation && (
                                      <div className="text-xs text-amber-300/85 bg-amber-500/10 rounded-lg px-2.5 py-1 inline-block mt-1">
                                        Obs: {item.observation}
                                      </div>
                                    )}
                                  </div>

                                  <div className="text-right flex-shrink-0">
                                    <span className="text-[10px] uppercase font-bold text-white/40 block">
                                      Subtotal
                                    </span>
                                    <span className="text-emerald-400 font-black text-base sm:text-lg">
                                      R$ {subtotal.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Controles para corrigir quantidade ou remover (somente aberta) */}
                                {selectedComanda.status === "open" && (
                                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1 bg-[#111111] border border-white/[0.1] rounded-xl p-1">
                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleChangeItemQty(item, item.quantity - 1)}
                                        className="w-9 h-9 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white flex items-center justify-center cursor-pointer disabled:opacity-40"
                                      >
                                        <Minus size={15} />
                                      </button>
                                      <span className="w-9 text-center font-black text-white text-sm">
                                        {item.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleChangeItemQty(item, item.quantity + 1)}
                                        className="w-9 h-9 rounded-lg bg-primary hover:bg-orange-600 text-white flex items-center justify-center cursor-pointer disabled:opacity-40"
                                      >
                                        <Plus size={15} />
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      disabled={isUpdating}
                                      onClick={() => handleRemoveItem(item)}
                                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 ${
                                        isConfirmingRemove
                                          ? "bg-rose-600 text-white shadow-md"
                                          : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25"
                                      }`}
                                    >
                                      <Trash2 size={14} />
                                      <span>{isConfirmingRemove ? "Confirmar remoção?" : "Remover"}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Histórico de Alterações (expansível) */}
                    <div className="rounded-2xl border border-white/[0.08] bg-[#161616] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowHistory((prev) => !prev)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/70">
                          <History size={15} className="text-amber-400" />
                          <span>Histórico de Alterações ({comandaHistory.length})</span>
                        </div>
                        {showHistory ? (
                          <ChevronUp size={16} className="text-white/50" />
                        ) : (
                          <ChevronDown size={16} className="text-white/50" />
                        )}
                      </button>

                      {showHistory && (
                        <div className="border-t border-white/[0.06] divide-y divide-white/[0.05] max-h-56 overflow-y-auto">
                          {comandaHistory.length === 0 ? (
                            <div className="p-4 text-xs text-white/40 text-center">
                              Nenhuma alteração registrada ainda.
                            </div>
                          ) : (
                            comandaHistory.map((h) => (
                              <div key={h.id} className="px-4 py-2.5 text-xs flex items-start justify-between gap-3">
                                <div className="space-y-0.5">
                                  <div className="text-white/85 font-semibold">{h.details}</div>
                                  <div className="text-white/40 text-[11px]">
                                    por {formatActorName(h.actor_email)}
                                  </div>
                                </div>
                                <span className="text-white/40 text-[11px] whitespace-nowrap">
                                  {formatDateTimeShort(h.created_at)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barra Inferior Fixa: Resumo e Botão FECHAR CONTA */}
                  <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#191919] space-y-3 flex-shrink-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-white/45 block">
                          Total da Comanda ({computedItemsCount}{" "}
                          {computedItemsCount === 1 ? "item" : "itens"})
                        </span>
                        <span className="text-[11px] text-white/40">
                          {selectedComanda.status === "open"
                            ? "Lançamentos pendentes — não contabilizado no financeiro"
                            : "Venda já integrada ao financeiro"}
                        </span>
                      </div>
                      <span className="text-2xl sm:text-3xl font-black text-emerald-400 leading-none">
                        R$ {computedTotal.toFixed(2)}
                      </span>
                    </div>

                    {selectedComanda.status === "open" ? (
                      <button
                        type="button"
                        disabled={comandaItems.length === 0 || isClosingComanda}
                        onClick={handleOpenCloseConfirm}
                        className="w-full min-h-[54px] py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.99] text-white font-black text-base sm:text-lg shadow-xl shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Receipt size={20} />
                        <span>FECHAR CONTA • R$ {computedTotal.toFixed(2)}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePrintComanda(selectedComanda, comandaItems)}
                        className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-white font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Printer size={18} />
                        <span>Imprimir Comprovante da Comanda</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Fechamento */}
      <CloseComandaConfirmModal
        open={closeModalOpen}
        comanda={selectedComanda}
        items={comandaItems}
        isSubmitting={isClosingComanda}
        onClose={() => !isClosingComanda && setCloseModalOpen(false)}
        onConfirm={handleConfirmCloseComanda}
      />
    </div>
  );
}
