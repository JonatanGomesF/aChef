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
  primaryColor: "#FF7A00",
  primaryHover: "#E85D04",
  bgColor: "#F8FAFC",
  darkBgColor: "#0B192C",
  titleColor: "#0C2340",
  subtitleColor: "#FF7A00",
  bodyTextColor: "#334155",
  lightTextColor: "#FFFFFF",
  fontFamily: "'Montserrat', sans-serif",
  heroTitle: "Sabor da Praia",
  heroBadge: "SABOR • QUALIDADE • BOM ATENDIMENTO",
  heroTagline: "O autêntico sabor do litoral! Pratos deliciosos, porções artesanais e receitas preparadas na hora com ingredientes frescos e selecionados.",
  heroButtonText: "Ver Cardápio",
  heroButtonWhatsappText: "Pedir no WhatsApp",
  heroWhatsappLink: "https://wa.me/553599212311",
  heroBgImage: "",
  aboutTitle: "Sobre o Sabor da Praia",
  aboutText:
    "O Sabor da Praia nasceu com a paixão de levar a melhor gastronomia, pratos saborosos e porções generosas até a sua mesa. Cada receita é preparada na hora com muito capricho, ingredientes frescos e aquele tempero especial que faz você sempre querer voltar!",
  aboutLeftTitle: "PREPARO ARTESANAL",
  aboutLeftDesc: "Feito na hora com técnica e ingredientes frescos para o ponto e sabor perfeitos.",
  aboutRightTitle: "QUALIDADE & SABOR",
  aboutRightDesc: "Receitas saborosas e selecionadas para encantar seu paladar em cada porção.",
  aboutImages: [],
  middleTitle: "SABOR, QUALIDADE E BOM ATENDIMENTO",
  middleSubtitle:
    "Nossas porções, pratos especiais e opções do cardápio são preparadas com ingredientes selecionados e muito carinho. Peça agora e surpreenda-se!",
  middleButtonText: "CONHEÇA NOSSO CARDÁPIO",
  middleBgImage: "",
  contactTitle: "CONTATO & ATENDIMENTO",
  contactSubtitle: "Sabor da Praia • Delivery & Retirada",
  contactPhone: "(35) 9921-2311",
  contactHours: "Ter - Sex: 17h45 às 23h45\nSáb & Dom: 15h às 00h",
  footerCopy: "© 2026 SABOR DA PRAIA. TODOS OS DIREITOS RESERVADOS.",
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
    const saved = localStorage.getItem("sabor-praia-theme-settings") || localStorage.getItem("sabor-porcao-theme-settings") || localStorage.getItem("yakinhome-theme-settings");
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
        localStorage.setItem("sabor-praia-theme-settings", JSON.stringify(mergedSettings));
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
    localStorage.setItem("sabor-praia-theme-settings", JSON.stringify(updated));
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
