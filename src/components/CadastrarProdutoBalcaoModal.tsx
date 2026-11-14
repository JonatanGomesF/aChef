import { useState, useEffect } from "react";
import {
  getBalcaoProducts,
  saveBalcaoProducts,
  type BalcaoProduct,
} from "../lib/balcaoProducts";
import { X, Trash2, Edit3, Check, Store, Package } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onProductsUpdated?: () => void;
};

const CATEGORIAS_SUGERIDAS = [
  "Bebidas",
  "Tabacaria",
  "Bomboniere",
  "Doses & Destilados",
  "Snacks & Salgadinhos",
  "Diversos",
];

export default function CadastrarProdutoBalcaoModal({ open, onClose, onProductsUpdated }: Props) {
  const [products, setProducts] = useState<BalcaoProduct[]>([]);
  const [search, setSearch] = useState("");
  const [isEditingId, setIsEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Bebidas");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setProducts(getBalcaoProducts());
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setName("");
    setPrice("");
    setCategory("Bebidas");
    setDescription("");
    setIsEditingId(null);
  };

  const handleEditClick = (prod: BalcaoProduct) => {
    setIsEditingId(prod.id);
    setName(prod.name);
    setPrice(prod.price.toFixed(2));
    setCategory(prod.category || "Diversos");
    setDescription(prod.description || "");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Por favor, digite o nome do produto.");
      return;
    }
    const cleanPrice = parseFloat(price.replace(",", "."));
    if (isNaN(cleanPrice) || cleanPrice <= 0) {
      alert("Por favor, digite um preço válido maior que zero.");
      return;
    }

    setSaving(true);

    try {
      let updated: BalcaoProduct[];
      if (isEditingId) {
        // Atualizar existente
        updated = products.map((p) =>
          p.id === isEditingId
            ? {
                ...p,
                name: name.trim(),
                price: cleanPrice,
                category: category.trim() || "Diversos",
                description: description.trim(),
              }
            : p
        );
      } else {
        // Novo produto
        const newProduct: BalcaoProduct = {
          id: `balcao-${Date.now()}`,
          name: name.trim(),
          price: cleanPrice,
          category: category.trim() || "Diversos",
          description: description.trim(),
          available: true,
          isBalcaoOnly: true,
          created_at: new Date().toISOString(),
        };
        updated = [newProduct, ...products];
      }

      const result = await saveBalcaoProducts(updated);
      setProducts(result);
      if (onProductsUpdated) onProductsUpdated();

      setFeedbackMsg(
        isEditingId ? "Produto de balcão atualizado!" : "Produto cadastrado com sucesso!"
      );
      setTimeout(() => setFeedbackMsg(null), 3000);
      resetForm();
    } catch (err) {
      console.error("Erro ao salvar produto de balcão:", err);
      alert("Erro ao salvar produto de balcão.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, prodName: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${prodName}" dos produtos de balcão?`)) {
      return;
    }
    const filtered = products.filter((p) => p.id !== id);
    const result = await saveBalcaoProducts(filtered);
    setProducts(result);
    if (onProductsUpdated) onProductsUpdated();
    if (isEditingId === id) resetForm();
  };

  if (!open) return null;

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#151515] border border-orange-500/30 shadow-2xl overflow-hidden"
      >
        {/* ── Top Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-950/30 flex-shrink-0">
              <Store size={22} />
            </div>
            <div>
              <h2 className="text-white font-black text-lg sm:text-xl tracking-tight flex items-center gap-2">
                <span>Cadastrar Produto de Balcão</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Exclusivo Loja
                </span>
              </h2>
              <p className="text-white/50 text-xs sm:text-sm mt-0.5">
                Itens vendidos apenas presencialmente (ex: cigarros, litrão).{" "}
                <strong className="text-orange-400 font-bold">NÃO aparecem no cardápio online</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Feedback Message ── */}
        {feedbackMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <Check size={16} />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* ── Content Grid (Formulário + Lista) ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Formulário de Cadastro/Edição */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] space-y-4">
              <h3 className="text-white font-bold text-sm sm:text-base flex items-center justify-between">
                <span>{isEditingId ? "✏️ Editar Produto de Balcão" : "➕ Novo Produto de Balcão"}</span>
                {isEditingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-orange-400 hover:underline cursor-pointer"
                  >
                    Cancelar edição
                  </button>
                )}
              </h3>

              <form onSubmit={handleSave} className="space-y-3.5">
                {/* Nome */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider block">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Cerveja Skol Litrão / Cigarro"
                    className="w-full bg-[#1e1e1e] border border-white/[0.1] focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none font-medium placeholder:text-white/20"
                  />
                </div>

                {/* Preço */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider block">
                    Preço de Venda (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm">
                      R$
                    </span>
                    <input
                      type="text"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-[#1e1e1e] border border-white/[0.1] focus:border-emerald-500 rounded-xl pl-10 pr-3.5 py-2.5 text-white font-bold text-base outline-none placeholder:text-white/20"
                    />
                  </div>
                </div>

                {/* Categoria */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider block">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: Bebidas, Tabacaria, Doses..."
                    className="w-full bg-[#1e1e1e] border border-white/[0.1] focus:border-orange-500 rounded-xl px-3.5 py-2 text-white text-sm outline-none placeholder:text-white/20"
                  />
                  {/* Pílulas de categorias rápidas */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {CATEGORIAS_SUGERIDAS.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          category === cat
                            ? "bg-orange-500 text-white border-orange-400"
                            : "bg-white/[0.04] text-white/50 border-white/[0.06] hover:text-white hover:bg-white/[0.08]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descrição / Obs */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider block">
                    Observação / Detalhes (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Garrafa retornável, consumir no local..."
                    className="w-full bg-[#1e1e1e] border border-white/[0.1] focus:border-orange-500 rounded-xl px-3.5 py-2 text-white text-xs outline-none placeholder:text-white/20"
                  />
                </div>

                {/* Botão de Salvar */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-[0.99] text-white font-black text-sm shadow-lg shadow-orange-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check size={16} />
                  <span>{saving ? "Salvando..." : isEditingId ? "Salvar Alterações" : "Cadastrar Produto"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Coluna Direita: Lista de Produtos Cadastrados */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
                <Package size={17} className="text-orange-400" />
                <span>Itens Exclusivos de Balcão ({products.length})</span>
              </h3>
            </div>

            {/* Busca */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou categoria..."
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-orange-500 rounded-xl px-3.5 py-2 text-white text-xs outline-none placeholder:text-white/30"
            />

            {/* Lista com scroll */}
            <div className="flex-1 max-h-[460px] overflow-y-auto space-y-2 pr-1">
              {filteredProducts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                  <p className="text-white/40 text-sm font-medium">Nenhum produto de balcão cadastrado ainda.</p>
                  <p className="text-white/25 text-xs">
                    Cadastre itens como cigarros, bebidas de garrafa ou doses no formulário ao lado.
                  </p>
                </div>
              ) : (
                filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm sm:text-base truncate">
                          {prod.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20 flex-shrink-0">
                          {prod.category || "Balcão"}
                        </span>
                      </div>
                      {prod.description && (
                        <p className="text-white/40 text-xs truncate">{prod.description}</p>
                      )}
                      <div className="text-emerald-400 font-extrabold text-sm sm:text-base">
                        R$ {prod.price.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditClick(prod)}
                        title="Editar"
                        className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-white/60 hover:text-white transition-all cursor-pointer"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(prod.id, prod.name)}
                        title="Excluir"
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-[#1a1a1a] flex items-center justify-between">
          <span className="text-white/40 text-xs">
            💡 Estes produtos ficam salvos na nuvem e aparecem na tela de <strong>Lançamento no Balcão</strong>.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-xs transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
