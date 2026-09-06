import Hero from "../components/Hero";
import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import PromotionBanner from "../components/PromotionBanner";
import ProductModal from "../components/ProductModal";
import { useCart } from "../context/CartContext";
import { usePromotions } from "../hooks/usePromotions";
import {
  fetchProductAvailability,
  getProductAvailability,
  PRODUCT_AVAILABILITY_EVENT,
  subscribeProductAvailability,
} from "../lib/productAvailability";
import { getMenuCatalog } from "../lib/menuCatalog";
import type { Product } from "../data/products";
import { Phone, Clock, MapPin, Sparkles, MessageCircle, ChevronUp, ShieldCheck, Heart, Utensils } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import logoImg from "../assets/logo.png";

// Assets locais
import frangoImg from "../assets/yaki-frango.png";
import carneImg from "../assets/yaki-carne.png";
import camaraoImg from "../assets/yaki-camarao.png";
import mistoImg from "../assets/yaki-misto.png";
import vegImg from "../assets/yaki-veg.png";
import heroBg from "../assets/hero.png";

export default function Home() {
  const { addToCart } = useCart();
  const promotions = usePromotions();
  const { settings } = useTheme();
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [catalog, setCatalog] = useState(() => getMenuCatalog());
  const [availability, setAvailability] = useState(() => getProductAvailability());
  const [modalOpen, setModalOpen] = useState(false);

  const availableProducts = catalog.products.map((product) => ({
    ...product,
    available: availability[product.id] !== false,
  }));

  useEffect(() => {
    const updateCatalog = () => setCatalog(getMenuCatalog());
    const updateAvailability = () => setAvailability(getProductAvailability());
    const unsubscribeAvailability = subscribeProductAvailability(updateAvailability);

    fetchProductAvailability().then(setAvailability);

    window.addEventListener("storage", updateCatalog);
    window.addEventListener("storage", updateAvailability);
    window.addEventListener("yakinhome-menu-catalog-updated", updateCatalog);
    window.addEventListener(PRODUCT_AVAILABILITY_EVENT, updateAvailability);

    return () => {
      window.removeEventListener("storage", updateCatalog);
      window.removeEventListener("storage", updateAvailability);
      window.removeEventListener("yakinhome-menu-catalog-updated", updateCatalog);
      window.removeEventListener(PRODUCT_AVAILABILITY_EVENT, updateAvailability);
      unsubscribeAvailability();
    };
  }, []);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const scrollToMenu = () => {
    const section = document.getElementById("cardapio");
    if (section) {
      section.scrollIntoView({
        behavior: "smooth",
      });
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      alert("Por favor, preencha todos os campos do formulário.");
      return;
    }

    const phoneClean = settings.contactPhone.replace(/[^0-9]/g, "");
    const phoneWhatsApp = phoneClean.startsWith("55") ? phoneClean : "55" + phoneClean;

    const msg = `*Mensagem de Contato - ${settings.heroTitle}*\n\n*Nome:* ${name}\n*E-mail:* ${email}\n*Mensagem:* ${message}`;
    window.open(`https://wa.me/${phoneWhatsApp}?text=${encodeURIComponent(msg)}`, "_blank");
    
    setName("");
    setEmail("");
    setMessage("");
  };

  const localAboutImages = [frangoImg, carneImg, camaraoImg, mistoImg, vegImg];
  const yakiRow = localAboutImages.map((localImg, idx) => {
    return (settings.aboutImages && settings.aboutImages[idx]) || localImg;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans-montserrat">
      
      {/* Hero section */}
      <section id="inicio">
        <Hero />
        <PromotionBanner />
      </section>

      {/* Seção "Sobre Nós" */}
      <section
        id="sobre"
        className="bg-white py-20 border-b border-slate-100 relative overflow-hidden"
      >
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200/80 shadow-xs">
            <Sparkles size={14} className="text-[#FF7A00]" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FF7A00]">
              Nossa História
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-[#0C2340] tracking-tight">
            {settings.aboutTitle}
          </h2>

          {/* Separador */}
          <div className="w-16 h-1 bg-gradient-to-r from-[#00A8E8] via-[#FF7A00] to-[#FFB703] rounded-full mx-auto" />

          <p className="mt-4 text-sm md:text-base text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
            {settings.aboutText}
          </p>

          {/* Badges de destaque */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-8 max-w-3xl mx-auto">
            <div className="text-center sm:text-right flex-1 p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-xs">
              <h4 className="text-xs font-black text-[#FF7A00] tracking-widest uppercase">{settings.aboutLeftTitle}</h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">{settings.aboutLeftDesc}</p>
            </div>
            
            <div className="w-14 h-14 bg-gradient-to-br from-[#FF7A00] to-[#FF9E00] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30 flex-shrink-0">
              <Utensils size={24} className="stroke-[2.5]" />
            </div>

            <div className="text-center sm:text-left flex-1 p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-xs">
              <h4 className="text-xs font-black text-[#00A8E8] tracking-widest uppercase">{settings.aboutRightTitle}</h4>
              <p className="text-xs text-slate-500 mt-1 font-medium">{settings.aboutRightDesc}</p>
            </div>
          </div>

          {/* Fotos circulares dos pratos */}
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mt-10 select-none max-w-4xl mx-auto">
            {yakiRow.map((img, i) => (
              <div key={i} className="w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden hover:scale-110 transition-transform duration-300 shadow-lg border-2 border-orange-200 bg-white p-1">
                <img src={img} alt="Prato Sabor da Praia" className="w-full h-full object-cover rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Menu/Cardápio */}
      <section
        id="cardapio"
        className="max-w-6xl mx-auto px-6 py-20"
      >
        <div className="text-center mb-16 space-y-3">
          <span className="text-[11px] font-black text-[#FF7A00] tracking-[0.25em] uppercase bg-orange-100/70 border border-orange-300 px-4 py-1.5 rounded-full inline-block shadow-xs">
            Sabores Selecionados
          </span>

          <h2 className="text-3xl md:text-5xl font-black text-[#0C2340] tracking-tight">
            Cardápio Especial
          </h2>

          <p className="text-slate-600 text-sm md:text-base max-w-lg mx-auto font-medium leading-relaxed">
            Pratos preparados na hora, porções generosas e o tempero artesanal do Sabor da Praia.
          </p>
        </div>

        <div className="space-y-14">
          {catalog.categories.map((category) => {
            const categoryProducts = availableProducts.filter((product) => product.categoryId === category.id);
            if (categoryProducts.length === 0) return null;

            return (
              <div key={category.id} className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#FF7A00]" />
                  <h3 className="text-xl md:text-2xl font-black text-[#0C2340] tracking-tight">{category.name}</h3>
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-orange-200 to-transparent" />
                </div>

                <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {categoryProducts.map((product) => {
                    const promotion = promotions.find(
                      (p) => p.product_id === product.id && p.active
                    );

                    return (
                      <ProductCard
                        key={product.id}
                        product={{
                          ...product,
                          promotionActive: !!promotion,
                          promotionalPrice: promotion
                            ? product.price - promotion.discount
                            : undefined,
                        }}
                        onAddToCart={addToCart}
                        onOpenProduct={(product) => {
                          setSelectedProduct(product);
                          setModalOpen(true);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <ProductModal
        open={modalOpen}
        product={selectedProduct}
        onClose={() => {
          setModalOpen(false);
          setSelectedProduct(null);
        }}
        onAddToCart={addToCart}
      />

      {/* Seção: Banner Meio (Fundo Ocean Navy com Parallax) */}
      <section
        className="relative overflow-hidden text-center min-h-[44vh] flex items-center bg-[#0B192C]"
      >
        <img 
          src={settings.middleBgImage || heroBg} 
          alt="Sabor da Praia Banner" 
          className="absolute inset-0 w-full h-full object-cover opacity-25 select-none pointer-events-none scale-105"
        />
        <div
          className="absolute inset-0 z-0 bg-gradient-to-t from-[#0B192C] via-[#0B192C]/80 to-[#0B192C]"
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
            <ShieldCheck size={16} className="text-[#FFB703]" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FFB703]">
              Qualidade Garantida
            </span>
          </div>

          <h2 className="text-2xl md:text-4xl font-black tracking-wide text-white leading-snug uppercase drop-shadow-md">
            {settings.middleTitle}
          </h2>
          
          <p className="text-slate-200 text-sm md:text-base font-medium tracking-wide max-w-2xl mx-auto leading-relaxed drop-shadow-xs">
            {settings.middleSubtitle}
          </p>

          <div className="pt-4">
            <button 
              onClick={scrollToMenu}
              className="px-10 py-4 bg-gradient-to-r from-[#FF7A00] to-[#FF9E00] hover:from-[#E05A00] hover:to-[#FF7A00] text-white font-black text-xs md:text-sm tracking-[0.25em] uppercase rounded-full shadow-xl shadow-orange-950/40 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              {settings.middleButtonText}
            </button>
          </div>
        </div>
      </section>

      {/* Seção: "CONTATO" */}
      <section
        id="contato"
        className="text-white py-20 border-b border-black/10 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #FF7A00 0%, #E85D04 50%, #C44900 100%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-start relative z-10">
          
          {/* Coluna Esquerda: Informações de Contato */}
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-black tracking-[0.25em] uppercase bg-white/20 px-3.5 py-1 rounded-full text-white inline-block mb-3">
                Fale Conosco
              </span>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">{settings.contactTitle}</h2>
              <p className="text-sm text-white/90 font-medium mt-2">{settings.contactSubtitle}</p>
            </div>

            <div className="space-y-4 text-sm font-semibold tracking-wide text-white">
              <div className="flex items-start gap-3.5 bg-black/10 p-3.5 rounded-xl backdrop-blur-xs">
                <Phone size={20} className="text-white mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/70 uppercase tracking-widest font-black">Telefone / WhatsApp</p>
                  <p className="text-base font-bold">{settings.contactPhone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 bg-black/10 p-3.5 rounded-xl backdrop-blur-xs">
                <Clock size={20} className="text-white mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-white/70 uppercase tracking-widest font-black">Horário de Atendimento</p>
                  {settings.contactHours.split("\n").map((line, idx) => (
                    <p key={idx} className="text-xs font-semibold">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Formulário de Contato */}
          <form onSubmit={handleContactSubmit} className="space-y-4 bg-black/20 p-6 sm:p-8 rounded-3xl backdrop-blur-md border border-white/20 shadow-2xl">
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Envie uma Mensagem</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white tracking-wider uppercase">Seu Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="w-full border border-white/30 focus:border-white focus:bg-white/15 bg-white/10 rounded-xl p-3 text-sm outline-none text-white placeholder:text-white/40 transition-all duration-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white tracking-wider uppercase">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@email.com"
                  className="w-full border border-white/30 focus:border-white focus:bg-white/15 bg-white/10 rounded-xl p-3 text-sm outline-none text-white placeholder:text-white/40 transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white tracking-wider uppercase">Mensagem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Como podemos te ajudar?"
                rows={3}
                className="w-full border border-white/30 focus:border-white focus:bg-white/15 bg-white/10 rounded-xl p-3 text-sm outline-none text-white placeholder:text-white/40 transition-all duration-300 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-white hover:bg-slate-100 text-[#E05A00] font-black text-xs sm:text-sm tracking-widest uppercase rounded-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-lg cursor-pointer"
            >
              ENVIAR NO WHATSAPP
            </button>
          </form>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          RODAPÉ PREMIUM & ALTO CONTRASTE (Sabor da Praia)
         ═══════════════════════════════════════════════════════════════ */}
      <footer className="bg-[#0B192C] text-white pt-16 pb-10 border-t-4 border-[#FF7A00]">
        <div className="max-w-6xl mx-auto px-6">
          
          {/* Grid Principal de 4 Colunas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/15">
            
            {/* Coluna 1: Marca & Logo */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white p-1 shadow-lg border-2 border-orange-500/50 flex items-center justify-center">
                  <img src={logoImg} alt="Sabor da Praia" className="w-full h-full object-contain rounded-xl" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-white tracking-tight leading-none">
                    Sabor <span className="text-[#FF7A00]">da Praia</span>
                  </h3>
                  <p className="text-[10px] font-black text-[#FFB703] tracking-[0.15em] uppercase mt-1">
                    DELIVERY & RETIRADA
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                O sabor autêntico do litoral na sua mesa! Ingredientes selecionados, porções caprichadas e atendimento nota 10.
              </p>

              <div className="flex items-center gap-2 text-xs font-bold text-[#FFB703] bg-white/5 py-1.5 px-3 rounded-lg border border-white/10 w-fit">
                <Heart size={14} className="text-red-400 fill-red-400" />
                Feito com carinho e qualidade
              </div>
            </div>

            {/* Coluna 2: Links Rápidos */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-white uppercase tracking-wider border-l-2 border-[#FF7A00] pl-2.5">
                Navegação
              </h4>
              <ul className="space-y-2 text-xs font-semibold text-slate-300">
                <li>
                  <a href="#inicio" className="hover:text-[#FF7A00] hover:translate-x-1 transition-all inline-block">
                    › Início
                  </a>
                </li>
                <li>
                  <a href="#sobre" className="hover:text-[#FF7A00] hover:translate-x-1 transition-all inline-block">
                    › Sobre Nós
                  </a>
                </li>
                <li>
                  <a href="#cardapio" className="hover:text-[#FF7A00] hover:translate-x-1 transition-all inline-block">
                    › Cardápio Especial
                  </a>
                </li>
                <li>
                  <a href="#contato" className="hover:text-[#FF7A00] hover:translate-x-1 transition-all inline-block">
                    › Fale Conosco
                  </a>
                </li>
                <li>
                  <a href="/admin/login" className="hover:text-[#00A8E8] text-slate-400 hover:translate-x-1 transition-all inline-block">
                    › Painel Administrativo
                  </a>
                </li>
              </ul>
            </div>

            {/* Coluna 3: Horários de Atendimento */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-white uppercase tracking-wider border-l-2 border-[#FF7A00] pl-2.5">
                Horário de Funcionamento
              </h4>
              
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-[#FFB703] font-black text-[11px] uppercase tracking-wider mb-1">
                    <Clock size={14} /> Terça a Sexta
                  </div>
                  <p className="font-bold text-white text-xs">17h45 às 23h45</p>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 text-[#00A8E8] font-black text-[11px] uppercase tracking-wider mb-1">
                    <Clock size={14} /> Sábado e Domingo
                  </div>
                  <p className="font-bold text-white text-xs">15h00 às 00h00</p>
                </div>
              </div>
            </div>

            {/* Coluna 4: Pedidos & WhatsApp */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-white uppercase tracking-wider border-l-2 border-[#FF7A00] pl-2.5">
                Faça Seu Pedido
              </h4>
              
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Peça direto pelo site ou pelo WhatsApp oficial para entrega rápida em sua casa.
              </p>

              <a
                href={settings.heroWhatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-black text-xs tracking-wider uppercase rounded-xl shadow-lg shadow-green-950/30 hover:scale-102 transition-all duration-200"
              >
                <MessageCircle size={17} />
                Pedir no WhatsApp
              </a>

              <div className="text-center">
                <p className="text-[11px] text-slate-400 font-semibold">{settings.contactPhone}</p>
              </div>
            </div>

          </div>

          {/* Bottom Bar / Copyright */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-1">
              <p className="text-xs font-bold text-white tracking-wider">
                {settings.footerCopy}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold">
                Sabor • Qualidade • Bom Atendimento • Todos os direitos reservados.
              </p>
            </div>

            {/* Botão de Voltar ao Topo */}
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-[#FF7A00] text-white text-xs font-black tracking-wider transition-all duration-300 cursor-pointer border border-white/10 hover:border-transparent hover:scale-105"
            >
              <span>Voltar ao Topo</span>
              <ChevronUp size={16} />
            </button>
          </div>

        </div>
      </footer>
    </div>
  );
}
