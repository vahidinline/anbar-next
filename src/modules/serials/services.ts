import { supabase } from "@/integrations/supabase/client";

export const serialsService = {
  async listByProduct(productId: string) {
    const { data, error } = await (supabase as any)
      .from("serial_numbers")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async search(filters: { serial?: string; batch?: string; invoice?: string; proforma?: string }) {
    let q: any = (supabase as any).from("serial_numbers").select("*");
    if (filters.serial) q = q.ilike("serial_number", `%${filters.serial}%`);
    if (filters.batch) q = q.ilike("batch_number", `%${filters.batch}%`);
    if (filters.invoice) q = q.ilike("invoice_number", `%${filters.invoice}%`);
    if (filters.proforma) q = q.ilike("proforma_number", `%${filters.proforma}%`);
    const { data, error } = await q.order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return data ?? [];
  },
  async create(payload: any) {
    const { data, error } = await (supabase as any)
      .from("serial_numbers")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async markOut(serials: string[], outgoingDocId: string) {
    const { error } = await (supabase as any)
      .from("serial_numbers")
      .update({ status: "out", outgoing_document_id: outgoingDocId })
      .in("serial_number", serials);
    if (error) throw error;
  },
};
