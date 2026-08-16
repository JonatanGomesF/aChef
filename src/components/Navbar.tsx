import { useState, useEffect } from "react";
import { Menu, X, ShoppingCart } from "lucide-react";
import { useCart } from "../context/CartContext";

type NavbarProps = {
  onOpenCart: () => void;
};

export default function Navbar({ onOpenCart }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const { totalItems } = useCart();
  const [animateCart, setAnimateCart] = useState(false);

  useEffect(() => {
    if (totalItems === 0) return;
    setAnimateCart(true);
    const timer = setTimeout(() => setAnimateCart(false), 600);
    return () => clearTimeout(timer);
  }, [totalItems]);

  return (
    <header className="sticky top-0 z-50 bg-[#faf6f0]/95 backdrop-blur-md border-b border-stone-200/50 shadow-sm text-stone-800 font-sans-montserrat">
      <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">

        {/* ── Logo ── */}
        <a
          href="/"
          className="flex items-center gap-2 transition-opacity duration-300 hover:opacity-85 active:scale-95"
        >
          {/* Mini casa SVG */}
          <svg width="22" height="20" viewBox="0 0 72 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M28 22 Q26 15 28 8 Q30 1 28 0" stroke="#e8c87a" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9"/>
            <path d="M36 24 Q34 16 36 8 Q38 0 36 0" stroke="#e8c87a" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
            <path d="M44 22 Q42 15 44 8 Q46 1 44 0" stroke="#e8c87a" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9"/>
            <path d="M6 42 L36 20 L66 42" stroke="#e25c24" strokeWidth="5" strokeLinejoin="round" fill="none" strokeLinecap="round"/>
            <rect x="15" y="40" width="42" height="24" rx="2" fill="none" stroke="#e25c24" strokeWidth="3"/>
            <rect x="27" y="46" width="18" height="13" rx="1.5" fill="none" stroke="#e8c87a" strokeWidth="2.5"/>
            <line x1="36" y1="46" x2="36" y2="59" stroke="#e8c87a" strokeWidth="2"/>
            <line x1="27" y1="52" x2="45" y2="52" stroke="#e8c87a" strokeWidth="2"/>
          </svg>

          {/* Nome */}
          <span className="flex items-baseline leading-none">
            <span
              className="text-stone-900 font-black"
              style={{ fontSize: "1.25rem", fontFamily: "'Montserrat', sans-serif", letterSpacing: "-0.02em" }}
            >
              Chef Nair
            </span>
          </span>
        </a>

        {/* ── Desktop nav ── */}
        <nav className="hidden md:flex items-center gap-10">
          {[
            { href: "#sobre", label: "Sobre Nós" },
            { href: "#cardapio", label: "Cardápio" },
            { href: "#contato", label: "Contato" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500 hover:text-stone-900 relative py-2 transition-colors duration-300
                         after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-[1px] after:w-0
                         hover:after:w-full after:bg-[#e25c24] after:transition-all after:duration-300"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* ── Cart + mobile toggle ── */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="cart-button-desktop"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenCart(); }}
            className={`relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-stone-200/50 text-stone-500 hover:text-stone-900 cursor-pointer transition-all duration-300 ${animateCart ? "animate-cart-pop" : ""}`}
          >
            <ShoppingCart size={19} />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#e25c24] text-white text-[9px] font-black w-[18px] h-[18px] rounded-full flex items-center justify-center border border-[#faf6f0] shadow-md">
                {totalItems}
              </span>
            )}
          </button>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-stone-550 hover:text-stone-900 transition-colors duration-300"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-stone-200/50 bg-[#faf6f0] ${
          open ? "max-h-64 opacity-100 py-4" : "max-h-0 opacity-0 py-0"
        }`}
      >
        <nav className="flex flex-col px-6 gap-5">
          {[
            { href: "#sobre", label: "Sobre Nós" },
            { href: "#cardapio", label: "Cardápio" },
            { href: "#contato", label: "Contato" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-stone-500 text-[11px] font-bold uppercase tracking-[0.18em] hover:text-stone-900 py-1 transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}

          <button
            type="button"
            id="cart-button-mobile"
            onClick={() => { onOpenCart(); setOpen(false); }}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-700 font-bold hover:bg-stone-200 transition-all duration-200 text-[11px] tracking-wider"
          >
            <ShoppingCart size={15} />
            {totalItems} item(ns) no carrinho
          </button>
        </nav>
      </div>
    </header>
  );
}