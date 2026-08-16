import { useState } from "react";
import { supabase } from "../services/supabase";

export default function CustomerCapture() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const saveCustomer = async () => {
    if (!name || !phone) {
      alert("Preencha nome e WhatsApp");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from("customers")
        .insert([
          {
            name,
            phone,
          },
        ]);

      if (error) {
        console.error(error);
        alert("Erro ao salvar");
        return;
      }

      alert(
        "Cadastro realizado! Você receberá promoções da Chef Nair Delivery 🍜"
      );

      setName("");
      setPhone("");
    } catch (err) {
      console.error(err);
      alert("Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-orange-600 text-white py-12">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-extrabold">
          🎁 Receba Promoções Exclusivas
        </h2>

        <p className="mt-3">
          Cadastre seu WhatsApp e receba cupons,
          descontos e novidades da Chef Nair Delivery.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <input
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            className="p-3 rounded-xl text-black"
          />

          <input
            type="tel"
            placeholder="Seu WhatsApp"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
            className="p-3 rounded-xl text-black"
          />

          <button
            onClick={saveCustomer}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 py-3 rounded-xl font-bold"
          >
            {loading
              ? "Salvando..."
              : "Quero Receber Promoções"}
          </button>
        </div>
      </div>
    </section>
  );
}