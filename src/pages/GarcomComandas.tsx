import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BalcaoModal from "../components/BalcaoModal";
import { supabase } from "../services/supabase";
import { fetchStaffProfileByEmail, type StaffRole } from "../services/staffAuth";

export default function GarcomComandas() {
  const navigate = useNavigate();
  const [staffRole, setStaffRole] = useState<StaffRole>("waiter");
  const [staffLabel, setStaffLabel] = useState<string>("");

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active || !session?.user?.email) return;
      const { profile } = await fetchStaffProfileByEmail(session.user.email);
      if (!active || !profile) return;
      setStaffRole(profile.role);
      setStaffLabel(profile.displayName || profile.email);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/garcom/login");
  };

  return (
    <div className="min-h-[100dvh] bg-[#121212]">
      <BalcaoModal
        open={true}
        embedded={true}
        staffRole={staffRole}
        staffLabel={staffLabel}
        onLogout={handleLogout}
        onClose={() => {
          if (staffRole === "admin") {
            navigate("/admin");
          }
        }}
      />
    </div>
  );
}

