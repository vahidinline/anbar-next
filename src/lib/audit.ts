import { supabase } from "@/integrations/supabase/client";

export async function logAudit(params: {
  action: string;
  entity: string;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("audit_logs").insert({
      user_id: u.user.id,
      user_email: u.user.email ?? null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entity_id ?? null,
      details: (params.details as never) ?? null,
    });
  } catch {
    // silent — audit failure must not break the user action
  }
}
