import { useState, useEffect } from "react";
import { Menu, X, ShoppingCart } from "lucide-react";
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
      <div className="max-w-6xl mx-auto px-6 h-[64px] flex items-center justify-between">

        {/* ── Logo ── */}
        <a
          href="/"
          className="flex items-center gap-2.5 transition-all duration-300 hover:opacity-90 active:scale-95 group"
        >
          <img
            src={logoImg}
            alt={settings.heroTitle}
            className="w-10 h-10 object-contain rounded-full shadow-sm border border-orange-500/20 bg-white"
          />

          {/* Nome e Slogan */}
          <span className="flex flex-col leading-tight">
            <span
              className="font-black text-base sm:text-lg"
              style={{
                fontFamily: "var(--font-family)",
                color: "var(--title-color)",
                letterSpacing: "-0.02em",
              }}
            >
              {settings.heroTitle.includes("&") ? (
                <>
                  <span>{settings.heroTitle.split("&")[0].trim()}</span>{" "}
                  <span style={{ color: "var(--primary-color)" }}>&</span>{" "}
                  <span>{settings.heroTitle.split("&").slice(1).join("&").trim()}</span>
                </>
              ) : (
                settings.heroTitle
              )}
            </span>
            <span
              className="text-[8px] sm:text-[9px] font-extrabold tracking-[0.18em] uppercase -mt-0.5"
              style={{ color: "var(--primary-color)" }}
            >
              {settings.heroBadge || "O SABOR QUE VOCÊ VOLTA"}
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
            { href: "#sobre", label: "Sobre Nós" },
            { href: "#cardapio", label: "Cardápio" },
            { href: "#contato", label: "Contato" },
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