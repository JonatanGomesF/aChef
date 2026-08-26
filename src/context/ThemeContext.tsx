import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export interface ThemeSettings {
  // Cores
  primaryColor: string;
  primaryHover: string;
  bgColor: string;
  darkBgColor: string;
  titleColor: string;
  subtitleColor: string;
  bodyTextColor: string;
  lightTextColor: string;

  // Fontes
  fontFamily: string;

  // Seção Hero
  heroTitle: string;
  heroBadge: string;
  heroTagline: string;
  heroButtonText: string;
  heroButtonWhatsappText: string;
  heroWhatsappLink: string;
  heroBgImage: string;

  // Seção Sobre Nós
  aboutTitle: string;
  aboutText: string;
  aboutLeftTitle: string;
  aboutLeftDesc: string;
  aboutRightTitle: string;
  aboutRightDesc: string;
  aboutImages: string[]; // 5 imagens circulares

  // Seção Banner Meio (Parallax)
  middleTitle: string;
  middleSubtitle: string;
  middleButtonText: string;
  middleBgImage: string;

  // Seção Contato
  contactTitle: string;
  contactSubtitle: string;
  contactPhone: string;
  contactHours: string;

  // Rodapé
  footerCopy: string;

  // Custom CSS livre
  customCss: string;
}

export const defaultThemeSettings: ThemeSettings = {
  primaryColor: "#e25c24",
  primaryHover: "#c2410c",
  bgColor: "#faf6f0",
  darkBgColor: "#2c2520",
  titleColor: "#1c1918",
  subtitleColor: "#e25c24",
  bodyTextColor: "#57534e", // stone-500
  lightTextColor: "#f5f5f4", // stone-100
  fontFamily: "'Montserrat', sans-serif",
  heroTitle: "Chef Nair",
  heroBadge: "Marmitaria & Yakissobaria",
  heroTagline: "Sabor que você sente, como em casa!",
  heroButtonText: "Ver Cardápio",
  heroButtonWhatsappText: "Pedir Agora",
  heroWhatsappLink: "https://wa.me/553599212311",
  heroBgImage: "",
  aboutTitle: "Sobre Nós",
  aboutText:
    "Chef Nair é especializada em marmitas deliciosas e yakisoba artesanal feito na chapa, tudo preparado com ingredientes frescos e selecionados. Nossa receita especial, aperfeiçoada ao longo dos anos, garante um sabor único e autêntico de comida caseira que você não encontra em outro lugar. Venha nos visitar e experimente nossas delícias!",
  aboutLeftTitle: "A APRESENTAÇÃO",
  aboutLeftDesc: "Preparado pelo nosso Chef na chapa, é algo que você precisa experimentar.",
  aboutRightTitle: "NOSSO ORGULHO",
  aboutRightDesc: "Servimos o yakisoba mais fresco, saboroso e irresistível da cidade.",
  aboutImages: [],
  middleTitle: "O MELHOR YAKISOBA DA CIDADE. GARANTIDO!",
  middleSubtitle:
    "Nosso cardápio conta com deliciosas marmitas caseiras e uma grande variedade de yakisobas artesanais preparados na chapa, com ingredientes selecionados e muito carinho. Venha experimentar e descubra por que somos referência na região.",
  middleButtonText: "VER NOSSO CARDÁPIO",
  middleBgImage: "",
  contactTitle: "CONTATO",
  contactSubtitle: "Marmitaria & Yakissobaria • Chef Nair",
  contactPhone: "(35) 9921-2311",
  contactHours: "Ter - Sex: 17h45 às 23h45\nSáb & Dom: 15h às 00h",
  footerCopy: "© 2026 CHEF NAIR. TODOS OS DIREITOS RESERVADOS.",
  customCss: "",
};

interface ThemeContextType {
  settings: ThemeSettings;
  updateSettings: (newSettings: Partial<ThemeSettings>) => Promise<boolean>;
  loading: boolean;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    const saved = localStorage.getItem("yakinhome-theme-settings");
    if (saved) {
      try {
        return { ...defaultThemeSettings, ...JSON.parse(saved) };
      } catch (e) {
        return defaultThemeSettings;
      }
    }
    return defaultThemeSettings;
  });
  const [loading, setLoading] = useState(true);

  // Injetar estilos dinamicamente
  const applyStyles = (theme: ThemeSettings) => {
    // 1. Variáveis de Cores e Fontes
    let styleVarsEl = document.getElementById("dynamic-theme-vars");
    if (!styleVarsEl) {
      styleVarsEl = document.createElement("style");
      styleVarsEl.id = "dynamic-theme-vars";
      document.head.appendChild(styleVarsEl);
    }
    styleVarsEl.innerHTML = `
      :root {
        --primary-color: ${theme.primaryColor};
        --primary-hover: ${theme.primaryHover};
        --bg-color: ${theme.bgColor};
        --dark-bg-color: ${theme.darkBgColor};
        --title-color: ${theme.titleColor};
        --subtitle-color: ${theme.subtitleColor};
        --body-text-color: ${theme.bodyTextColor};
        --light-text-color: ${theme.lightTextColor};
        --font-family: ${theme.fontFamily};
      }
      body {
        font-family: var(--font-family) !important;
        background-color: var(--bg-color);
        color: var(--body-text-color);
      }
    `;

    // 2. CSS Customizado livre
    let styleCssEl = document.getElementById("dynamic-theme-css");
    if (!styleCssEl) {
      styleCssEl = document.createElement("style");
      styleCssEl.id = "dynamic-theme-css";
      document.head.appendChild(styleCssEl);
    }
    styleCssEl.innerHTML = theme.customCss || "";
  };

  const loadTheme = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_theme")
        .select("theme_data")
        .eq("id", 1)
        .single();

      if (!error && data?.theme_data) {
        const mergedSettings = { ...defaultThemeSettings, ...data.theme_data };
        setSettings(mergedSettings);
        localStorage.setItem("yakinhome-theme-settings", JSON.stringify(mergedSettings));
        applyStyles(mergedSettings);
      } else {
        // Fallback local se não achar no supabase (por exemplo, se a tabela ainda não existir)
        applyStyles(settings);
      }
    } catch (err) {
      console.warn("Erro ao buscar tema do Supabase, utilizando local/default:", err);
      applyStyles(settings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTheme();
  }, []);

  // Forçar atualização do estilo sempre que as configurações locais mudarem
  useEffect(() => {
    applyStyles(settings);
  }, [settings]);

  const updateSettings = async (newSettings: Partial<ThemeSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("yakinhome-theme-settings", JSON.stringify(updated));
    applyStyles(updated);

    try {
      const { error } = await supabase.from("site_theme").upsert({
        id: 1,
        theme_data: updated,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Erro ao salvar tema no Supabase:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("Erro na requisição para salvar tema:", err);
      return false;
    }
  };

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, loading, refreshTheme: loadTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  }
  return context;
}
