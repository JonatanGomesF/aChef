import { useState, useEffect, useMemo } from "react";
import { supabase } from "../services/supabase";
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
import { printOrderReceipt } from "../services/usbPrinter";
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  Store,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";

type UnifiedItem = {
  id: string | number;
  name: string;
  price: number;
  size?: string;
  category: string;
  categoryId?: string;
  description?: string;
  isBalcaoOnly: boolean;
};

type CartItem = {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  observation?: string;
  isBalcaoOnly: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onOrderCreated?: (order: any) => void;
  onOpenCadastrarProdutoBalcao?: () => void;
};

export default function BalcaoModal({
  open,
  onClose,
  onOrderCreated,
  onOpenCadastrarProdutoBalcao,
}: Props) {
  // Catalogs
  const [menuCatalog, setMenuCatalog] = useState<MenuCatalog>(getMenuCatalog);
  const [balcaoProducts, setBalcaoProducts] = useState<BalcaoProduct[]>(getBalcaoProducts);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Counter Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("Balcão");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [trocoPara, setTrocoPara] = useState("");
  const [orderStatus, setOrderStatus] = useState<"delivered" | "preparing">("delivered");
  const [autoPrint, setAutoPrint] = useState(true);
  const [orderNotes, setOrderNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  // Load and subscribe to catalogs
  useEffect(() => {
    if (!open) return;

    fetchMenuCatalog().then((c) => setMenuCatalog(c));
    fetchBalcaoProducts().then((b) => setBalcaoProducts(b));

    const unsubMenu = subscribeMenuCatalog((c) => setMenuCatalog(c));
    const unsubBalcao = subscribeBalcaoProducts((b) => setBalcaoProducts(b));

    return () => {
      unsubMenu();
      unsubBalcao();
    };
  }, [open]);

  // Unified items list
  const allItems: UnifiedItem[] = useMemo(() => {
    const list: UnifiedItem[] = [];

    // 1. Produtos do Cardápio Geral (admin/cardápio)
    (menuCatalog.products || []).forEach((p) => {
      // Find category name
      const cat = (menuCatalog.categories || []).find((c) => c.id === p.categoryId);
      const catName = cat?.name || "Cardápio";
      list.push({
        id: `cardapio-${p.id}`,
        name: p.name,
        price: Number(p.price) || 0,
        size: p.size,
        category: catName,
        categoryId: p.categoryId,
        description: p.description,
        isBalcaoOnly: false,
      });
    });

    // 2. Produtos Exclusivos de Balcão (cigarros, litrão, etc.)
    (balcaoProducts || []).forEach((b) => {
      list.push({
        id: `balcao-${b.id}`,
        name: b.name,
        price: Number(b.price) || 0,
        category: b.category || "Exclusivos de Balcão",
        description: b.description,
        isBalcaoOnly: true,
      });
    });

    return list;
  }, [menuCatalog, balcaoProducts]);

  // Categories list for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [allItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let result = allItems;
    if (selectedCategory === "BALCAO_ONLY") {
      result = result.filter((i) => i.isBalcaoOnly);
    } else if (selectedCategory !== "ALL") {
      result = result.filter((i) => i.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.size && i.size.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allItems, selectedCategory, search]);

  // Cart operations
  const addToCart = (item: UnifiedItem) => {
    setCart((prev) => {
      const existing = prev.find((it) => it.id === item.id);
      if (existing) {
        return prev.map((it) =>
          it.id === item.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          size: item.size,
          isBalcaoOnly: item.isBalcaoOnly,
        },
      ];
    });
  };

  const updateQuantity = (itemId: string | number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((it) => {
          if (it.id === itemId) {
            const newQty = it.quantity + delta;
            return newQty > 0 ? { ...it, quantity: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (itemId: string | number) => {
    setCart((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Calculations
  const totalPrice = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.price * it.quantity, 0);
  }, [cart]);

  const trocoCalculado = useMemo(() => {
    if (paymentMethod !== "Dinheiro" || !trocoPara) return null;
    const clean = parseFloat(trocoPara.replace(",", "."));
    if (isNaN(clean)) return null;
    return Math.max(0, clean - totalPrice);
  }, [paymentMethod, trocoPara, totalPrice]);

  // Handle finalization
  const handleFinalize = async () => {
    if (cart.length === 0) {
      alert("Selecione pelo menos um item para registrar a venda no balcão.");
      return;
    }

    const trocoNumber =
      paymentMethod === "Dinheiro" && trocoPara
        ? parseFloat(trocoPara.replace(",", "."))
        : null;

    if (
      paymentMethod === "Dinheiro" &&
      trocoNumber !== null &&
      !isNaN(trocoNumber) &&
      trocoNumber < totalPrice
    ) {
      alert("O valor em dinheiro informado para troco é menor que o valor total da venda.");
      return;
    }

    setIsSubmitting(true);

    try {
      const baseNotes = orderNotes.trim();
      const combinedNotes = [
        "[VENDA NO BALCÃO]",
        baseNotes,
        cart
          .map((i) => (i.observation ? `${i.name}: ${i.observation}` : ""))
          .filter(Boolean)
          .join(" | "),
      ]
        .filter(Boolean)
        .join(" - ");

      const orderPayload = {
        customer_name: customerName.trim() || "Balcão / Consumo Local",
        customer_phone: "",
        street: "Consumo no Balcão",
        number: "Loja",
        district: "Presencial",
        items: cart.map((it) => ({
          name: it.name,
          size: it.size || undefined,
          quantity: it.quantity,
          price: it.price,
          extras: [],
          observation: it.isBalcaoOnly ? "Item de balcão" : undefined,
        })),
        total: totalPrice,
        payment_method: paymentMethod,
        change_for: trocoNumber && !isNaN(trocoNumber) ? trocoNumber : null,
        status: orderStatus,
        notes: combinedNotes,
      };

      const { error: insertError } = await supabase.from("orders").insert([orderPayload]);

      if (insertError) {
        throw insertError;
      }

      const createdOrder = {
        ...orderPayload,
        id: Date.now(),
        created_at: new Date().toISOString(),
      };
      setSuccessOrder(createdOrder);

      // Imprimir automaticamente se habilitado
      if (autoPrint) {
        try {
          await printOrderReceipt(createdOrder as any);
        } catch (printErr) {
          console.warn("Aviso ao imprimir recibo do balcão:", printErr);
        }
      }

      if (onOrderCreated) {
        onOrderCreated(createdOrder);
      }

      // Reset cart and stay ready for next customer
      setCart([]);
      setCustomerName("Balcão");
      setTrocoPara("");
      setOrderNotes("");
    } catch (err: any) {
      console.error("Erro ao registrar pedido de balcão:", err);
      alert("Erro ao registrar venda: " + (err?.message || "Tente novamente."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-7xl h-[95vh] flex flex-col rounded-3xl bg-[#141414] border border-orange-500/30 shadow-2xl overflow-hidden font-sans"
      >
        {/* ── Top Header ── */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.08] bg-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-950/40 flex-shrink-0">
              <Store size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-black text-xl sm:text-2xl tracking-tight">
                  Lançamento no Balcão
                </h2>
                <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PDV Rápido
                </span>
              </div>
              <p className="text-white/50 text-xs sm:text-sm font-medium mt-0.5">
                Venda local presencial direta • Integrado instantaneamente ao Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {onOpenCadastrarProdutoBalcao && (
              <button
                type="button"
                onClick={onOpenCadastrarProdutoBalcao}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-sm"
              >
                <Plus size={16} />
                <span>Cadastrar Produto de Balcão</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* ── Success Banner (quando uma venda acabou de ser realizada) ── */}
        {successOrder && (
          <div className="px-6 py-3 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span>
                Venda #{successOrder.id || "OK"} de R${" "}
                {Number(successOrder.total || 0).toFixed(2)} registrada com sucesso no sistema!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => printOrderReceipt(successOrder)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
              >
                <Printer size={13} /> Reimprimir
              </button>
              <button
                type="button"
                onClick={() => setSuccessOrder(null)}
                className="text-white/60 hover:text-white text-xs underline ml-2"
              >
                Dispensar
              </button>
            </div>
          </div>
        )}

        {/* ── Main Layout: Split Screen ── */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* ══════════════════════════════════════════════════════════════
              COLUNA ESQUERDA: LISTA DE ITENS DA LOJA (7 de 12 colunas)
             ══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 flex flex-col h-full border-r border-white/[0.08] bg-[#121212] overflow-hidden">
            {/* Barra de Busca e Filtros */}
            <div className="p-4 sm:p-5 border-b border-white/[0.06] bg-[#161616] space-y-3">
              {/* Campo de Busca Grande */}
              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar produto por nome ou categoria..."
                  className="w-full bg-[#1f1f1f] border border-white/[0.1] focus:border-orange-500 rounded-2xl pl-12 pr-10 py-3.5 text-white text-base sm:text-lg font-semibold outline-none placeholder:text-white/30 transition-all shadow-inner"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Pílulas de Categorias */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === "ALL"
                      ? "bg-primary text-white shadow-md shadow-orange-950/40"
                      : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                  }`}
                >
                  Todos ({allItems.length})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory("BALCAO_ONLY")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory === "BALCAO_ONLY"
                      ? "bg-amber-500 text-stone-950 shadow-md shadow-amber-950/40"
                      : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30"
                  }`}
                >
                  <Store size={14} />
                  <span>Exclusivos Balcão ({balcaoProducts.length})</span>
                </button>

                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-white text-stone-950 shadow-md"
                        : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Itens (Cards Grandes e Legíveis) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
              {filteredItems.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-3">
                  <ShoppingBag size={36} className="mx-auto text-white/20" />
                  <p className="text-white/60 text-base font-bold">Nenhum produto encontrado</p>
                  <p className="text-white/30 text-xs">
                    Tente buscar por outro termo ou selecione outra categoria.
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => {
                  const inCart = cart.find((it) => it.id === item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-4 group ${
                        inCart
                          ? "bg-orange-500/[0.07] border-orange-500/40 shadow-md"
                          : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]"
                      }`}
                    >
                      {/* Info do Produto com LETRAS MAIORES */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-white font-extrabold text-base sm:text-lg tracking-tight group-hover:text-amber-400 transition-colors">
                            {item.name}
                          </h4>
                          {item.size && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white/[0.08] text-white/70">
                              {item.size}
                            </span>
                          )}
                          {item.isBalcaoOnly && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <Store size={10} /> Balcão
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-white/40 text-xs sm:text-sm line-clamp-1">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-emerald-400 font-black text-base sm:text-xl">
                            R$ {item.price.toFixed(2)}
                          </span>
                          <span className="text-white/30 text-[11px] font-semibold">
                            • {item.category}
                          </span>
                        </div>
                      </div>

                      {/* Botão de Adição / Controle de Qtd */}
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {inCart ? (
                          <div className="flex items-center bg-[#1c1c1c] border border-orange-500/50 rounded-xl p-1 shadow-md">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white flex items-center justify-center font-black transition-all cursor-pointer"
                            >
                              <Minus size={15} />
                            </button>
                            <span className="w-10 text-center font-black text-white text-base">
                              {inCart.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-8 h-8 rounded-lg bg-primary hover:bg-orange-600 text-white flex items-center justify-center font-black transition-all cursor-pointer shadow-sm"
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-primary group-hover:bg-primary hover:text-white text-white/80 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Plus size={16} />
                            <span>Adicionar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé da Coluna Esquerda: Atalho para cadastrar novo produto de balcão */}
            {onOpenCadastrarProdutoBalcao && (
              <div className="p-3.5 border-t border-white/[0.08] bg-[#161616] flex items-center justify-between">
                <span className="text-white/40 text-xs">
                  Precisa de um item exclusivo? (Cigarro, litrão, dose, etc)
                </span>
                <button
                  type="button"
                  onClick={onOpenCadastrarProdutoBalcao}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
                >
                  <Plus size={14} /> Cadastrar Produto de Balcão
                </button>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              COLUNA DIREITA: COMANDA / FINALIZAÇÃO DA VENDA (5 de 12 colunas)
             ══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 flex flex-col h-full bg-[#181818] overflow-hidden">
            {/* Header da Comanda */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#1c1c1c] flex items-center justify-between">
              <div>
                <h3 className="text-white font-black text-lg sm:text-xl tracking-tight flex items-center gap-2">
                  <span>Comanda do Balcão</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-white/[0.08] text-white/70 font-mono">
                    {cart.reduce((s, it) => s + it.quantity, 0)} itens
                  </span>
                </h3>
                <p className="text-white/40 text-xs mt-0.5">
                  Revise os itens e selecione a forma de pagamento
                </p>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-rose-400/70 hover:text-rose-400 font-bold underline cursor-pointer"
                >
                  Limpar tudo
                </button>
              )}
            </div>

            {/* Lista de Itens do Pedido */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/20">
                    <Store size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-white/70 font-bold text-base">Comanda vazia</p>
                    <p className="text-white/30 text-xs max-w-xs">
                      Clique nos produtos da lista ao lado para adicionar ao pedido do balcão.
                    </p>
                  </div>
                </div>
              ) : (
                cart.map((it) => (
                  <div
                    key={it.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold text-sm sm:text-base truncate">
                          {it.name}
                        </span>
                        {it.size && (
                          <span className="text-[10px] text-white/60 font-semibold">
                            ({it.size})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/50 flex items-center gap-2 mt-0.5">
                        <span>
                          {it.quantity}x R$ {it.price.toFixed(2)}
                        </span>
                        <span className="text-emerald-400 font-extrabold text-sm">
                          = R$ {(it.price * it.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center bg-[#141414] rounded-lg p-0.5 border border-white/[0.08]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(it.id, -1)}
                          className="w-6 h-6 rounded text-white/70 hover:text-white flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-black text-white">
                          {it.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(it.id, 1)}
                          className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(it.id)}
                        className="p-1.5 text-rose-400/60 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Painel Inferior: Identificação, Pagamento e Finalização */}
            <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#1a1a1a] space-y-3.5">
              {/* Identificação do Cliente / Mesa */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 block">
                    Identificação / Mesa
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: Balcão / Mesa 2 / João"
                    className="w-full bg-[#121212] border border-white/[0.08] focus:border-orange-500 rounded-xl px-3 py-2 text-white text-xs sm:text-sm font-semibold outline-none placeholder:text-white/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/50 block">
                    Status do Pedido
                  </label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value as any)}
                    className="w-full bg-[#121212] border border-white/[0.08] focus:border-orange-500 rounded-xl px-2.5 py-2 text-white text-xs sm:text-sm font-semibold outline-none cursor-pointer"
                  >
                    <option value="delivered">✅ Concluído (Entregue)</option>
                    <option value="preparing">🍳 Em Preparo (Cozinha)</option>
                  </select>
                </div>
              </div>

              {/* Método de Pagamento com BOTÕES GRANDES */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-white/50 block">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: "PIX", label: "PIX" },
                    { id: "Dinheiro", label: "Dinheiro" },
                    { id: "Crédito", label: "Crédito" },
                    { id: "Débito", label: "Débito" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`py-2 px-1 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer text-center ${
                        paymentMethod === m.id
                          ? "bg-primary text-white shadow-md shadow-orange-950/40 border border-orange-400"
                          : "bg-white/[0.04] text-white/60 hover:text-white border border-white/[0.06]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Troco para Dinheiro */}
              {paymentMethod === "Dinheiro" && (
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                      Recebido em dinheiro (R$):
                    </label>
                    <input
                      type="text"
                      value={trocoPara}
                      onChange={(e) => setTrocoPara(e.target.value)}
                      placeholder="Ex: 50,00"
                      className="bg-[#121212] border border-white/[0.1] focus:border-emerald-500 rounded-lg px-2.5 py-1 text-white text-sm font-bold w-28 outline-none"
                    />
                  </div>

                  {trocoCalculado !== null && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                        Troco a devolver:
                      </span>
                      <span className="text-emerald-400 font-black text-lg">
                        R$ {trocoCalculado.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Total do Pedido com LETRAS GRANDES */}
              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-black tracking-wider text-white/50 block">
                    Total a Pagar
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <label className="inline-flex items-center gap-1.5 text-xs text-white/60 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoPrint}
                        onChange={(e) => setAutoPrint(e.target.checked)}
                        className="rounded border-white/20 text-orange-500 focus:ring-orange-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Imprimir Recibo Térmico</span>
                    </label>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight leading-none">
                    R$ {totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botão Finalizar Grande */}
              <button
                type="button"
                onClick={handleFinalize}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.99] text-white font-black text-base sm:text-lg shadow-xl shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Registrando no Supabase...</span>
                  </>
                ) : (
                  <>
                    <span>FINALIZAR LANÇAMENTO</span>
                    <span className="opacity-90">• R$ {totalPrice.toFixed(2)}</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
