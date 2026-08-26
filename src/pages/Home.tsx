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
import { Phone, Clock, MapPin } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

// Local Yakisoba Assets for the About Us Row
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
  
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);
  const [catalog, setCatalog] = useState(() => getMenuCatalog());
  const [availability, setAvailability] = useState(() => getProductAvailability());

  const [modalOpen, setModalOpen] =
    useState(false);

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

    // Limpar o número do WhatsApp recebido para retirar formatação externa
    const phoneClean = settings.contactPhone.replace(/[^0-9]/g, "");
    const phoneWhatsApp = phoneClean.startsWith("55") ? phoneClean : "55" + phoneClean;

    const msg = `*Mensagem de Contato - ${settings.heroTitle}*\n\n*Nome:* ${name}\n*E-mail:* ${email}\n*Mensagem:* ${message}`;
    window.open(`https://wa.me/${phoneWhatsApp}?text=${encodeURIComponent(msg)}`, "_blank");
    
    setName("");
    setEmail("");
    setMessage("");
  };

  // Fotos circulares dos yakisobas na seção Sobre Nós
  const localAboutImages = [frangoImg, carneImg, camaraoImg, mistoImg, vegImg];
  const yakiRow = localAboutImages.map((localImg, idx) => {
    return (settings.aboutImages && settings.aboutImages[idx]) || localImg;
  });

  return (
    <div className="min-h-screen bg-gray-50/30 text-gray-800 font-sans-montserrat">
      
      {/* Hero section */}
      <section id="inicio">
        <Hero />
        <PromotionBanner />
      </section>

      {/* Seção "Sobre Nós" (Fundo Branco) */}
      <section
        id="sobre"
        className="bg-white py-20 border-b border-gray-100"
      >
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <h2 className="font-serif-display text-4xl italic text-primary font-semibold">
            {settings.aboutTitle}
          </h2>

          {/* Separador */}
          <div className="w-12 h-[2px] bg-primary mx-auto mt-2" />

          <p className="mt-4 text-xs md:text-sm text-gray-500 italic max-w-2xl mx-auto leading-relaxed">
            {settings.aboutText}
          </p>

          {/* Badges de destaque */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-10 py-6 max-w-3xl mx-auto">
            <div className="text-center sm:text-right flex-1">
              <h4 className="text-xs font-black text-primary tracking-widest uppercase">{settings.aboutLeftTitle}</h4>
              <p className="text-[11px] text-gray-400 mt-1">{settings.aboutLeftDesc}</p>
            </div>
            
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-600/20 flex-shrink-0">
              <MapPin size={22} className="stroke-[2.5]" />
            </div>

            <div className="text-center sm:text-left flex-1">
              <h4 className="text-xs font-black text-primary tracking-widest uppercase">{settings.aboutRightTitle}</h4>
              <p className="text-[11px] text-gray-400 mt-1">{settings.aboutRightDesc}</p>
            </div>
          </div>

          {/* Row de 5 fotos circulares dos yakisobas */}
          <div className="flex flex-wrap justify-center items-center gap-5 mt-10 select-none pointer-events-none max-w-4xl mx-auto">
            {yakiRow.map((img, i) => (
              <div key={i} className="w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden hover:scale-108 transition-transform duration-300 shadow-lg border border-gray-100/50 bg-gray-50">
                <img src={img} alt="Prato Chef Nair" className="w-full h-full object-cover" />
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
        <div className="text-center mb-14 space-y-2">
          <span className="text-[10px] font-black text-primary tracking-[0.25em] uppercase bg-orange-50 border border-orange-100/30 px-3 py-1 rounded-full">
            Cardápio
          </span>

          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-tight">
            Escolha seu Yakisoba
          </h2>

          <p className="text-gray-400 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
            Nossos pratos acompanham ingredientes selecionados na chapa e o molho especial clássico da casa.
          </p>
        </div>

        <div className="space-y-12">
          {catalog.categories.map((category) => {
            const categoryProducts = availableProducts.filter((product) => product.categoryId === category.id);
            if (categoryProducts.length === 0) return null;

            return (
              <div key={category.id} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{category.name}</h3>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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

      {/* Seção: "MELHOR YAKISOBA DA CIDADE" (Fundo Escuro com Parallax) */}
      <section
        className="relative overflow-hidden text-center min-h-[40vh] flex items-center"
        style={{ backgroundColor: "var(--dark-bg-color)" }}
      >
        {/* Background image com overlay escuro */}
        <img 
          src={settings.middleBgImage || heroBg} 
          alt="Yakisoba Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-35 select-none pointer-events-none scale-105"
        />
        <div
          className="absolute inset-0 z-0 backdrop-blur-xs"
          style={{ backgroundColor: "color-mix(in srgb, var(--dark-bg-color) 80%, transparent)" }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 space-y-6">
          <h2 className="text-xl md:text-3xl font-extrabold tracking-[0.2em] text-white leading-relaxed uppercase">
            {settings.middleTitle}
          </h2>
          
          <p className="text-stone-300 text-xs font-semibold tracking-wider max-w-2xl mx-auto italic leading-relaxed">
            {settings.middleSubtitle}
          </p>

          <div className="pt-4">
            <button 
              onClick={scrollToMenu}
              className="px-8 py-3.5 border border-white hover:border-primary hover:bg-primary hover:text-white transition-all duration-300 text-xs tracking-[0.2em] font-bold text-white uppercase cursor-pointer"
            >
              {settings.middleButtonText}
            </button>
          </div>
        </div>
      </section>

      {/* Seção: "CONTATO" (Gradiente Dinâmico da Paleta de Cores) */}
      <section
        id="contato"
        className="text-white py-20 border-b border-black/10"
        style={{
          background: "linear-gradient(to right, var(--primary-hover), var(--primary-color))",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          
          {/* Coluna Esquerda: Informações de Contato */}
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-extrabold uppercase tracking-[0.1em]">{settings.contactTitle}</h2>
              <p className="text-xs text-white/70 italic font-semibold mt-1.5">{settings.contactSubtitle}</p>
            </div>

            <div className="space-y-4 text-xs font-semibold tracking-wider text-white/90">
              <div className="flex items-start gap-3">
                <Phone size={18} className="text-white mt-0.5 flex-shrink-0" />
                <p>{settings.contactPhone}</p>
              </div>

              <div className="flex items-start gap-3">
                <Clock size={18} className="text-white mt-0.5 flex-shrink-0" />
                <div>
                  {settings.contactHours.split("\n").map((line, idx) => (
                    <p key={idx} className={idx > 0 ? "mt-1" : ""}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Formulário de Contato */}
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white tracking-wider uppercase">Seu Nome</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-white/20 hover:border-white/40 focus:border-white bg-white/5 rounded-lg p-3 text-xs outline-none text-white transition-all duration-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white tracking-wider uppercase">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-white/20 hover:border-white/40 focus:border-white bg-white/5 rounded-lg p-3 text-xs outline-none text-white transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white tracking-wider uppercase">Mensagem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="w-full border border-white/20 hover:border-white/40 focus:border-white bg-white/5 rounded-lg p-3 text-xs outline-none text-white transition-all duration-300 resize-none"
              />
            </div>

            <button
              type="submit"
              className="px-8 py-3 bg-white font-black text-xs tracking-widest uppercase rounded hover:bg-black/10 hover:text-white hover:scale-102 transition-all duration-300 shadow-md cursor-pointer"
              style={{ color: "var(--primary-hover)" }}
            >
              ENVIAR
            </button>
          </form>
        </div>
      </section>

      {/* Rodapé */}
      <footer
        className="text-stone-400 py-10"
        style={{ backgroundColor: "var(--dark-bg-color)" }}
      >
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          
          <div className="flex items-center gap-1 font-bold text-xs tracking-[0.2em] text-white">
            <span>{settings.heroTitle.toUpperCase()}</span>
            <span className="flex items-center text-white">
              DELIVERY
              <span className="relative inline-flex items-center justify-center w-4.5 h-4.5 bg-primary rounded-full mx-0.5">
                <span className="text-[8px] text-white">🔥</span>
              </span>
            </span>
          </div>

          <p className="text-[9px] font-bold tracking-widest uppercase text-stone-500">
            {settings.footerCopy}
          </p>

          {/* Scroll to Top */}
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-8 h-8 rounded-full border border-stone-850 hover:border-primary hover:text-primary flex items-center justify-center text-stone-500 transition-colors duration-300 cursor-pointer text-xs"
          >
            ▲
          </button>
        </div>
      </footer>
    </div>
  );
}
