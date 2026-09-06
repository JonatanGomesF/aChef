import { useState, useEffect } from "react";
import { Menu, X, ShoppingCart, UtensilsCrossed, Heart } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";
import logoImg from "../assets/logo.png";

type NavbarProps = {
  onOpenCart: () => void;
};

export default function Navbar({ onOpenCart }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const { totalItems } = useCart();
  const [animateCart, setAnimateCart] = useState(false);
  const { settings } = useTheme();

  useEffect(() => {
    if (totalItems === 0) return;
    setAnimateCart(true);
    const timer = setTimeout(() => setAnimateCart(false), 600);
    return () => clearTimeout(timer);
  }, [totalItems]);

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md border-b border-stone-200/50 shadow-sm font-sans-montserrat transition-colors duration-300"
      style={{
        backgroundColor: "color-mix(in srgb, var(--bg-color) 95%, transparent)",
        color: "var(--body-text-color)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between">

        {/* ── Logo ── */}
        <a
          href="/"
          className="flex items-center gap-2.5 sm:gap-3 transition-all duration-300 hover:opacity-90 active:scale-95 group"
        >
          <img
            src={logoImg}
            alt={settings.heroTitle}
            className="w-11 h-11 sm:w-12 sm:h-12 object-contain rounded-xl shadow-sm border border-orange-500/30 bg-white p-0.5 flex-shrink-0"
          />

          {/* Nome e Slogan Pill */}
          <span className="flex flex-col items-start gap-1 leading-none">
            <span
              className="font-black text-base sm:text-lg tracking-tight"
              style={{
                fontFamily: "var(--font-family)",
                color: "var(--title-color)",
              }}
            >
              {settings.heroTitle.toLowerCase().includes("sabor da praia") ? (
                <>
                  <span className="text-[#0C2340]">Sabor</span>{" "}
                  <span className="text-[#FF7A00]">da Praia</span>
                </>
              ) : settings.heroTitle.includes("&") ? (
                <>
                  <span>{settings.heroTitle.split("&")[0].trim()}</span>{" "}
                  <span style={{ color: "var(--primary-color)" }}>&</span>{" "}
                  <span>{settings.heroTitle.split("&").slice(1).join("&").trim()}</span>
                </>
              ) : (
                settings.heroTitle
              )}
            </span>

            {/* Badge Pill idêntica à logo oficial */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0A1A2F] border border-white/10 shadow-xs select-none">
              <UtensilsCrossed size={9} className="text-[#FF7A00] flex-shrink-0" strokeWidth={2.5} />
              <span className="text-[6.5px] sm:text-[7.5px] font-black tracking-[0.12em] uppercase text-white leading-none">
                SABOR
              </span>
              <span className="w-1 h-1 rounded-full bg-[#FF7A00] flex-shrink-0" />
              <span className="text-[6.5px] sm:text-[7.5px] font-black tracking-[0.12em] uppercase text-white leading-none">
                QUALIDADE
              </span>
              <span className="w-1 h-1 rounded-full bg-[#FF7A00] flex-shrink-0" />
              <span className="text-[6.5px] sm:text-[7.5px] font-black tracking-[0.12em] uppercase text-white leading-none">
                BOM ATENDIMENTO
              </span>
              <Heart size={8} className="text-[#FF7A00] fill-[#FF7A00] flex-shrink-0" />
            </span>
          </span>
        </a>

        {/* ── Desktop nav ── */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-10 ml-6">
          {[
            { href: "#cardapio", label: "Cardápio" },
            { href: "#contato", label: "Contato" },
            { href: "#sobre", label: "Sobre Nós" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[11px] font-bold uppercase tracking-[0.18em] relative py-2 transition-colors duration-300
                         after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-[1px] after:w-0
                         hover:after:w-full after:bg-primary after:transition-all after:duration-300"
              style={{ color: "color-mix(in srgb, var(--title-color) 60%, transparent)" }}
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
            className={`relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-stone-200/50 cursor-pointer transition-all duration-300 ${animateCart ? "animate-cart-pop" : ""}`}
            style={{ color: "color-mix(in srgb, var(--title-color) 60%, transparent)" }}
          >
            <ShoppingCart size={19} />
            {totalItems > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[9px] font-black w-[18px] h-[18px] rounded-full flex items-center justify-center border shadow-md"
                style={{ borderColor: "var(--bg-color)" }}
              >
                {totalItems}
              </span>
            )}
          </button>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 hover:opacity-80 transition-colors duration-300"
            style={{ color: "var(--title-color)" }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-stone-200/50"
        style={{
          maxHeight: open ? "16rem" : "0",
          opacity: open ? "1" : "0",
          paddingTop: open ? "1rem" : "0",
          paddingBottom: open ? "1rem" : "0",
          backgroundColor: "var(--bg-color)",
        }}
      >
        <nav className="flex flex-col px-6 gap-5">
          {[
            { href: "#cardapio", label: "Cardápio" },
            { href: "#contato", label: "Contato" },
            { href: "#sobre", label: "Sobre Nós" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-[11px] font-bold uppercase tracking-[0.18em] hover:opacity-80 py-1 transition-all duration-200"
              style={{ color: "color-mix(in srgb, var(--title-color) 60%, transparent)" }}
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