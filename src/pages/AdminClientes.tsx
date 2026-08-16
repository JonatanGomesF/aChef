import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import AdminLayout from "../components/AdminLayout";
import { RefreshCw, Search, Download, Phone, Calendar, ShoppingBag, Trash2 } from "lucide-react";

type Customer = {
  id: number;
  name: string;
  phone: string;
  street: string;
  number: string;
  district: string;
  last_order_value: number;
  total_spent: number;
  orders_count: number;
  created_at: string;
};

export default function AdminClientes() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    setCustomers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const deleteCustomer = async (id: number) => {
    if (!confirm("Excluir este cliente? Esta ação é irreversível.")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir cliente: " + error.message);
      return;
    }
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  const exportCSV = () => {
    const headers = ["Nome","Telefone","Rua","Número","Bairro","Último Pedido","Total Gasto","Nº Pedidos","Cadastro"];
    const rows = filtered.map((c) => [
      c.name, c.phone, c.street, c.number, c.district,
      `R$ ${Number(c.last_order_value || 0).toFixed(2)}`,
      `R$ ${Number(c.total_spent || 0).toFixed(2)}`,
      c.orders_count || 0,
      new Date(c.created_at).toLocaleDateString("pt-BR"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `clientes_chefnair_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalGasto  = filtered.reduce((s, c) => s + Number(c.total_spent || 0), 0);
  const totalPedidos = filtered.reduce((s, c) => s + Number(c.orders_count || 0), 0);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-black text-xl tracking-tight">Clientes</h1>
          <p className="text-white/30 text-xs font-medium mt-0.5">{customers.length} clientes cadastrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-white hover:border-white/20 text-xs font-bold transition-all cursor-pointer">
            <Download size={13} /> CSV
          </button>
          <button onClick={load} className="p-2 rounded-xl border border-white/[0.08] text-white/40 hover:text-white hover:border-white/20 transition-all cursor-pointer">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Clientes",     value: filtered.length       },
          { label: "Receita Total",value: `R$ ${totalGasto.toFixed(2)}` },
          { label: "Total Pedidos",value: totalPedidos           },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-white/30 text-[10px] font-bold uppercase tracking-wider">{label}</div>
            <div className="text-white font-black text-lg mt-1">{loading ? "—" : value}</div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-[#c0261a]/50 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none transition-all placeholder:text-white/20"
        />
      </div>

      {/* Tabela */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Nome","Telefone","Endereço","Último Pedido","Total Gasto","Pedidos","Cadastro","Ações"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-white/30 text-[10px] font-black uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center text-white/25 py-12">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-white/25 py-12">Nenhum cliente encontrado</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-white/[0.025] transition-colors" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                  <td className="px-4 py-3 text-white font-semibold">{c.name}</td>
                  <td className="px-4 py-3">
                    <a href={`https://wa.me/55${c.phone.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-green-400 text-xs font-medium hover:underline">
                      <Phone size={11} />{c.phone}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">{c.street}, {c.number}{c.district ? ` — ${c.district}` : ""}</td>
                  <td className="px-4 py-3 text-white/70 font-semibold">R$ {Number(c.last_order_value || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="text-white font-black">R$ {Number(c.total_spent || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-white/50">
                      <ShoppingBag size={11} />
                      <span className="font-bold">{c.orders_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-white/30 text-xs">
                      <Calendar size={11} />
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteCustomer(c.id)}
                      className="p-2 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-all cursor-pointer"
                      title="Excluir cliente"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}