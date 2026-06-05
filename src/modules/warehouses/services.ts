import { supabase } from "@/integrations/supabase/client";

export const warehousesService = {
  async list() {
    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async create(payload: { user_id: string; name: string; description?: string | null }) {
    const { data, error } = await supabase.from("warehouses").insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, patch: { name?: string; description?: string | null }) {
    const { error } = await supabase.from("warehouses").update(patch).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("warehouses").delete().eq("id", id);
    if (error) throw error;
  },
};
