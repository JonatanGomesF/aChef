import { useState } from "react";
import { useTheme, defaultThemeSettings } from "../context/ThemeContext";
import AdminLayout from "../components/AdminLayout";
import {
  Palette,
  FileText,
  Image as ImageIcon,
  Code,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function AdminAparencia() {
  const { settings, updateSettings } = useTheme();

  // Local state initialized with current context settings
  const [formData, setFormData] = useState(settings);
  const [activeTab, setActiveTab] = useState<"cores" | "textos" | "imagens" | "css">("cores");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleInputChange = (key: keyof typeof settings, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAboutImageChange = (index: number, value: string) => {
    const newImages = [...(formData.aboutImages || [])];
    // Fill up to the index if array is smaller
    while (newImages.length <= index) {
      newImages.push("");
    }
    newImages[index] = value;
    handleInputChange("aboutImages", newImages);
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    const success = await updateSettings(formData);
    setSaving(false);

    if (success) {
      setStatus({ type: "success", message: "Aparência salva com sucesso!" });
      setTimeout(() => setStatus(null), 3000);
    } else {
      setStatus({
        type: "error",
        message: "Erro ao salvar no banco de dados. Salvando localmente...",
      });
    }
  };

  const handleReset = () => {
    if (window.confirm("Tem certeza que deseja restaurar o estilo padrão original?")) {
      setFormData(defaultThemeSettings);
      setStatus({ type: "success", message: "Valores restaurados ao padrão (clique em Salvar para persistir)" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-white font-black text-xl tracking-tight flex items-center gap-2">
              <Sparkles className="text-amber-500" size={22} />
              Aparência e Design
            </h1>
            <p className="text-white/30 text-xs font-medium mt-0.5">
              Customize toda a identidade visual e o conteúdo do site sem mexer no código.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-white/50 border border-white/[0.08] hover:border-white/20 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              <RotateCcw size={14} />
              Restaurar Padrão
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black text-white bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-50 disabled:scale-100 rounded-xl transition-all cursor-pointer shadow-lg shadow-green-950/20"
            >
              <Save size={14} />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {status && (
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border text-xs font-bold animate-fade-in ${
              status.type === "success"
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}
          >
            {status.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{status.message}</span>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Vertical Tabs Sidebar */}
          <div
            className="lg:col-span-1 rounded-2xl p-2.5 space-y-1"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {[
              { id: "cores", label: "Cores & Identidade", Icon: Palette },
              { id: "textos", label: "Conteúdo Textual", Icon: FileText },
              { id: "imagens", label: "Imagens & Mídias", Icon: ImageIcon },
              { id: "css", label: "CSS Customizado", Icon: Code },
            ].map((tab) => {
              const Icon = tab.Icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer text-left ${
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-orange-950/40"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-white" : "text-white/30"} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Configuration Form Panel */}
          <div
            className="lg:col-span-3 rounded-2xl p-6 space-y-6"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {/* ── CORES ── */}
            {activeTab === "cores" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-white font-bold text-sm">Cores do Tema</h3>
                  <p className="text-white/30 text-[10px] mt-0.5">Customize as cores principais aplicadas em botões, links, títulos e planos de fundo do site.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cor Primária */}
                  <div className="space-y-1.5">
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Cor Primária (ex: botões e links)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => handleInputChange("primaryColor", e.target.value)}
                        className="w-10 h-9 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.primaryColor}
                        onChange={(e) => handleInputChange("primaryColor", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Cor Primária Hover */}
                  <div className="space-y-1.5">
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Cor Primária (Hover / Passar Mouse)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.primaryHover}
                        onChange={(e) => handleInputChange("primaryHover", e.target.value)}
                        className="w-10 h-9 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.primaryHover}
                        onChange={(e) => handleInputChange("primaryHover", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Fundo do Site */}
                  <div className="space-y-1.5">
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Cor de Fundo Principal</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.bgColor}
                        onChange={(e) => handleInputChange("bgColor", e.target.value)}
                        className="w-10 h-9 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.bgColor}
                        onChange={(e) => handleInputChange("bgColor", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Fundo Escuro das Seções */}
                  <div className="space-y-1.5">
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Cor de Fundo Seções Escuras (ex: Rodapé/Parallax)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.darkBgColor}
                        onChange={(e) => handleInputChange("darkBgColor", e.target.value)}
                        className="w-10 h-9 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.darkBgColor}
                        onChange={(e) => handleInputChange("darkBgColor", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Texto de Título */}
                  <div className="space-y-1.5">
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Cor de Títulos</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.titleColor}
                        onChange={(e) => handleInputChange("titleColor", e.target.value)}
                        className="w-10 h-9 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.titleColor}
                        onChange={(e) => handleInputChange("titleColor", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Subtítulos */}
                  <div className="space-y-1.5">
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Cor de Subtítulos / Destaques</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.subtitleColor}
                        onChange={(e) => handleInputChange("subtitleColor", e.target.value)}
                        className="w-10 h-9 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.subtitleColor}
                        onChange={(e) => handleInputChange("subtitleColor", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Texto de Corpo */}
                  <div className="space-y-1.5">
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Cor de Texto Comum</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.bodyTextColor}
                        onChange={(e) => handleInputChange("bodyTextColor", e.target.value)}
                        className="w-10 h-9 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.bodyTextColor}
                        onChange={(e) => handleInputChange("bodyTextColor", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Texto Claro */}
                  <div className="space-y-1.5">
                    <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Cor de Texto Claro (sobre fundos escuros)</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.lightTextColor}
                        onChange={(e) => handleInputChange("lightTextColor", e.target.value)}
                        className="w-10 h-9 rounded-lg border border-white/[0.08] bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.lightTextColor}
                        onChange={(e) => handleInputChange("lightTextColor", e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/[0.06] my-4" />

                {/* Fonte do Site */}
                <div className="space-y-1.5">
                  <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Família de Fonte Principal (CSS font-family)</label>
                  <input
                    type="text"
                    value={formData.fontFamily}
                    onChange={(e) => handleInputChange("fontFamily", e.target.value)}
                    placeholder="'Montserrat', sans-serif"
                    className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 transition-all"
                  />
                  <p className="text-white/25 text-[9px]">Padrão: `&apos;Montserrat&apos;, sans-serif`. Se inserir fontes externas de serviços como o Google Fonts, você pode importá-las na guia <strong>CSS Customizado</strong>.</p>
                </div>
              </div>
            )}

            {/* ── TEXTOS ── */}
            {activeTab === "textos" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-bold text-sm">Configuração de Conteúdo e Textos</h3>
                  <p className="text-white/30 text-[10px] mt-0.5">Edite livremente os textos de todas as seções da página principal do site.</p>
                </div>

                {/* Seção Hero Banner */}
                <div className="space-y-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.03]">
                  <h4 className="text-primary font-bold text-xs">1. Seção Principal (Hero Banner)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-white/40 text-[9px] font-bold">Título da Marca</label>
                      <input
                        type="text"
                        value={formData.heroTitle}
                        onChange={(e) => handleInputChange("heroTitle", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-white/40 text-[9px] font-bold">Texto da Badge Superior</label>
                      <input
                        type="text"
                        value={formData.heroBadge}
                        onChange={(e) => handleInputChange("heroBadge", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-white/40 text-[9px] font-bold">Slogan Principal (Tagline)</label>
                      <input
                        type="text"
                        value={formData.heroTagline}
                        onChange={(e) => handleInputChange("heroTagline", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-white/40 text-[9px] font-bold">Botão Cardápio</label>
                      <input
                        type="text"
                        value={formData.heroButtonText}
                        onChange={(e) => handleInputChange("heroButtonText", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-white/40 text-[9px] font-bold">Botão WhatsApp</label>
                      <input
                        type="text"
                        value={formData.heroButtonWhatsappText}
                        onChange={(e) => handleInputChange("heroButtonWhatsappText", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-white/40 text-[9px] font-bold">Link de Envio de Pedido (WhatsApp)</label>
                      <input
                        type="text"
                        value={formData.heroWhatsappLink}
                        onChange={(e) => handleInputChange("heroWhatsappLink", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção Sobre Nós */}
                <div className="space-y-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.03]">
                  <h4 className="text-primary font-bold text-xs">2. Seção "Sobre Nós"</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-white/40 text-[9px] font-bold">Título Principal</label>
                        <input
                          type="text"
                          value={formData.aboutTitle}
                          onChange={(e) => handleInputChange("aboutTitle", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-white/40 text-[9px] font-bold">Descrição Textual</label>
                        <textarea
                          rows={3}
                          value={formData.aboutText}
                          onChange={(e) => handleInputChange("aboutText", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-white/40 text-[9px] font-bold">Destaque Esquerdo — Título</label>
                        <input
                          type="text"
                          value={formData.aboutLeftTitle}
                          onChange={(e) => handleInputChange("aboutLeftTitle", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-white/40 text-[9px] font-bold">Destaque Esquerdo — Descrição</label>
                        <input
                          type="text"
                          value={formData.aboutLeftDesc}
                          onChange={(e) => handleInputChange("aboutLeftDesc", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-white/40 text-[9px] font-bold">Destaque Direito — Título</label>
                        <input
                          type="text"
                          value={formData.aboutRightTitle}
                          onChange={(e) => handleInputChange("aboutRightTitle", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-white/40 text-[9px] font-bold">Destaque Direito — Descrição</label>
                        <input
                          type="text"
                          value={formData.aboutRightDesc}
                          onChange={(e) => handleInputChange("aboutRightDesc", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção Banner do Meio */}
                <div className="space-y-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.03]">
                  <h4 className="text-primary font-bold text-xs">3. Banner Promocional do Meio</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label className="text-white/40 text-[9px] font-bold">Título do Banner</label>
                      <input
                        type="text"
                        value={formData.middleTitle}
                        onChange={(e) => handleInputChange("middleTitle", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-white/40 text-[9px] font-bold">Subtítulo / Descrição</label>
                      <textarea
                        rows={2}
                        value={formData.middleSubtitle}
                        onChange={(e) => handleInputChange("middleSubtitle", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-white/40 text-[9px] font-bold">Texto do Botão</label>
                      <input
                        type="text"
                        value={formData.middleButtonText}
                        onChange={(e) => handleInputChange("middleButtonText", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção de Contatos e Rodapé */}
                <div className="space-y-3 p-4 rounded-xl bg-white/[0.01] border border-white/[0.03]">
                  <h4 className="text-primary font-bold text-xs">4. Contatos, Horários e Rodapé</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-white/40 text-[9px] font-bold">Título Contato</label>
                      <input
                        type="text"
                        value={formData.contactTitle}
                        onChange={(e) => handleInputChange("contactTitle", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-white/40 text-[9px] font-bold">Subtítulo Contato</label>
                      <input
                        type="text"
                        value={formData.contactSubtitle}
                        onChange={(e) => handleInputChange("contactSubtitle", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-white/40 text-[9px] font-bold">Telefone Principal</label>
                      <input
                        type="text"
                        value={formData.contactPhone}
                        onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-white/40 text-[9px] font-bold">Texto dos Direitos do Rodapé</label>
                      <input
                        type="text"
                        value={formData.footerCopy}
                        onChange={(e) => handleInputChange("footerCopy", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-white/40 text-[9px] font-bold">Horário de Funcionamento (pule linhas para separar)</label>
                      <textarea
                        rows={3}
                        value={formData.contactHours}
                        onChange={(e) => handleInputChange("contactHours", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 resize-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── IMAGENS ── */}
            {activeTab === "imagens" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-white font-bold text-sm">Upload e Links de Imagens</h3>
                  <p className="text-white/30 text-[10px] mt-0.5">Defina as imagens principais inserindo links de imagens hospedadas (ex: imgur, Supabase Storage ou qualquer CDN).</p>
                </div>

                {/* Banner Principal Hero */}
                <div className="space-y-1.5">
                  <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Imagem de Fundo do Banner Principal (Hero)</label>
                  <input
                    type="text"
                    value={formData.heroBgImage}
                    onChange={(e) => handleInputChange("heroBgImage", e.target.value)}
                    placeholder="Cole a URL da imagem aqui"
                    className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 transition-all"
                  />
                  <p className="text-white/25 text-[9px]">Padrão: Deixe em branco para usar o fundo original da Yakissobaria.</p>
                </div>

                {/* Banner Meio Parallax */}
                <div className="space-y-1.5">
                  <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Imagem de Fundo do Banner Promocional do Meio</label>
                  <input
                    type="text"
                    value={formData.middleBgImage}
                    onChange={(e) => handleInputChange("middleBgImage", e.target.value)}
                    placeholder="Cole a URL da imagem aqui"
                    className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 transition-all"
                  />
                  <p className="text-white/25 text-[9px]">Padrão: Deixe em branco para usar a imagem de yakisoba de fundo padrão.</p>
                </div>

                <div className="h-px bg-white/[0.06] my-4" />

                {/* Fileira de Imagens do Sobre Nós */}
                <div className="space-y-3">
                  <h4 className="text-primary font-bold text-xs">Fileira de Imagens da Seção "Sobre Nós" (5 Pratos Circulares)</h4>
                  <p className="text-white/20 text-[9px]">Selecione links de imagens para substituir as 5 fotos dos yakisobas na seção Sobre Nós do site original. Deixe vazios para usar as originais.</p>
                  
                  <div className="space-y-3.5">
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <span className="w-16 text-white/40 text-[10px] font-bold uppercase">Foto #{idx + 1}</span>
                        <input
                          type="text"
                          value={formData.aboutImages?.[idx] || ""}
                          onChange={(e) => handleAboutImageChange(idx, e.target.value)}
                          placeholder="Cole a URL da imagem correspondente"
                          className="flex-1 w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-white text-xs outline-none focus:border-white/20 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── CSS CUSTOMIZADO ── */}
            {activeTab === "css" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-white font-bold text-sm">CSS Personalizado Livre</h3>
                  <p className="text-white/30 text-[10px] mt-0.5">Insira qualquer código CSS para modificar livremente cores, fontes, botões, tamanhos e efeitos visuais do site.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-white/50 text-[10px] font-bold uppercase tracking-wider">Código CSS Adicional</label>
                  <textarea
                    rows={12}
                    value={formData.customCss}
                    onChange={(e) => handleInputChange("customCss", e.target.value)}
                    placeholder={`/* Escreva suas regras de estilo aqui */\n\n/* Exemplo: esconder os Kanjis decorativos da lateral */\n.xl\\:block {\n  display: none !important;\n}\n\n/* Exemplo: alterar borda de todos os cards de produtos */\n.product-card {\n  border: 2px dashed var(--primary-color) !important;\n}`}
                    className="w-full p-4 rounded-xl border border-white/[0.08] bg-black/40 text-stone-200 text-xs outline-none focus:border-white/20 transition-all font-mono resize-none"
                  />
                  <p className="text-white/25 text-[9px] leading-relaxed">
                    Você pode inspecionar os elementos do site e escrever regras para sobrescrevê-los. Qualquer CSS válido inserido aqui será injetado instantaneamente no site para todos os visitantes.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
