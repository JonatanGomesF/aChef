import { UtensilsCrossed, Leaf, Bike } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function Hero() {
  const { settings } = useTheme();

  const scrollToMenu = () => {
    const section = document.getElementById("cardapio");
    if (section) section.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className="relative overflow-hidden font-sans-montserrat select-none"
      style={{
        minHeight: "100svh",
        backgroundColor: "var(--bg-color)",
        backgroundImage: settings.heroBgImage ? `url(${settings.heroBgImage})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* ── Overlay caso exista imagem de fundo customizada ── */}
      {settings.heroBgImage && (
        <div className="absolute inset-0 bg-black/40 z-[1] pointer-events-none" />
      )}

      {/* ── Linha topo ── */}
      <div
        className="absolute top-0 left-0 w-full h-[2px] z-20"
        style={{
          background: "linear-gradient(to right, transparent, var(--primary-color), transparent)",
        }}
      />

      {/* ── Fundo: gradiente radial vivo ── */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 55% at 50% 65%, color-mix(in srgb, var(--primary-color) 8%, transparent) 0%, transparent 70%)",
        }}
      />
      {/* Vignette escura nas bordas */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `radial-gradient(ellipse 100% 100% at 50% 50%, transparent 60%, color-mix(in srgb, var(--bg-color) 50%, transparent) 100%)`,
        }}
      />
      {/* Textura de ruído sutil */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* ── Kanji decorativos (ocultos se houver imagem customizada para não quebrar o layout visual) ── */}
      {!settings.heroBgImage && (
        <>
          <div
            className="absolute left-6 top-1/2 -translate-y-1/2 font-black pointer-events-none hidden xl:block z-0"
            style={{
              fontSize: "7rem",
              writingMode: "vertical-rl",
              lineHeight: 1,
              letterSpacing: "0.1em",
              color: "color-mix(in srgb, var(--primary-color) 4%, transparent)",
            }}
          >
            焼きそば
          </div>
          <div
            className="absolute right-6 top-1/2 -translate-y-1/2 font-black pointer-events-none hidden xl:block z-0"
            style={{
              fontSize: "7rem",
              writingMode: "vertical-rl",
              lineHeight: 1,
              letterSpacing: "0.1em",
              color: "color-mix(in srgb, var(--primary-color) 4%, transparent)",
            }}
          >
            家の味
          </div>
        </>
      )}

      {/* ── Conteúdo principal ── */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center px-6"
        style={{ minHeight: "100svh", paddingTop: "88px", paddingBottom: "28px" }}
      >
        {/* Badge topo */}
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 backdrop-blur-sm border"
          style={{
            backgroundColor: "color-mix(in srgb, var(--primary-color) 5%, transparent)",
            borderColor: "color-mix(in srgb, var(--primary-color) 20%, transparent)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span
            className="text-[10px] font-bold tracking-[0.35em] uppercase"
            style={{ color: settings.heroBgImage ? "var(--light-text-color)" : "color-mix(in srgb, var(--title-color) 80%, transparent)" }}
          >
            {settings.heroBadge}
          </span>
        </div>

        {/* Tagline */}
        <p
          className="text-[16px] md:text-[18px] leading-snug mb-3 italic"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: settings.heroBgImage ? "var(--light-text-color)" : "var(--body-text-color)",
          }}
        >
          {settings.heroTagline}
        </p>

        {/* Nome da marca */}
        <div className="relative mb-2">
          {/* Glow atrás do nome */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-full"
              style={{
                width: "500px",
                height: "80px",
                background: "color-mix(in srgb, var(--primary-color) 8%, transparent)",
                filter: "blur(60px)",
              }}
            />
          </div>
          <h1
            className="relative font-black leading-none tracking-tight flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4"
            style={{ fontSize: "clamp(3rem, 9vw, 5.5rem)" }}
          >
            <span
              style={{
                color: settings.heroBgImage ? "var(--light-text-color)" : "var(--title-color)",
                textShadow: "0 4px 40px rgba(0,0,0,0.08)",
              }}
            >
              {settings.heroTitle}
            </span>
          </h1>
        </div>

        {/* Separador */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="h-px w-16"
            style={{
              background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--primary-color) 50%, transparent))",
            }}
          />
          <span
            className="text-[9px] font-black tracking-[0.2em] uppercase"
            style={{
              color: settings.heroBgImage ? "var(--light-text-color)" : "color-mix(in srgb, var(--primary-color) 85%, transparent)",
            }}
          >
            {settings.heroBadge}
          </span>
          <div
            className="h-px w-16"
            style={{
              background: "linear-gradient(to left, transparent, color-mix(in srgb, var(--primary-color) 50%, transparent))",
            }}
          />
        </div>

        {/* ── CTAs ── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-10">
          <button
            onClick={scrollToMenu}
            className="group relative px-10 py-3.5 bg-primary hover:bg-primary-hover text-white font-black text-[11px] tracking-[0.3em] uppercase rounded-full shadow-lg shadow-orange-950/15 hover:shadow-orange-950/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer overflow-hidden"
          >
            <span className="relative z-10">{settings.heroButtonText}</span>
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>

          <a
            href={settings.heroWhatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-10 py-3.5 border font-bold text-[11px] tracking-[0.25em] uppercase rounded-full transition-all duration-300 hover:scale-105 backdrop-blur-sm cursor-pointer"
            style={{
              color: settings.heroBgImage ? "var(--light-text-color)" : "var(--title-color)",
              borderColor: settings.heroBgImage ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
            }}
          >
            <Bike size={14} />
            {settings.heroButtonWhatsappText}
          </a>
        </div>

        {/* ── Diferenciais ── */}
        <div
          className="w-full max-w-xl border-t pt-7"
          style={{
            borderColor: settings.heroBgImage ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
          }}
        >
          <div className="grid grid-cols-3 gap-4">
            {([
              { Icon: UtensilsCrossed, label: "Feito na hora", sub: "Chapa quente" },
              { Icon: Leaf, label: "100% Fresco", sub: "Ingredientes do dia" },
              { Icon: Bike, label: "Entrega rápida", sub: "Quentinho até você" },
            ] as const).map(({ Icon, label, sub }, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--primary-color) 5%, transparent)",
                    borderColor: "color-mix(in srgb, var(--primary-color) 20%, transparent)",
                  }}
                >
                  <Icon size={18} className="text-primary" />
                </div>
                <p
                  className="text-[10px] font-black uppercase tracking-wide leading-none"
                  style={{ color: settings.heroBgImage ? "var(--light-text-color)" : "var(--title-color)" }}
                >
                  {label}
                </p>
                <p
                  className="text-[9px] font-semibold"
                  style={{ color: settings.heroBgImage ? "rgba(255,255,255,0.5)" : "color-mix(in srgb, var(--title-color) 50%, transparent)" }}
                >
                  {sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Linha vermelha rodapé ── */}
      <div
        className="absolute bottom-0 left-0 w-full h-[2px] z-20"
        style={{
          background: "linear-gradient(to right, var(--primary-color), var(--primary-hover), var(--primary-color))",
        }}
      />
    </section>
  );
}