import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { fetchStaffProfileByEmail, type StaffRole } from "../services/staffAuth";

type Props = {
  children: React.ReactNode;
  allowedRoles?: StaffRole[];
};

const AUTH_CHECK_TIMEOUT = 10000;

export default function ProtectedRoute({
  children,
  allowedRoles = ["admin"],
}: Props) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<StaffRole | null>(null);

  useEffect(() => {
    let active = true;
    let settled = false;

    const finish = (isAuthenticated: boolean, role: StaffRole | null = null) => {
      if (!active || settled) return;
      settled = true;
      clearTimeout(timer);
      setAuthenticated(isAuthenticated);
      setUserRole(role);
      setLoading(false);
    };

    const timer = setTimeout(() => {
      console.warn(
        "Verificação de acesso excedeu o tempo limite. " +
          "Verifique sua conexão e se o projeto Supabase está ativo (não pausado)."
      );
      finish(false, null);
    }, AUTH_CHECK_TIMEOUT);

    async function checkAuth() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Erro ao obter sessão:", sessionError);
        }

        if (!session) {
          finish(false, null);
          return;
        }

        const { profile, error } = await fetchStaffProfileByEmail(session.user.email);

        if (error) {
          console.error("Erro ao verificar permissão de acesso:", error);
          finish(false, null);
          return;
        }

        if (!profile) {
          finish(false, null);
          supabase.auth.signOut().catch(() => {});
          return;
        }

        finish(true, profile.role);
      } catch (error) {
        console.error("Erro na verificação de autenticação:", error);
        finish(false, null);
      }
    }

    checkAuth();

    return () => {
      active = false;
      clearTimeout(timer);
    };
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

  if (!authenticated || !userRole) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={userRole === "waiter" ? "/garcom" : "/admin"} replace />;
  }

  return <>{children}</>;
}
