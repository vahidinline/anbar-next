import { supabase } from "@/integrations/supabase/client";

export const contactsService = {
  async list() {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async create(payload: {
    user_id: string;
    name: string;
    phone?: string | null;
    mobile?: string | null;
    address?: string | null;
  }) {
    const { data, error } = await supabase.from("contacts").insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async update(
    id: string,
    patch: Partial<{
      name: string;
      phone: string | null;
      mobile: string | null;
      address: string | null;
    }>,
  ) {
    const { error } = await supabase.from("contacts").update(patch).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) throw error;
  },
};
