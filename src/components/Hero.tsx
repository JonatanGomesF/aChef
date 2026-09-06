import { UtensilsCrossed, Leaf, Motorbike, Sparkles, MessageCircle, Heart } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import logoImg from "../assets/logo.png";

export default function Hero() {
  const { settings } = useTheme();

  const scrollToMenu = () => {
    const section = document.getElementById("cardapio");
    if (section) section.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative w-full bg-white select-none overflow-hidden font-sans-montserrat">
      {/* Linha de topo tropical */}
      <div
        className="w-full h-[3px]"
        style={{
          background: "linear-gradient(to right, #00A8E8, #FF7A00, #FFB703, #FF7A00, #00A8E8)",
        }}
      />

      {/* ── BANNER TELA INTEIRA (ESQUERDA À DIREITA - FUNDO BRANCO) ── */}
      <div className="relative w-full bg-white flex items-center justify-center overflow-hidden">
        {/* Imagem em tela inteira sem bordas ou caixas */}
        <div className="w-full relative flex items-center justify-center bg-white">
          <img
            src={logoImg}
            alt={settings.heroTitle}
            className="w-full h-auto max-h-[55vh] sm:max-h-[65vh] md:max-h-[75vh] lg:max-h-[82vh] object-contain sm:object-cover md:object-contain object-center transition-all duration-300"
            style={{
              maxHeight: "clamp(300px, 75vh, 850px)",
            }}
          />
        </div>
      </div>

      {/* ── SEÇÃO DE AÇÃO & APRESENTAÇÃO (DESKTOP & MOBILE) ── */}
      <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 pb-12 pt-2 text-center flex flex-col items-center">
        
        {/* Tagline */}
        <p className="text-sm sm:text-base md:text-lg leading-relaxed mb-6 font-semibold max-w-2xl text-slate-700 whitespace-pre-line">
          {settings.heroTagline}
        </p>

        {/* Botões de Ação (CTAs) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto mb-10">
          <button
            onClick={scrollToMenu}
            className="group relative w-full sm:w-auto px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF9E00] hover:from-[#E05A00] hover:to-[#FF7A00] text-white font-black text-xs sm:text-sm tracking-[0.2em] uppercase rounded-full shadow-lg shadow-orange-600/30 hover:shadow-orange-600/50 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer overflow-hidden"
          >
            <span className="relative z-10">{settings.heroButtonText}</span>
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>

          <a
            href={settings.heroWhatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 sm:px-12 py-3.5 sm:py-4 bg-white hover:bg-slate-50 text-[#0C2340] hover:text-[#FF7A00] font-black text-xs sm:text-sm tracking-[0.18em] uppercase rounded-full border-2 border-orange-500/30 hover:border-orange-500 transition-all duration-300 hover:scale-105 shadow-md cursor-pointer"
          >
            <MessageCircle size={18} className="text-green-600" />
            {settings.heroButtonWhatsappText}
          </a>
        </div>

        {/* Selos de Qualidade */}
        <div className="w-full max-w-3xl border-t border-orange-100 pt-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {([
              { Icon: UtensilsCrossed, label: "Feito na hora", sub: "Chapa & Sabor Quente" },
              { Icon: Leaf, label: "100% Fresco", sub: "Ingredientes do dia" },
              { Icon: Motorbike, label: "Entrega Rápida", sub: "Quentinho até Você" },
            ] as const).map(({ Icon, label, sub }, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 p-2.5 sm:p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 shadow-xs hover:border-orange-200 transition-colors"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-white border border-orange-200/60 text-[#FF7A00] shadow-xs">
                  <Icon size={18} />
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-[#0C2340] leading-tight text-center">
                  {label}
                </p>
                <p className="text-[9px] font-semibold text-slate-400 hidden sm:block">
                  {sub}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Linha divisória inferior */}
      <div
        className="w-full h-[2px]"
        style={{
          background: "linear-gradient(to right, #FF7A00, #00A8E8, #FF7A00)",
        }}
      />
    </section>
  );
}