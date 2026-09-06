import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { ChefHat, Mail, Lock, LogIn, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const navigate = useNavigate();

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) {
        if (authError.message?.toLowerCase().includes("invalid login credentials")) {
          setError("E-mail ou senha incorretos.");
        } else if (authError.message?.toLowerCase().includes("email not confirmed")) {
          setError("E-mail ainda não confirmado no Supabase.");
        } else {
          setError(authError.message || "Erro ao realizar login.");
        }
        setLoading(false);
        return;
      }

      if (!authData?.session) {
        setError("Não foi possível iniciar a sessão.");
        setLoading(false);
        return;
      }

      // Verifica se o usuário autenticado está na tabela admins
      const { data: adminData } = await supabase
        .from("admins")
        .select("email")
        .limit(1);

      if (!adminData || adminData.length === 0) {
        await supabase.auth.signOut();
        setError("Acesso restrito: Seu e-mail não possui permissão de administrador na tabela public.admins.");
        setLoading(false);
        return;
      }

      setLoading(false);
      navigate("/admin");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro inesperado ao realizar login.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] flex items-center justify-center px-4 font-sans-montserrat">
      {/* Glow de fundo */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_60%,rgba(250,100,0,0.15)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div
          className="rounded-2xl p-8 space-y-6"
          style={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(12px)" }}
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white p-1 flex items-center justify-center shadow-lg shadow-orange-950/40 border border-orange-500/30">
              <img src="/logo.png" alt="Sabor da Praia" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <h1 className="text-white font-black text-xl tracking-tight">
                Sabor<span className="text-[#FF7A00] ml-1">da Praia</span>
              </h1>
              <p className="text-[#FFB703] text-[10px] font-black tracking-[0.2em] mt-0.5 uppercase">Painel Administrativo</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Form */}
          <form onSubmit={login} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">E-mail</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@saborporcao.com"
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary/60 focus:ring-1 focus:ring-primary/20 rounded-xl pl-9 pr-4 py-3 text-white text-sm outline-none transition-all duration-200 placeholder:text-white/20"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <label className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">Senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-primary/60 focus:ring-1 focus:ring-primary/20 rounded-xl pl-9 pr-10 py-3 text-white text-sm outline-none transition-all duration-200 placeholder:text-white/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors cursor-pointer"
                >
                  {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="text-[11px] text-red-400 font-semibold bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-60 text-white font-black text-sm tracking-wider uppercase rounded-xl py-3.5 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-orange-950/30 cursor-pointer overflow-hidden relative"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <LogIn size={16} className="relative z-10" />
              <span className="relative z-10">{loading ? "Entrando..." : "Entrar"}</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-[10px] font-semibold mt-4">
          © {new Date().getFullYear()} Sabor da Praia Delivery — Acesso restrito
        </p>
      </div>
    </div>
  );
}