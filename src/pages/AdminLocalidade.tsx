import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { getDefaultDeliverySettings, type DeliveryRule, type DeliverySettings } from "../data/deliverySettings";
import { MapPin, Save, Plus, Trash2 } from "lucide-react";

const STORAGE_KEY = "yakinhome_delivery_settings";

export default function AdminLocalidade() {
  const [settings, setSettings] = useState<DeliverySettings>(getDefaultDeliverySettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DeliverySettings;
        if (!parsed.storeCep || parsed.storeCep === "13310200" || parsed.storeCep === "13310-200") {
          parsed.storeCep = "11730-006";
        }
        setSettings(parsed);
      } else {
        setSettings(getDefaultDeliverySettings());
      }
    } catch {
      // ignore
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const updateRule = (id: number, patch: Partial<DeliveryRule>) => {
    setSettings((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
    }));
  };

  const addRule = () => {
    const nextId = Date.now();
    setSettings((prev) => ({
      ...prev,
      rules: [
        ...prev.rules,
        {
          id: nextId,
          minKm: prev.rules.length ? prev.rules[prev.rules.length - 1].minKm + 1 : 1,
          maxKm: null,
          fee: 12,
          label: `Acima de ${prev.rules.length + 1}km`,
        },
      ],
    }));
  };

  const removeRule = (id: number) => {
    setSettings((prev) => ({
      ...prev,
      rules: prev.rules.filter((rule) => rule.id !== id),
    }));
  };

  const preview = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7, 8].map((km) => ({
      km,
      fee: settings.rules.find((rule) => {
        if (rule.maxKm === null) return km >= rule.minKm;
        return km >= rule.minKm && km <= rule.maxKm;
      })?.fee ?? settings.baseFee,
    }));
  }, [settings]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="rounded-3xl p-6 border border-white/[0.06] bg-[#141414] shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#c0261a]">
                <MapPin size={18} />
                <h1 className="text-white font-black text-xl tracking-tight">Localidade & Entrega</h1>
              </div>
              <p className="text-white/40 text-xs font-medium mt-2 max-w-2xl">
                Defina as regras de taxa por distância para os pedidos por CEP. A cada alteração, o checkout mostrará o valor automaticamente.
              </p>
            </div>
            <button
              onClick={saveSettings}
              className="inline-flex items-center justify-center gap-2 bg-[#c0261a] hover:bg-[#a31d12] text-white px-4 py-2.5 rounded-xl text-sm font-black tracking-wider uppercase transition-all duration-300 cursor-pointer"
            >
              <Save size={15} />
              {saved ? "Salvo!" : "Salvar Regras"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="rounded-3xl p-5 border border-white/[0.06] bg-[#141414] shadow-2xl space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-white font-black text-sm tracking-wide uppercase">Faixas de taxa</h2>
                <p className="text-white/40 text-[11px] mt-1 max-w-xl">Use a localização da loja para calcular distância real com base no CEP e no endereço de destino.</p>
              </div>
              <button
                onClick={addRule}
                className="inline-flex items-center gap-2 bg-[#c0261a] hover:bg-[#a31d12] text-white px-4 py-2.5 rounded-xl text-sm font-black tracking-wider uppercase transition-all duration-300 cursor-pointer"
              >
                <Plus size={14} />
                Nova faixa
              </button>
            </div>

            <div className="space-y-3">
              {settings.rules.map((rule, index) => (
                <div key={rule.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em]">Faixa {index + 1}</div>
                    {settings.rules.length > 1 && (
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="text-white/35 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="space-y-1.5">
                      <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Distância inicial (km)</span>
                      <input
                        type="number"
                        min="0"
                        value={rule.minKm}
                        onChange={(e) => updateRule(rule.id, { minKm: Number(e.target.value) })}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#c0261a]/60"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Distância final (km)</span>
                      <input
                        type="number"
                        min="0"
                        value={rule.maxKm ?? ""}
                        onChange={(e) => updateRule(rule.id, { maxKm: e.target.value === "" ? null : Number(e.target.value) })}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#c0261a]/60"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Taxa (R$)</span>
                      <input
                        type="number"
                        min="0"
                        value={rule.fee}
                        onChange={(e) => updateRule(rule.id, { fee: Number(e.target.value) })}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#c0261a]/60"
                      />
                    </label>
                  </div>

                  <label className="space-y-1.5 block">
                    <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Descrição</span>
                    <input
                      value={rule.label}
                      onChange={(e) => updateRule(rule.id, { label: e.target.value })}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#c0261a]/60"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl p-5 border border-white/[0.06] bg-[#141414] shadow-2xl">
              <h2 className="text-white font-black text-sm tracking-wide uppercase">Configuração base</h2>
              <div className="mt-4 space-y-3">
                <label className="space-y-1.5 block">
                  <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Endereço da loja</span>
                  <input
                    type="text"
                    value={settings.storeAddress}
                    onChange={(e) => setSettings((prev) => ({ ...prev, storeAddress: e.target.value }))}
                    placeholder="Rua da Loja, Cidade, UF"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#c0261a]/60"
                  />
                  <p className="text-[10px] text-white/30 mt-1">Use o endereço completo da loja para calcular distância real contra o CEP do cliente.</p>
                </label>

                <label className="space-y-1.5 block">
                  <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">CEP da loja</span>
                  <input
                    type="text"
                    value={settings.storeCep ?? "11730-006"}
                    onChange={(e) => setSettings((prev) => ({ ...prev, storeCep: e.target.value }))}
                    placeholder="11730-006"
                    maxLength={9}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#c0261a]/60"
                  />
                  <p className="text-[10px] text-white/30 mt-1">CEP da loja (11730-006) para calcular distância e entrega do cliente.</p>
                </label>

                <label className="space-y-1.5 block">
                  <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Distância gratuita (km)</span>
                  <input
                    type="number"
                    min="0"
                    value={settings.freeDistanceKm}
                    onChange={(e) => setSettings((prev) => ({ ...prev, freeDistanceKm: Number(e.target.value) }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#c0261a]/60"
                  />
                </label>

                <label className="space-y-1.5 block">
                  <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">Taxa base (R$)</span>
                  <input
                    type="number"
                    min="0"
                    value={settings.baseFee}
                    onChange={(e) => setSettings((prev) => ({ ...prev, baseFee: Number(e.target.value) }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#c0261a]/60"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-3xl p-5 border border-white/[0.06] bg-[#141414] shadow-2xl">
              <h2 className="text-white font-black text-sm tracking-wide uppercase">Pré-visualização</h2>
              <div className="mt-4 space-y-2">
                {preview.map((item) => (
                  <div key={item.km} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-white/70">
                    <span>{item.km} km</span>
                    <span className="font-black text-[#c0261a]">R$ {item.fee.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
