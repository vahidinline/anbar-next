import { supabase } from "@/integrations/supabase/client";

export type DocType = "in" | "out";

export const inventoryService = {
  async list() {
    const { data, error } = await supabase
      .from("inventory_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async create(payload: any) {
    const { data, error } = await supabase
      .from("inventory_documents")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async update(id: string, patch: any) {
    const { error } = await supabase.from("inventory_documents").update(patch).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from("inventory_documents").delete().eq("id", id);
    if (error) throw error;
  },
};

/**
 * محاسبه موجودی هر کالا از روی اسناد ورود/خروج.
 * منطق مرکزی موجودی — در گزارشات و داشبورد استفاده می‌شود.
 */
export function calculateStock(
  docs: Array<{ product_id: string | null; document_type: string; quantity: number }>,
) {
  const map = new Map<string, number>();
  for (const d of docs) {
    if (!d.product_id) continue;
    const sign = d.document_type === "in" ? 1 : -1;
    map.set(d.product_id, (map.get(d.product_id) ?? 0) + sign * Number(d.quantity ?? 0));
  }
  return map;
}
