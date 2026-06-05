import { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import type { Permission } from '@/lib/permissions';
import { DENIED_MESSAGE } from '@/lib/permissions';
import { ShieldAlert } from 'lucide-react';

export function RequirePerm({ perm, children }: { perm: Permission; children: ReactNode }) {
  const { has, loading } = useAuth();
  if (loading) return null;
  if (!has(perm)) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-card border rounded-xl p-8 text-center">
        <ShieldAlert className="size-10 mx-auto text-destructive mb-3" />
        <h2 className="font-bold mb-1">دسترسی غیرمجاز</h2>
        <p className="text-sm text-muted-foreground">{DENIED_MESSAGE}</p>
      </div>
    );
  }
  return <>{children}</>;
}
