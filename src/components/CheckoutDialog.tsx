import { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { supabase } from "../services/supabase";
import { calculateDeliveryFee, getDefaultDeliverySettings, type DeliverySettings } from "../data/deliverySettings";
import { estimateDistanceKm } from "../lib/distance";
import { X, CheckCircle, MessageSquare, MapPin } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export default function CheckoutDialog({ open, onOpenChange }: Props) {
  const { cartItems, clearCart, totalPrice } = useCart();

  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [district, setDistrict] = useState("");
  const [cep, setCep] = useState("");
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [payment, setPayment] = useState("PIX");
  const [troco, setTroco] = useState("");
  const [phone, setPhone] = useState("");
  
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [settings, setSettings] = useState<DeliverySettings>(getDefaultDeliverySettings);
  const [cepLoading, setCepLoading] = useState(false);

  // ── GPS Geolocation State ──
  type GeoLocationData = {
    latitude: number;
    longitude: number;
    accuracy: number;
    url: string;
  };

  const [geoData, setGeoData] = useState<GeoLocationData | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleCaptureLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoError("Seu navegador não possui suporte a geolocalização.");
      return;
    }

    setGeoData(null);
    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        if (
          typeof lat !== "number" ||
          isNaN(lat) ||
          lat < -90 ||
          lat > 90 ||
          typeof lng !== "number" ||
          isNaN(lng) ||
          lng < -180 ||
          lng > 180
        ) {
          setGeoLoading(false);
          setGeoError("Coordenadas GPS inválidas retornadas pelo navegador. Tente novamente.");
          return;
        }

        const url = `https://www.google.com/maps?q=${lat},${lng}`;
        setGeoData({
          latitude: lat,
          longitude: lng,
          accuracy,
          url,
        });
        setGeoLoading(false);
        setGeoError(null);
      },
      (error) => {
        setGeoLoading(false);
        setGeoData(null);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Precisamos da sua localização para concluir a entrega. Habilite o acesso à localização no navegador e tente novamente.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGeoError("GPS desativado ou sinal indisponível. Por favor, ative a localização no seu aparelho e tente novamente.");
        } else if (error.code === error.TIMEOUT) {
          setGeoError("Tempo limite esgotado ao buscar o sinal GPS. Verifique sua conexão e tente novamente.");
        } else {
          setGeoError("Não foi possível obter sua localização GPS. Verifique as permissões do dispositivo e tente novamente.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("yakinhome_delivery_settings");
      if (raw) {
        const parsed = JSON.parse(raw) as DeliverySettings;
        if (!parsed.storeCep || parsed.storeCep === "13310200" || parsed.storeCep === "13310-200") {
          parsed.storeCep = "11730-006";
        }
        setSettings(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const totalWithDelivery = useMemo(() => totalPrice + deliveryFee, [totalPrice, deliveryFee]);

  const updateDeliveryFee = async (destinationAddress: string) => {
    if (!destinationAddress.trim()) {
      setDistanceKm(null);
      setDeliveryFee(0);
      return;
    }

    // Resolve store address: prefer explicit storeAddress, otherwise try storeCep
    let storeAddr = settings.storeAddress || "";
    const cepRaw = (settings.storeCep ?? "").replace(/\D/g, "");
    if (!storeAddr && cepRaw.length === 8) {
      try {
        const resp = await fetch(`https://viacep.com.br/ws/${cepRaw}/json/`);
        const d = await resp.json();
        if (d && !d.erro) {
          const parts = [];
          if (d.logradouro) parts.push(d.logradouro);
          if (d.bairro) parts.push(d.bairro);
          if (d.localidade) parts.push(d.localidade);
          if (d.uf) parts.push(d.uf);
          storeAddr = `${parts.join(", ")} ${cepRaw}`.trim();
        }
      } catch {
        // ignore and fallback to whatever storeAddr we have
      }
    }

    if (!storeAddr) {
      setDistanceKm(null);
      setDeliveryFee(0);
      return;
    }

    const distance = await estimateDistanceKm(storeAddr, destinationAddress);
    if (distance === null) {
      setDistanceKm(null);
      setDeliveryFee(0);
      return;
    }

    const fee = calculateDeliveryFee(distance, settings);
    setDistanceKm(Number(distance.toFixed(1)));
    setDeliveryFee(fee);
  };

  useEffect(() => {
    const shouldCalculate = cep.length === 8 && (street || district || number);
    if (!shouldCalculate) return;

    const destinationAddress = `${street}${number ? ` ${number}` : ""}${district ? `, ${district}` : ""}${cep ? `, ${cep}` : ""}`.trim();
    updateDeliveryFee(destinationAddress);
  }, [settings.storeAddress, settings.storeCep, street, number, district, cep]);

  const handleCepChange = async (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 8);
    setCep(cleaned);

    if (cleaned.length !== 8) {
      setDistanceKm(null);
      setDeliveryFee(0);
      return;
    }

    setCepLoading(true);
    let streetValue = street;
    let districtValue = district;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await response.json();

      if (data && !data.erro) {
        streetValue = data.logradouro || "";
        districtValue = data.bairro || "";
        setStreet(streetValue);
        setDistrict(districtValue);
      }
    } catch {
      // ignore
    } finally {
      setCepLoading(false);
    }

    const destinationAddress = `${streetValue}${number ? ` ${number}` : ""}${districtValue ? `, ${districtValue}` : ""}${cleaned ? `, ${cleaned}` : ""}`.trim();
    await updateDeliveryFee(destinationAddress);
  };

  if (!open) return null;

  const send = async () => {
    if (!name || !phone || !street || !number) {
      alert("Por favor, preencha os campos obrigatórios: Nome, WhatsApp, Rua e Número.");
      return;
    }

    if (!geoData || !geoData.url) {
      alert("Para continuar, compartilhe sua localização atual. Isso ajudará nosso motoboy a encontrar seu endereço com mais facilidade.");
      return;
    }

    setIsSending(true);

    // Save customer in Supabase
    try {
      await supabase
        .from("customers")
        .insert([
          {
            name,
            phone,
            street,
            number,
            district,
            last_order_value: totalPrice,
          },
        ]);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
    }

    // Save order in Supabase
    try {
      const trocoClean = troco ? troco.replace(/[^\d,.]/g, "").replace(",", ".") : "";
      const trocoNumber = payment === "Dinheiro" && trocoClean ? parseFloat(trocoClean) : null;
      const baseNotes = cartItems.map((i) => i.observation).filter(Boolean).join(" | ");

      const primaryPayload = {
        customer_name: name,
        customer_phone: phone,
        street,
        number,
        district: district || "",
        items: cartItems,
        total: totalWithDelivery,
        payment_method: payment,
        change_for: trocoNumber && !isNaN(trocoNumber) ? trocoNumber : null,
        status: "pending",
        notes: baseNotes,
        latitude: geoData.latitude,
        longitude: geoData.longitude,
        location_url: geoData.url,
        location_accuracy: geoData.accuracy,
      };

      const { error: insertErr } = await supabase.from("orders").insert([primaryPayload]);
      if (insertErr) {
        console.warn("Falha ao salvar colunas GPS em orders, usando fallback seguro...", insertErr);
        // Fallback: append GPS link into notes so it's always preserved even before migration
        const fallbackNotes = [
          baseNotes,
          `Localização GPS: ${geoData.url} (Precisão: ~${Math.round(geoData.accuracy)}m)`,
        ]
          .filter(Boolean)
          .join(" | ");

        await supabase.from("orders").insert([
          {
            customer_name: name,
            customer_phone: phone,
            street,
            number,
            district: district || "",
            items: cartItems,
            total: totalWithDelivery,
            payment_method: payment,
            change_for: trocoNumber && !isNaN(trocoNumber) ? trocoNumber : null,
            status: "pending",
            notes: fallbackNotes,
          },
        ]);
      }
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
    }

    let msg = `*NOVO PEDIDO - SABOR DA PRAIA*\n\n`;

    msg += `*Nome:* ${name}\n`;
    msg += `*WhatsApp:* ${phone}\n`;
    msg += `*Endereço:* ${street}, ${number}`;

    if (district) {
      msg += ` - ${district}`;
    }

    if (cep) {
      msg += ` (CEP: ${cep})`;
    }

    msg += `\n\n📍 *LOCALIZAÇÃO NO MAPS:*\n${geoData.url}\n`;
    if (geoData.accuracy) {
      msg += `🎯 *Precisão GPS:* aprox. ${Math.round(geoData.accuracy)}m\n`;
    }

    msg += `\n*Pedido:*\n`;

    cartItems.forEach((item) => {
      msg += `• ${item.quantity}x ${item.name}`;

      if (item.size) {
        msg += ` (${item.size})`;
      }

      msg += `\n`;

      if (item.promotionActive) {
        msg += `🔥 PROMOÇÃO ATIVA\n`;
      }

      if (
        item.extras &&
        item.extras.length > 0
      ) {
        msg += `  Adicionais:\n`;

        item.extras.forEach((extra) => {
          msg += `   + ${extra.name} (R$ ${extra.price.toFixed(2)})\n`;
        });
      }

      if (item.observation) {
        msg += `  Obs: ${item.observation}\n`;
      }

      msg += `  Subtotal: R$ ${(item.price * item.quantity).toFixed(2)}\n\n`;
    });

    msg += `*Taxa de entrega:* R$ ${deliveryFee.toFixed(2)}\n`;
    msg += `*Total:* R$ ${totalWithDelivery.toFixed(2)}\n`;
    msg += `*Pagamento:* ${payment}`;

    if (payment === "Dinheiro" && troco) {
      msg += ` (troco para R$ ${troco})`;
    }

    const url = `https://wa.me/5513996430887?text=${encodeURIComponent(msg)}`;

    setIsSending(false);
    setIsSuccess(true);

    // Play success screen for 2 seconds then redirect and close
    setTimeout(() => {
      window.open(url, "_blank");
      clearCart();
      setIsSuccess(false);
      onOpenChange(false);
      // Reset fields
      setName("");
      setStreet("");
      setNumber("");
      setDistrict("");
      setCep("");
      setDistanceKm(null);
      setDeliveryFee(0);
      setPhone("");
      setTroco("");
      setGeoData(null);
      setGeoError(null);
      setGeoLoading(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[999] p-2 sm:p-4 backdrop-blur-sm animate-fade-in">
      
      {isSuccess ? (
        /* Order Success State Screen */
        <div 
          className="w-full max-w-md rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center space-y-6 animate-scale-up"
          style={{ background: "rgba(250,246,240,0.98)", border: "1px solid rgba(0,0,0,0.06)", backdropFilter: "blur(12px)" }}
        >
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-green-600 animate-bounce">
            <CheckCircle size={48} className="stroke-[2.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-stone-900">Pedido Confirmado!</h2>
            <p className="text-sm text-stone-600 font-medium max-w-xs mx-auto">
              Estamos preparando seu pedido. Redirecionando você para o WhatsApp em instantes...
            </p>
          </div>
          <div className="w-12 h-1.5 bg-stone-200 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 bottom-0 bg-green-500 rounded-full w-1/2 animate-[bannerScroll_1.5s_linear_infinite]" />
          </div>
        </div>
      ) : (
        /* Checkout Form State */
        <div 
          className="w-full max-w-xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl p-4 sm:p-5 space-y-3 relative shadow-2xl animate-scale-up"
          style={{ background: "rgba(250,246,240,0.98)", border: "1px solid rgba(0,0,0,0.06)", backdropFilter: "blur(12px)" }}
        >
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 text-stone-400 hover:text-stone-800 transition-colors duration-200 cursor-pointer"
          >
            <X size={20} />
          </button>

          <div>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">Finalizar Pedido</h2>
            <p className="text-xs text-stone-500 font-semibold mt-1">Preencha os detalhes para entrega rápida</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Nome Completo *</label>
              <input
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-stone-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl p-3 text-stone-800 text-sm outline-none transition-all duration-300 placeholder:text-stone-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">WhatsApp *</label>
              <input
                placeholder="Ex: (35) 99999-9999"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-stone-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl p-3 text-stone-800 text-sm outline-none transition-all duration-300 placeholder:text-stone-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">CEP</label>
              <div className="relative">
                <input
                  placeholder="Digite o CEP"
                  value={cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  className="w-full bg-white border border-stone-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl p-3 pr-10 text-stone-800 text-sm outline-none transition-all duration-300 placeholder:text-stone-300"
                />
                {cepLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary text-[10px] font-black uppercase">Buscando...</div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Endereço de Entrega *</label>
              <input
                placeholder="Nome da Rua / Avenida"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full bg-white border border-stone-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl p-3 text-stone-800 text-sm outline-none transition-all duration-300 placeholder:text-stone-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Número *</label>
                <input
                  placeholder="Nº"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full bg-white border border-stone-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl p-3 text-stone-800 text-sm outline-none transition-all duration-300 placeholder:text-stone-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Bairro</label>
                <input
                  placeholder="Seu bairro"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-white border border-stone-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl p-3 text-stone-800 text-sm outline-none transition-all duration-300 placeholder:text-stone-300"
                />
              </div>
            </div>

            {/* ── CAMPO OBRIGATÓRIO: LOCALIZAÇÃO NO MAPS ── */}
            <div
              className="sm:col-span-2 space-y-2 rounded-xl p-3 sm:p-3.5 border transition-all duration-300 bg-white"
              style={{
                borderColor: geoData
                  ? "rgba(34, 197, 94, 0.5)"
                  : geoError
                  ? "rgba(239, 68, 68, 0.4)"
                  : "rgba(234, 88, 12, 0.35)",
                boxShadow: geoData ? "0 0 10px rgba(34, 197, 94, 0.1)" : "none",
              }}
            >
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-stone-700 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="text-primary text-xs">📍</span>
                  <span>LOCALIZAÇÃO NO MAPS *</span>
                </label>
                {geoData ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    <CheckCircle size={11} className="text-green-600" />
                    GPS Confirmado (~{Math.round(geoData.accuracy)}m)
                  </span>
                ) : (
                  <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Obrigatório
                  </span>
                )}
              </div>

              {!geoData ? (
                <>
                  <button
                    type="button"
                    onClick={handleCaptureLocation}
                    disabled={geoLoading}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-[0.99] text-white py-3 px-4 rounded-xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {geoLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Obtendo localização GPS...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-base">📍</span>
                        <span className="tracking-wide">COMPARTILHAR MINHA LOCALIZAÇÃO</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-stone-500 font-medium">
                    Compartilhe sua localização atual para facilitar a entrega do seu pedido.
                  </p>
                </>
              ) : (
                <div className="space-y-2 pt-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-green-700 font-bold flex items-center gap-1">
                      <CheckCircle size={13} className="text-green-600" />
                      Localização capturada com sucesso!
                    </span>
                    <button
                      type="button"
                      onClick={handleCaptureLocation}
                      disabled={geoLoading}
                      className="text-[10px] text-stone-500 hover:text-stone-800 underline font-bold cursor-pointer"
                    >
                      Atualizar localização
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={geoData.url}
                    className="w-full bg-stone-50 border border-green-300 text-stone-700 text-xs rounded-lg p-2.5 font-mono select-all cursor-text outline-none"
                    title="Link do Google Maps gerado com suas coordenadas reais"
                  />
                  <p className="text-[10px] text-stone-500">
                    O motoboy receberá este link e o QR Code impresso para navegar até sua porta.
                  </p>
                </div>
              )}

              {geoError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-left mt-2 animate-scale-up">
                  <p className="text-xs text-red-700 font-semibold leading-relaxed">{geoError}</p>
                  <button
                    type="button"
                    onClick={handleCaptureLocation}
                    disabled={geoLoading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>🔄 TENTAR NOVAMENTE</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Método de Pagamento</label>
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
                className="w-full bg-white border border-stone-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl p-3 text-stone-850 text-sm outline-none transition-all duration-300 font-semibold cursor-pointer"
              >
                <option value="PIX">PIX</option>
                <option value="Crédito">Cartão de Crédito</option>
                <option value="Débito">Cartão de Débito</option>
                <option value="Dinheiro">Dinheiro</option>
              </select>
            </div>

            {payment === "Dinheiro" && (
              <div className="space-y-1.5 animate-scale-up">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Troco para quanto?</label>
                <input
                  placeholder="Ex: R$ 100,00"
                  value={troco}
                  onChange={(e) => setTroco(e.target.value)}
                  className="w-full bg-white border border-stone-200 focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-xl p-3 text-stone-800 text-sm outline-none transition-all duration-300 placeholder:text-stone-300"
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-stone-200/60 bg-stone-50 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-stone-600 font-semibold">
              <span>Subtotal</span>
              <span>R$ {totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-600 font-semibold">
              <span>Taxa de entrega</span>
              <span>{deliveryFee > 0 ? `R$ ${deliveryFee.toFixed(2)}` : "Grátis"}</span>
            </div>
            {distanceKm !== null && (
              <div className="flex items-center gap-2 text-[10px] text-primary font-semibold">
                <MapPin size={12} />
                <span>Distância estimada: {distanceKm.toFixed(1)} km</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-stone-200/60">
              <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Total do Pedido</span>
              <span className="text-lg font-black text-primary">R$ {totalWithDelivery.toFixed(2)}</span>
            </div>
          </div>

          {!geoData && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <span className="text-base flex-shrink-0">⚠️</span>
              <p className="text-[11px] text-amber-800 font-semibold leading-tight">
                Para continuar, compartilhe sua localização atual. Isso ajudará nosso motoboy a encontrar seu endereço com mais facilidade.
              </p>
            </div>
          )}

          <button
            onClick={send}
            disabled={isSending || !geoData}
            className={`w-full py-3.5 rounded-xl font-black transition-all duration-300 flex items-center justify-center gap-2 text-sm font-sans active:scale-98 ${
              !geoData
                ? "bg-stone-300 text-stone-500 cursor-not-allowed shadow-none"
                : "bg-primary hover:bg-primary-hover text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 cursor-pointer"
            }`}
          >
            <MessageSquare size={16} />
            <span>{isSending ? "Processando..." : "Enviar pedido no WhatsApp"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
