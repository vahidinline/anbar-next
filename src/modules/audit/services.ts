import { supabase } from "@/integrations/supabase/client";

export const auditService = {
  async list(filters: { entity?: string; action?: string; limit?: number } = {}) {
    let q: any = supabase.from("audit_logs").select("*");
    if (filters.entity) q = q.eq("entity", filters.entity);
    if (filters.action) q = q.eq("action", filters.action);
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 200);
    if (error) throw error;
    return data ?? [];
  },
};
