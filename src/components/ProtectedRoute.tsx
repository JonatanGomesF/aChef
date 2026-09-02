import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

type Props = {
  children: React.ReactNode;
};

export default function ProtectedRoute({
  children,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setAuthenticated(false);
          setLoading(false);
          return;
        }

        // Verifica se o usuário existe na tabela admins (com RLS restrito)
        const { data } = await supabase
          .from("admins")
          .select("email")
          .limit(1);

        const isAdmin = data && data.length > 0;

        if (!isAdmin) {
          await supabase.auth.signOut();
          setAuthenticated(false);
        } else {
          setAuthenticated(true);
        }
      } catch (error) {
        console.error("Erro na verificação de autenticação:", error);
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090909] flex flex-col items-center justify-center font-sans-montserrat">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-orange-950/30">
            <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <span className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">Verificando Acesso...</span>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/admin/login" />;
  }

  return <>{children}</>;
}