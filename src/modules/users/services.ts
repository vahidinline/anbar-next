import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/permissions";

export const usersService = {
  async listProfiles() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async listRoles() {
    const { data, error } = await supabase.from("user_roles").select("*");
    if (error) throw error;
    return data ?? [];
  },
  async setActive(id: string, isActive: boolean) {
    const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", id);
    if (error) throw error;
  },
  async assignRole(userId: string, role: AppRole) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) throw error;
  },
  async removeRole(userId: string, role: AppRole) {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role);
    if (error) throw error;
  },
};
