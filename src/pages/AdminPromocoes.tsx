import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { fetchMenuCatalog, getMenuCatalog, subscribeMenuCatalog } from "../lib/menuCatalog";
import type { Product } from "../data/products";
import AdminLayout from "../components/AdminLayout";
import { RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight, Tag, X } from "lucide-react";

type Promotion = {
  id: number;
  title: string;
  description: string;
  discount: number;
  active: boolean;
  product_id: number;
  expires_at: string | null;
  created_at: string;
};

export default function AdminPromocoes() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>(() => getMenuCatalog().products);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);

  // Form state
  const [productId,  setProductId]  = useState("");
  const [title,      setTitle]      = useState("");
  const [description,setDescription]= useState("");
  const [discount,   setDiscount]   = useState("");
  const [expiresAt,  setExpiresAt]  = useState("");
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
    setPromotions(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetchMenuCatalog().then((cat) => setProducts(cat.products));
    const unsubscribeCatalog = subscribeMenuCatalog((cat) => setProducts(cat.products));
    return () => {
      unsubscribeCatalog();
    };
  }, []);

  const selectedProduct = products.find((p) => p.id === Number(productId));

  const validate = () => {
    if (!title.trim())   return "Informe o título da promoção.";
    if (!productId)      return "Selecione um produto.";
    const d = Number(discount);
    if (isNaN(d) || d <= 0) return "Informe um desconto válido.";
    if (selectedProduct && d >= selectedProduct.price)
      return `Desconto não pode ser maior ou igual ao preço (R$ ${selectedProduct.price.toFixed(2)}).`;
    return null;
  };

  const create = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setFormError("");
    setSaving(true);
    const { error } = await supabase.from("promotions").insert([{
      title, description,
      discount: Number(discount),
      product_id: Number(productId),
      active: false,
      expires_at: expiresAt || null,
    }]);
    setSaving(false);
    if (error) { setFormError("Erro ao salvar. Tente novamente."); return; }
    setTitle(""); setDescription(""); setDiscount(""); setProductId(""); setExpiresAt("");
    setShowForm(false);
    load();
  };

  const toggle = async (id: number, active: boolean) => {
    await supabase.from("promotions").update({ active: !active }).eq("id", id);
    setPromotions((prev) => prev.map((p) => p.id === id ? { ...p, active: !active } : p));
  };

  const remove = async (id: number) => {
    if (!confirm("Excluir esta promoção?")) return;
    await supabase.from("promotions").delete().eq("id", id);
    setPromotions((prev) => prev.filter((p) => p.id !== id));
  };

  const isExpired = (p: Promotion) =>
    p.expires_at ? new Date(p.expires_at) < new Date() : false;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-black text-xl tracking-tight">Promoções</h1>
          <p className="text-white/30 text-xs font-medium mt-0.5">
            {promotions.filter((p) => p.active && !isExpired(p)).length} ativa(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c0261a] hover:bg-[#a31d12] text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-red-900/30"
          >
            {showForm ? <X size={13} /> : <Plus size={13} />}
            {showForm ? "Fechar" : "Nova Promoção"}
          </button>
          <button onClick={load} className="p-2 rounded-xl border border-white/[0.08] text-white/40 hover:text-white transition-all cursor-pointer">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="rounded-2xl p-5 mb-6 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-white font-black text-sm flex items-center gap-2">
            <Tag size={15} className="text-[#c0261a]" /> Nova Promoção
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Título */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-white/35 text-[10px] font-bold uppercase tracking-wider">Título *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Super oferta de frango"
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#c0261a]/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all placeholder:text-white/20" />
            </div>

            {/* Produto */}
            <div className="space-y-1">
              <label className="text-white/35 text-[10px] font-bold uppercase tracking-wider">Produto *</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#c0261a]/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none cursor-pointer">
                <option value="">Selecione...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {p.size}</option>
                ))}
              </select>
            </div>

            {/* Desconto */}
            <div className="space-y-1">
              <label className="text-white/35 text-[10px] font-bold uppercase tracking-wider">
                Desconto (R$) *{selectedProduct ? ` — Preço: R$ ${selectedProduct.price.toFixed(2)}` : ""}
              </label>
              <input type="number" step="0.01" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#c0261a]/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all placeholder:text-white/20" />
              {selectedProduct && discount && Number(discount) > 0 && (
                <p className="text-green-400 text-[10px] font-semibold">
                  Preço com desconto: R$ {(selectedProduct.price - Number(discount)).toFixed(2)}
                </p>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <label className="text-white/35 text-[10px] font-bold uppercase tracking-wider">Descrição</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição opcional"
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#c0261a]/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all placeholder:text-white/20" />
            </div>

            {/* Validade */}
            <div className="space-y-1">
              <label className="text-white/35 text-[10px] font-bold uppercase tracking-wider">Validade (opcional)</label>
              <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#c0261a]/50 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all" />
            </div>
          </div>

          {formError && (
            <div className="text-red-400 text-[11px] font-semibold bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{formError}</div>
          )}

          <button onClick={create} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-[#c0261a] hover:bg-[#a31d12] text-white font-black text-sm transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-red-900/20">
            {saving ? "Salvando..." : "Salvar Promoção"}
          </button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-white/25 text-center py-16">Carregando...</div>
      ) : promotions.length === 0 ? (
        <div className="text-white/25 text-center py-16">Nenhuma promoção cadastrada</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promo) => {
            const prod    = products.find((p) => p.id === promo.product_id);
            const expired = isExpired(promo);
            const finalPrice = prod ? prod.price - promo.discount : null;

            return (
              <div key={promo.id} className="rounded-2xl p-4 space-y-3 flex flex-col"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${promo.active && !expired ? "rgba(192,38,26,0.35)" : "rgba(255,255,255,0.06)"}` }}>

                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-white font-black text-sm truncate">{promo.title}</h3>
                    {prod && <p className="text-white/40 text-[10px] font-semibold mt-0.5">{prod.name} — {prod.size}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {expired && <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">Expirada</span>}
                    {promo.active && !expired && <span className="text-[9px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">Ativa</span>}
                  </div>
                </div>

                {/* Preço */}
                {prod && (
                  <div className="flex items-center gap-3">
                    <span className="text-white/35 text-xs line-through">R$ {prod.price.toFixed(2)}</span>
                    <span className="text-[#c0261a] font-black text-base">R$ {finalPrice?.toFixed(2)}</span>
                    <span className="text-xs font-bold text-white/40">(-R$ {promo.discount.toFixed(2)})</span>
                  </div>
                )}

                {promo.description && <p className="text-white/40 text-xs">{promo.description}</p>}

                {promo.expires_at && (
                  <p className="text-white/25 text-[10px] font-semibold">
                    Válida até: {new Date(promo.expires_at).toLocaleString("pt-BR")}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <button onClick={() => toggle(promo.id, promo.active)}
                    className={`flex items-center gap-1.5 flex-1 justify-center py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      promo.active
                        ? "border-red-500/20 text-red-400 hover:bg-red-500/10"
                        : "border-green-500/20 text-green-400 hover:bg-green-500/10"
                    }`}>
                    {promo.active ? <><ToggleRight size={13} /> Desativar</> : <><ToggleLeft size={13} /> Ativar</>}
                  </button>
                  <button onClick={() => remove(promo.id)}
                    className="p-2 rounded-xl border border-white/[0.08] text-white/30 hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}