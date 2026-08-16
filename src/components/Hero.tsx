import { UtensilsCrossed, Leaf, Bike } from "lucide-react";

export default function Hero() {
  const scrollToMenu = () => {
    const section = document.getElementById("cardapio");
    if (section) section.scrollIntoView({ behavior: "smooth" });
  };



  return (
    <section
      className="relative bg-[#faf6f0] overflow-hidden font-sans-montserrat select-none"
      style={{ minHeight: "100svh" }}
    >
      {/* ── Linha topo ── */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#e25c24] to-transparent z-20" />

      {/* ── Fundo: gradiente radial vivo ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_65%,rgba(226,92,36,0.08)_0%,transparent_70%)]" />
      {/* Vignette escura nas bordas */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_50%,transparent_60%,rgba(250,246,240,0.5)_100%)]" />
      {/* Textura de ruído sutil */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* ── Kanji decorativos ── */}
      <div
        className="absolute left-6 top-1/2 -translate-y-1/2 font-black pointer-events-none hidden xl:block z-0"
        style={{
          fontSize: "7rem",
          writingMode: "vertical-rl",
          lineHeight: 1,
          letterSpacing: "0.1em",
          color: "rgba(226,92,36,0.04)",
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
          color: "rgba(226,92,36,0.04)",
        }}
      >
        家の味
      </div>

      {/* ── Conteúdo principal ── */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center px-6"
        style={{ minHeight: "100svh", paddingTop: "88px", paddingBottom: "28px" }}
      >

        {/* Badge topo */}
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200/50 rounded-full px-4 py-1.5 mb-5 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#e25c24] animate-pulse" />
          <span className="text-orange-850/70 text-[10px] font-bold tracking-[0.35em] uppercase">
            Marmitaria & Yakissobaria
          </span>
        </div>

        {/* Tagline */}
        <p
          className="text-stone-500 text-[16px] md:text-[18px] leading-snug mb-3"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic" }}
        >
          Sabor que você sente,{" "}
          <span className="text-[#e25c24] font-bold">como em casa!</span>
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
                background: "rgba(226,92,36,0.08)",
                filter: "blur(60px)",
              }}
            />
          </div>
          <h1
            className="relative font-black leading-none tracking-tight flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4"
            style={{ fontSize: "clamp(3rem, 9vw, 5.5rem)" }}
          >
            <span className="text-stone-900" style={{ textShadow: "0 4px 40px rgba(0,0,0,0.08)" }}>
              Chef Nair
            </span>
          </h1>
        </div>

        {/* Separador */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#e25c24]/50" />
          <span className="text-[#e25c24]/85 text-[9px] font-black tracking-[0.2em] uppercase">
            Marmitaria & Yakissobaria
          </span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#e25c24]/50" />
        </div>

        {/* ── CTAs ── */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-10">
          <button
            onClick={scrollToMenu}
            className="group relative px-10 py-3.5 bg-[#e25c24] hover:bg-[#c2410c] text-white font-black text-[11px] tracking-[0.3em] uppercase rounded-full shadow-lg shadow-orange-950/15 hover:shadow-orange-950/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer overflow-hidden"
          >
            <span className="relative z-10">Ver Cardápio</span>
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/12 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>

          <a
            href="https://wa.me/553599212311"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-10 py-3.5 border border-stone-200 hover:border-stone-400 text-stone-600 hover:text-stone-900 font-bold text-[11px] tracking-[0.25em] uppercase rounded-full transition-all duration-300 hover:scale-105 backdrop-blur-sm cursor-pointer"
          >
            <Bike size={14} />
            Pedir Agora
          </a>
        </div>

        {/* ── Diferenciais ── */}
        <div className="w-full max-w-xl border-t border-stone-200 pt-7">
          <div className="grid grid-cols-3 gap-4">
            {([
              { Icon: UtensilsCrossed, label: "Feito na hora",  sub: "Chapa quente" },
              { Icon: Leaf,            label: "100% Fresco",    sub: "Ingredientes do dia" },
              { Icon: Bike,            label: "Entrega rápida", sub: "Quentinho até você" },
            ] as const).map(({ Icon, label, sub }, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/50 flex items-center justify-center">
                  <Icon size={18} className="text-[#e25c24]" />
                </div>
                <p className="text-stone-850 text-[10px] font-black uppercase tracking-wide leading-none">{label}</p>
                <p className="text-stone-450 text-[9px] font-semibold">{sub}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Linha vermelha rodapé ── */}
      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#e25c24] via-[#f97316] to-[#e25c24] z-20" />
    </section>
  );
}