import { supabase } from "./supabase";

export type StaffRole = "admin" | "waiter";

export type StaffProfile = {
  email: string;
  role: StaffRole;
  displayName: string;
};

type AdminRow = {
  email: string;
  role?: string | null;
  display_name?: string | null;
};

function isMissingRoleColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  const code = String(err.code || "").toUpperCase();
  const msg = String(err.message || "").toLowerCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    msg.includes("column admins.role does not exist") ||
    msg.includes("could not find the 'role' column")
  );
}

export async function fetchStaffProfileByEmail(
  email?: string | null
): Promise<{ profile: StaffProfile | null; error: { message: string } | null }> {
  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) {
    return { profile: null, error: null };
  }

  const { data, error } = await supabase
    .from("admins")
    .select("email, role, display_name")
    .ilike("email", cleanEmail)
    .limit(1);

  if (error && isMissingRoleColumnError(error)) {
    // Fallback compatível caso o SQL de cargos ainda não tenha sido executado
    const fallback = await supabase
      .from("admins")
      .select("email")
      .ilike("email", cleanEmail)
      .limit(1);

    if (fallback.error) {
      return { profile: null, error: { message: fallback.error.message } };
    }

    const row = (fallback.data?.[0] as AdminRow | undefined) || null;
    if (!row) return { profile: null, error: null };

    return {
      profile: {
        email: row.email,
        role: "admin",
        displayName: "",
      },
      error: null,
    };
  }

  if (error) {
    return { profile: null, error: { message: error.message } };
  }

  const row = (data?.[0] as AdminRow | undefined) || null;
  if (!row) {
    return { profile: null, error: null };
  }

  const role: StaffRole = row.role === "waiter" ? "waiter" : "admin";
  return {
    profile: {
      email: row.email,
      role,
      displayName: row.display_name || "",
    },
    error: null,
  };
}

