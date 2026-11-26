import { useState, useMemo } from "react";
import { X, CheckCircle2, Receipt, AlertTriangle, Printer } from "lucide-react";
import type { Comanda, ComandaItem } from "../services/comandas";

type Props = {
  open: boolean;
  comanda: Comanda | null;
  items: ComandaItem[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (params: {
    paymentMethod: string;
    changeFor: number | null;
    notes: string;
    printReceipt: boolean;
  }) => void;
};

const PAYMENT_METHODS = [
  { id: "PIX", label: "PIX" },
  { id: "Dinheiro", label: "Dinheiro" },
  { id: "Crédito", label: "Crédito" },
  { id: "Débito", label: "Débito" },
];

export default function CloseComandaConfirmModal({
  open,
  comanda,
  items,
  isSubmitting,
  onClose,
  onConfirm,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [trocoPara, setTrocoPara] = useState("");
  const [notes, setNotes] = useState("");
  const [printReceipt, setPrintReceipt] = useState(false);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.unit_price || 0) * Number(it.quantity || 0), 0);
  }, [items]);

  const totalUnits = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  }, [items]);

  const trocoCalculado = useMemo(() => {
    if (paymentMethod !== "Dinheiro" || !trocoPara.trim()) return null;
    const parsed = parseFloat(trocoPara.replace(",", "."));
    if (isNaN(parsed)) return null;
    return parsed - totalAmount;
  }, [paymentMethod, trocoPara, totalAmount]);

  if (!open || !comanda) return null;

  const handleSubmit = () => {
    if (isSubmitting) return;

    const trocoNumber =
      paymentMethod === "Dinheiro" && trocoPara.trim()
        ? parseFloat(trocoPara.replace(",", "."))
        : null;

    if (
      paymentMethod === "Dinheiro" &&
      trocoNumber !== null &&
      !isNaN(trocoNumber) &&
      trocoNumber < totalAmount
    ) {
      alert("O valor recebido em dinheiro é menor que o total da conta.");
      return;
    }

    onConfirm({
      paymentMethod,
      changeFor: trocoNumber !== null && !isNaN(trocoNumber) ? trocoNumber : null,
      notes,
      printReceipt,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl max-h-[94dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#161616] border border-emerald-500/35 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] bg-[#1c1c1c] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Receipt size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-black text-base sm:text-lg leading-tight">
                Confirmar Fechamento
              </h3>
              <p className="text-white/50 text-xs truncate">
                {comanda.label} • {comanda.code}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Identificação destacada */}
          <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">
                Identificação da Comanda
              </span>
              <span className="text-white font-black text-lg">{comanda.label}</span>
              <span className="block text-[11px] text-white/45 mt-0.5">
                {comanda.code} • Aberta em{" "}
                {new Date(comanda.opened_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">
                Total ({totalUnits} {totalUnits === 1 ? "item" : "itens"})
              </span>
              <span className="text-emerald-400 font-black text-2xl">
                R$ {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Lista de Produtos Consumidos */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/50 block">
              Produtos Consumidos para Conferência
            </span>
            <div className="rounded-2xl border border-white/[0.08] bg-[#121212] divide-y divide-white/[0.06] max-h-56 overflow-y-auto">
              {items.map((item) => {
                const subtotal = Number(item.unit_price) * Number(item.quantity);
                return (
                  <div
                    key={item.id}
                    className="p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-bold text-sm leading-snug">
                        {item.product_name}
                        {item.product_size ? ` (${item.product_size})` : ""}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">
                        {item.quantity}x R$ {Number(item.unit_price).toFixed(2)}
                      </div>
                      {item.observation && (
                        <div className="text-[11px] text-amber-300/80 mt-0.5">
                          Obs: {item.observation}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-emerald-400 font-black text-sm">
                        R$ {subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-white/50 block">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`py-3 px-3 rounded-xl text-sm font-black transition-all cursor-pointer border ${
                    paymentMethod === method.id
                      ? "bg-primary text-white border-orange-400 shadow-lg shadow-orange-950/40"
                      : "bg-white/[0.04] text-white/65 border-white/[0.08] hover:text-white"
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          {/* Troco (Dinheiro) */}
          {paymentMethod === "Dinheiro" && (
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-white/50 block mb-1">
                  Valor recebido (R$) — Opcional
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={trocoPara}
                  onChange={(e) => setTrocoPara(e.target.value)}
                  placeholder="Ex: 100,00"
                  className="bg-[#121212] border border-white/[0.12] focus:border-emerald-500 rounded-xl px-3 py-2 text-white text-sm font-bold w-36 outline-none"
                />
              </div>
              {trocoCalculado !== null && (
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-white/50 block">
                    {trocoCalculado < 0 ? "Falta:" : "Troco a devolver:"}
                  </span>
                  <span
                    className={`font-black text-lg ${
                      trocoCalculado < 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    R$ {Math.abs(trocoCalculado).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Observação de fechamento */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-white/50 block">
              Observação final (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={comanda.notes || "Ex: Pago no caixa, divisão de conta..."}
              className="w-full bg-[#121212] border border-white/[0.1] focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none placeholder:text-white/25"
            />
          </div>

          {/* Impressão */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/75 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={printReceipt}
              onChange={(e) => setPrintReceipt(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
            />
            <Printer size={15} className="text-white/50" />
            <span className="font-semibold">Imprimir comprovante térmico após fechar</span>
          </label>

          {/* Aviso financeiro */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200/90">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              Ao confirmar, a venda de <strong>R$ {totalAmount.toFixed(2)}</strong> será registrada no
              sistema financeiro e a comanda <strong>{comanda.code}</strong> será fechada definitivamente.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-white/[0.08] bg-[#1a1a1a] flex flex-col-reverse sm:flex-row gap-2.5 flex-shrink-0">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 font-bold text-sm transition-all cursor-pointer disabled:opacity-40"
          >
            Voltar
          </button>

          <button
            type="button"
            disabled={isSubmitting || items.length === 0}
            onClick={handleSubmit}
            className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.99] text-white font-black text-base shadow-xl shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Fechando e registrando venda...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                <span>CONFIRMAR FECHAMENTO • R$ {totalAmount.toFixed(2)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

