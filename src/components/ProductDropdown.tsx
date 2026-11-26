import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Search, X, Store, Package, Check } from "lucide-react";

export type UnifiedProductItem = {
  id: string;
  numericId?: number;
  name: string;
  price: number;
  size?: string;
  category: string;
  categoryId?: string;
  description?: string;
  isBalcaoOnly: boolean;
  available: boolean;
};

type Props = {
  items: UnifiedProductItem[];
  selectedId: string;
  onSelect: (item: UnifiedProductItem) => void;
  disabled?: boolean;
};

export default function ProductDropdown({ items, selectedId, onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId]
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [items]);

  const balcaoCount = useMemo(
    () => items.filter((i) => i.isBalcaoOnly).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    let list = items;
    if (selectedCategory === "BALCAO_ONLY") {
      list = list.filter((i) => i.isBalcaoOnly);
    } else if (selectedCategory !== "ALL") {
      list = list.filter((i) => i.category === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.size && i.size.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, selectedCategory, search]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const handleChoose = (item: UnifiedProductItem) => {
    onSelect(item);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full min-h-[52px] px-3.5 py-2.5 rounded-2xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer disabled:opacity-50 ${
          open
            ? "bg-[#222222] border-orange-500 ring-2 ring-orange-500/20"
            : "bg-[#121212] border-white/[0.14] hover:border-white/30"
        }`}
      >
        {selectedItem ? (
          <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-white font-bold text-sm sm:text-base truncate">
                  {selectedItem.name}
                </span>
                {selectedItem.size && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/75">
                    {selectedItem.size}
                  </span>
                )}
                {selectedItem.isBalcaoOnly && (
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Balcão
                  </span>
                )}
              </div>
              <div className="text-[11px] text-white/45 truncate">
                {selectedItem.category}
                {!selectedItem.available && " • Esgotado no cardápio"}
              </div>
            </div>
            <span className="text-emerald-400 font-black text-sm sm:text-base flex-shrink-0">
              R$ {selectedItem.price.toFixed(2)}
            </span>
          </div>
        ) : (
          <span className="text-white/50 text-sm font-semibold">
            Toque para escolher um produto...
          </span>
        )}

        <ChevronDown
          size={19}
          className={`text-white/50 flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180 text-orange-400" : ""
          }`}
        />
      </button>

      {/* No celular (< sm) abre como tela cheia limpa para nunca cortar; no desktop abre como dropdown ancorado */}
      {open && (
        <div className="fixed inset-0 z-[9996] flex flex-col bg-[#141414] sm:absolute sm:inset-auto sm:left-0 sm:right-0 sm:mt-2 sm:rounded-2xl sm:bg-[#181818] sm:border sm:border-orange-500/35 sm:shadow-2xl sm:shadow-black/80 overflow-hidden animate-in fade-in duration-150">
          {/* Header mobile do seletor */}
          <div className="flex sm:hidden items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#1a1a1a] flex-shrink-0">
            <span className="text-white font-black text-base">Selecionar Produto</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl bg-white/[0.08] text-white/80 hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Busca + Categorias */}
          <div className="p-3 border-b border-white/[0.08] bg-[#1c1c1c] space-y-2.5 flex-shrink-0">
            <div className="relative">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto ou categoria..."
                className="w-full min-h-[44px] bg-[#101010] border border-white/[0.12] focus:border-orange-500 rounded-xl pl-10 pr-9 py-2.5 text-white text-sm font-medium outline-none placeholder:text-white/35"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filtros de Categoria */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === "ALL"
                    ? "bg-primary text-white"
                    : "bg-white/[0.06] text-white/65 hover:text-white"
                }`}
              >
                Todos ({items.length})
              </button>

              {balcaoCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("BALCAO_ONLY")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                    selectedCategory === "BALCAO_ONLY"
                      ? "bg-amber-500 text-stone-950"
                      : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  <Store size={12} />
                  <span>Balcão ({balcaoCount})</span>
                </button>
              )}

              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-white text-stone-950"
                      : "bg-white/[0.06] text-white/65 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Opções */}
          <div className="flex-1 sm:max-h-72 overflow-y-auto divide-y divide-white/[0.06] pb-6 sm:pb-0">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-sm space-y-1.5">
                <Package size={28} className="mx-auto text-white/20" />
                <p className="font-bold">Nenhum produto encontrado</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleChoose(item)}
                    className={`w-full px-4 py-3.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-orange-500/15"
                        : "hover:bg-white/[0.05] active:bg-white/[0.1]"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white font-bold text-sm sm:text-base">
                          {item.name}
                        </span>
                        {item.size && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                            {item.size}
                          </span>
                        )}
                        {item.isBalcaoOnly && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Balcão
                          </span>
                        )}
                        {!item.available && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Esgotado
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/45">{item.category}</div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-emerald-400 font-black text-sm sm:text-base">
                        R$ {item.price.toFixed(2)}
                      </span>
                      {isSelected && <Check size={16} className="text-orange-400" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
