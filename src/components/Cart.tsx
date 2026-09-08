import { Trash2, Plus, Minus, ShoppingCart, ArrowLeft } from "lucide-react";
import { smoothScrollTo } from "../lib/smoothScroll";

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
  observation?: string;
  promotionActive?: boolean;
  extras?: {
    id: number;
    name: string;
    price: number;
  }[];
};

type CartProps = {
  items: CartItem[];
  increaseQuantity: (id: number) => void;
  decreaseQuantity: (id: number) => void;
  removeItem: (id: number) => void;
  onClose: () => void;
  onCheckout: () => void;
};

export default function Cart({
  items,
  increaseQuantity,
  decreaseQuantity,
  removeItem,
  onClose,
  onCheckout,
}: CartProps) {
  const total = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <div className="bg-white h-full flex flex-col shadow-inner">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-primary">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-800">Seu Carrinho</h2>
            <p className="text-xs text-gray-400 font-semibold">
              {items.length === 0 ? "Vazio" : `${items.length} produto(s)`}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1 text-gray-500 hover:text-primary text-sm font-bold transition-colors duration-200 active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar</span>
        </button>
      </div>

      {/* Cart Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <span className="text-5xl animate-bounce">🍽️</span>
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-gray-700">Seu carrinho está vazio</h3>
              <p className="text-xs text-gray-400 max-w-[240px]">
                Adicione porções e pratos deliciosos do nosso cardápio para começar.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                smoothScrollTo("cardapio", { duration: 1200, offset: -70 });
              }}
              className="px-6 py-2.5 bg-orange-50 text-primary rounded-xl text-xs font-black hover:bg-orange-100 transition-colors duration-300 cursor-pointer"
            >
              Ver Cardápio
            </button>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="group border border-gray-100 rounded-3xl p-3 flex gap-3 bg-white hover:border-orange-200 transition-all duration-300 shadow-sm"
            >
              {/* Product Thumbnail */}
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0 relative">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Item Details */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-800 group-hover:text-primary transition-colors duration-200">
                        {item.name}
                      </h4>
                      {item.size && (
                        <span className="inline-block text-[9px] font-black uppercase text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5">
                          {item.size}
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-primary p-1 rounded-lg hover:bg-orange-50 transition-all duration-200 cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Extras list inside cart */}
                  {item.extras && item.extras.length > 0 && (
                    <div className="text-[10px] text-green-600 font-semibold mt-1.5 space-y-0.5 bg-green-50/50 p-2 rounded-lg border border-green-100/30">
                      {item.extras.map((extra) => (
                        <div key={extra.id} className="flex justify-between">
                          <span>+ {extra.name}</span>
                          <span>+ R$ {extra.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Observations */}
                  {item.observation && (
                    <div className="text-[10px] text-gray-400 italic mt-1.5 bg-gray-50 p-1.5 rounded border border-gray-100/50">
                      Obs: {item.observation}
                    </div>
                  )}
                </div>

                {/* Pricing & Quantities */}
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50">
                  <span className="font-extrabold text-sm text-gray-800">
                    R$ {(item.price * item.quantity).toFixed(2)}
                  </span>

                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 p-1 rounded-xl">
                    <button
                      onClick={() => decreaseQuantity(item.id)}
                      className="w-7 h-7 rounded-lg hover:bg-white text-gray-500 font-bold flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer"
                    >
                      <Minus size={12} />
                    </button>

                    <span className="font-black text-xs px-2 text-gray-700">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => increaseQuantity(item.id)}
                      className="w-7 h-7 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer shadow-sm shadow-orange-500/20"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Footer */}
      {items.length > 0 && (
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-400 font-semibold">
              <span>Subtotal</span>
              <span>R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 font-semibold">
              <span>Taxa de Entrega</span>
              <span className="text-green-600 font-bold">Calculada no checkout</span>
            </div>
            <div className="flex justify-between text-base font-black text-gray-800 pt-2 border-t border-dashed border-gray-200">
              <span>Total</span>
              <span className="text-primary">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={onCheckout}
            className="w-full bg-primary hover:bg-primary-hover text-white py-3.5 px-5 rounded-2xl font-black text-center shadow-lg shadow-orange-500/25 active:scale-98 transition-all duration-300 cursor-pointer text-sm md:text-sm flex justify-center items-center gap-2 group relative overflow-hidden"
          >
            <span>Finalizar pedido</span>
            <span className="opacity-30">•</span>
            <span>R$ {total.toFixed(2)}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          </button>
        </div>
      )}
    </div>
  );
}