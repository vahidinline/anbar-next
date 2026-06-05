import { supabase } from '@/integrations/supabase/client';

export const productGroupsService = {
  async list() {
    const { data, error } = await supabase
      .from('product_groups')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async create(payload: { user_id: string; title: string; description?: string | null }) {
    const { data, error } = await supabase.from('product_groups').insert(payload).select().single();
    if (error) throw error;
    return data;
  },
  async update(id: string, patch: { title?: string; description?: string | null }) {
    const { error } = await supabase.from('product_groups').update(patch).eq('id', id);
    if (error) throw error;
  },
  async remove(id: string) {
    const { error } = await supabase.from('product_groups').delete().eq('id', id);
    if (error) throw error;
  },
};
