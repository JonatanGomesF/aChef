import { useState, useEffect, useMemo } from "react";
import type { Product, ProductExtra } from "../data/products";
import { getDefaultExtrasForProduct } from "../data/extras";
import { X, Plus, Minus, Check, ChevronRight } from "lucide-react";

type Props = {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: any) => void;
};

export default function ProductModal({ open, product, onClose, onAddToCart }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [selectedExtras, setSelectedExtras] = useState<(string | number)[]>([]);
  const [activeExtraCategory, setActiveExtraCategory] = useState("Adicionais");
  const [visible, setVisible] = useState(false);

  const productExtras: ProductExtra[] = useMemo(() => {
    if (!product) return [];
    if (product.extras !== undefined) {
      return product.extras.filter((e) => e.available !== false);
    }
    return getDefaultExtrasForProduct(product.name).filter((e) => e.available !== false);
  }, [product]);

  const extraCategories = useMemo(() => {
    return Array.from(new Set(productExtras.map((e) => e.category?.trim() || "Adicionais")));
  }, [productExtras]);

  useEffect(() => {
    if (open && product) {
      setQuantity(1);
      setObservation("");
      setSelectedExtras([]);

      const initialExtras = product.extras !== undefined
        ? product.extras.filter((e) => e.available !== false)
        : getDefaultExtrasForProduct(product.name).filter((e) => e.available !== false);

      const cats = Array.from(new Set(initialExtras.map((e) => e.category?.trim() || "Adicionais")));
      setActiveExtraCategory(cats[0] ?? "Adicionais");
      // Small delay so CSS transition plays
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open, product]);

  if (!open || !product) return null;

  function toggleExtra(id: string | number) {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const isAvailable = product.available !== false;

  const extrasPrice = productExtras
    .filter((e) => selectedExtras.includes(e.id))
    .reduce((t, e) => t + Number(e.price || 0), 0);

  const basePrice = product.promotionalPrice ?? product.price;
  const finalPrice = (basePrice + extrasPrice) * quantity;

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-end md:items-center justify-center p-0 md:p-6 transition-all duration-250 ${visible ? "bg-black/70 backdrop-blur-sm" : "bg-black/0 pointer-events-none"
        }`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white w-full md:max-w-[520px] rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 max-h-[92vh] md:max-h-[88vh] ${visible
            ? "translate-y-0 opacity-100 md:scale-100"
            : "translate-y-8 opacity-0 md:scale-95"
          }`}
      >
        {/* ── Image with gradient overlay ── */}
        <div className="relative h-52 md:h-60 flex-shrink-0 bg-gray-100 overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {/* Gradient bottom to white */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/70 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer backdrop-blur-sm"
          >
            <X size={16} />
          </button>

          {/* Size + promo badge */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1 rounded-full">
              {product.size}
            </span>
            {product.promotionActive && (
              <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md">
                PROMOÇÃO
              </span>
            )}
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Header */}
          <div className="px-6 pt-3 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-black text-gray-900 leading-snug">{product.name}</h2>
              <div className="text-right flex-shrink-0 pt-0.5">
                {product.promotionActive ? (
                  <>
                    <p className="text-xs text-gray-400 line-through">R$ {product.price.toFixed(2)}</p>
                    <p className="text-lg font-black text-primary">R$ {product.promotionalPrice?.toFixed(2)}</p>
                  </>
                ) : (
                  <p className="text-lg font-black text-gray-900">R$ {product.price.toFixed(2)}</p>
                )}
              </div>
            </div>
            <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">{product.description}</p>
            {!isAvailable && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-red-700 text-xs font-black uppercase tracking-[0.16em]">
                ESGOTADO
              </div>
            )}
          </div>

          {/* ── Extras section ── */}
          {productExtras.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3 gap-3">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  Adicionais
                </h3>
                <span className="text-[10px] text-gray-400 font-semibold">Opcional</span>
              </div>

              {extraCategories.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {extraCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveExtraCategory(category)}
                      className={`px-3 py-2 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                        activeExtraCategory === category
                          ? "bg-primary text-white shadow-md shadow-orange-950/20"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {productExtras
                  .filter((extra) => {
                    if (extraCategories.length <= 1) return true;
                    return (extra.category?.trim() || "Adicionais") === activeExtraCategory;
                  })
                  .map((extra) => {
                    const isChecked = selectedExtras.includes(extra.id);
                    return (
                      <label
                        key={extra.id}
                        onClick={() => toggleExtra(extra.id)}
                        className={`flex items-center justify-between rounded-xl p-3.5 cursor-pointer select-none transition-all duration-200 border ${
                          isChecked
                            ? "border-primary bg-orange-50/60"
                            : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 shrink-0 ${
                              isChecked ? "bg-primary" : "border border-gray-300 bg-white"
                            }`}
                          >
                            {isChecked && <Check size={12} className="text-white stroke-3" />}
                          </div>
                          <span className="text-[13px] font-semibold text-gray-700">{extra.name}</span>
                        </div>
                        <span
                          className={`text-[12px] font-bold ${
                            Number(extra.price) > 0 ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {Number(extra.price) > 0 ? `+ R$ ${Number(extra.price).toFixed(2)}` : "Grátis"}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── Observation ── */}
          <div className="px-6 py-4">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
              Alguma observação?
            </h3>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: sem cebola, pouco molho, bem temperado..."
              className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 placeholder-gray-400 transition-all duration-200 resize-none"
              rows={2}
            />
          </div>
        </div>

        {/* ── Sticky Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center gap-3 flex-shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">

          {/* Quantity selector */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1.5">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center transition-all duration-200 text-gray-500 cursor-pointer active:scale-90"
            >
              <Minus size={14} />
            </button>
            <span className="text-sm font-black px-2 text-gray-800 min-w-[1.5rem] text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-lg bg-primary hover:bg-primary-hover flex items-center justify-center transition-all duration-200 text-white cursor-pointer active:scale-90"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add to cart button */}
          <button
            onClick={() => {
              if (!isAvailable) return;
              window.dispatchEvent(
                new CustomEvent("add-to-cart-animation", {
                  detail: { x: window.innerWidth / 2, y: window.innerHeight - 80, image: product.image },
                })
              );
              onAddToCart({
                ...product,
                quantity,
                observation,
                extras: productExtras.filter((e) => selectedExtras.includes(e.id)),
                price: basePrice + extrasPrice,
              });
              handleClose();
            }}
            disabled={!isAvailable}
            className={`flex-1 py-3.5 px-5 rounded-xl font-black text-sm flex items-center justify-between transition-all duration-300 ${
              isAvailable
                ? "bg-primary hover:bg-primary-hover text-white shadow-lg shadow-orange-950/10 hover:shadow-orange-950/25 hover:-translate-y-0.5 active:scale-98 cursor-pointer group"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <span>{isAvailable ? "Adicionar ao carrinho" : "Item pausado no momento"}</span>
            {isAvailable && (
              <span className="flex items-center gap-1.5">
                <span className="opacity-60 text-xs">•</span>
                <span>R$ {finalPrice.toFixed(2)}</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}