import { Plus } from "lucide-react";
import type { Product } from "../data/products";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
  onOpenProduct: (product: Product) => void;
};

export default function ProductCard({ product, onAddToCart, onOpenProduct }: ProductCardProps) {
  const isAvailable = product.available !== false;

  return (
    <article
      onClick={() => isAvailable && onOpenProduct(product)}
      className={`group relative bg-white rounded-3xl border border-gray-100 transition-all duration-300 overflow-hidden flex flex-col ${
        isAvailable
          ? "hover:border-gray-200 hover:shadow-xl cursor-pointer"
          : "border-gray-200 shadow-sm bg-white/90 cursor-not-allowed grayscale-[0.35] opacity-80"
      }`}
    >
      {/* Image */}
      <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden bg-gray-50 flex-shrink-0">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Gradient overlay bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Promo badge */}
        {product.promotionActive && (
          <div className="absolute top-3 left-3 bg-[#e25c24] text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-md">
            PROMOÇÃO
          </div>
        )}

        {/* Size badge */}
        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[9px] font-black px-2.5 py-1 rounded-full">
          {product.size}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-[15px] text-gray-900 leading-snug group-hover:text-[#e25c24] transition-colors duration-200">
            {product.name}
          </h3>
          <p className="text-gray-400 text-[12px] mt-1 leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Price + Add button */}
        <div className="flex items-center justify-between">
          <div>
            {product.promotionActive ? (
              <div>
                <span className="text-[11px] text-gray-400 line-through block">
                  R$ {product.price.toFixed(2)}
                </span>
                <span className="text-base font-black text-[#e25c24]">
                  R$ {product.promotionalPrice?.toFixed(2)}
                </span>
              </div>
            ) : (
              <span className="text-base font-black text-gray-900">
                R$ {product.price.toFixed(2)}
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isAvailable) return;

              // Feedback visual no botão
              const btn = e.currentTarget;
              btn.classList.add("scale-75");
              setTimeout(() => btn.classList.remove("scale-75"), 180);

              // Dispara a animação no próximo frame para garantir fluidez
              const rect = btn.getBoundingClientRect();
              requestAnimationFrame(() => {
                window.dispatchEvent(
                  new CustomEvent("add-to-cart-animation", {
                    detail: {
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2,
                      image: product.image,
                    },
                  })
                );
              });

              onAddToCart(product);
            }}
            disabled={!isAvailable}
            className={`w-9 h-9 rounded-xl text-white flex items-center justify-center transition-all duration-150 shadow-md shadow-orange-950/10 ${
              isAvailable
                ? "bg-[#e25c24] hover:bg-[#c2410c] hover:shadow-orange-950/20 hover:-translate-y-0.5 cursor-pointer"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </article>
  );
}