import { supabase } from '@/integrations/supabase/client';

export type Product = {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  barcode: string | null;
  description: string | null;
  notes: string | null;
  initial_quantity: number;
  product_group_id: string | null;
  is_serial_tracked: boolean;
  tracking_notes: string | null;
  user_id: string;
  created_at: string;
};

export const productsService = {
  async list() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Product[];
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Product | null;
  },
  async create(payload: Partial<Product> & { user_id: string; code: string; name: string }) {
    const { data, error } = await supabase.from('products').insert(payload).select().single();
    if (error) throw error;
    return data as Product;
  },
  async update(id: string, patch: Partial<Product>) {
    const { error } = await supabase.from('products').update(patch).eq('id', id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },
};
