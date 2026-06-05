import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, Permission, permissionsFor } from '@/lib/permissions';

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  isActive: boolean;
  has: (perm: Permission) => boolean;
  hasRole: (role: AppRole) => boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, loading: true,
  roles: [], isActive: true,
  has: () => false, hasRole: () => false,
  signOut: async () => {}, refreshRoles: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isActive, setIsActive] = useState(true);

  const loadRoles = async (uid: string) => {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', uid),
      supabase.from('profiles').select('is_active').eq('id', uid).maybeSingle(),
    ]);
    setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
    setIsActive(p?.is_active ?? true);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => { loadRoles(s.user.id); }, 0);
      } else {
        setRoles([]); setIsActive(true);
      }
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadRoles(data.session.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const perms = useMemo(() => permissionsFor(roles), [roles]);

  return (
    <Ctx.Provider value={{
      user: session?.user ?? null,
      session,
      loading,
      roles,
      isActive,
      has: (p) => perms.has(p),
      hasRole: (r) => roles.includes(r),
      signOut: async () => { await supabase.auth.signOut(); },
      refreshRoles: async () => { if (session?.user) await loadRoles(session.user.id); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
