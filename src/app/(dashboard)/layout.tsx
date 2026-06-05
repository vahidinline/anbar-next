"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Settings,
  Layers,
  Package,
  Users,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Radar,
  ShieldCheck,
  History,
} from "lucide-react";
import Image from "next/image";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
// import type { Permission } from '@/lib/permissions';
// import { ROLE_LABELS } from '@/lib/permissions';

const NAV = [
  { to: "/", label: "پیشخوان", icon: LayoutDashboard },
  { to: "/settings", label: "تنظیمات انبار", icon: Settings, perm: "warehouses.manage" },
  { to: "/product-groups", label: "گروه کالا", icon: Layers, perm: "products.view" },
  { to: "/products", label: "کالای جدید", icon: Package, perm: "products.view" },
  { to: "/contacts", label: "طرف حساب", icon: Users, perm: "contacts.view" },
  { to: "/documents", label: "صدور سند", icon: FileText, perm: "inventory.view" },
  { to: "/traceability", label: "رهگیری کالا", icon: Radar, perm: "serials.view" },
  { to: "/reports", label: "گزارشات", icon: BarChart3, perm: "reports.view" },
  { to: "/users", label: "مدیریت کاربران", icon: ShieldCheck, perm: "users.manage" },
  { to: "/audit-logs", label: "گزارش فعالیت کاربران", icon: History, perm: "audit.view" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (stored === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        در حال بارگذاری...
      </div>
    );
  }
  if (!session?.user) return null;

  // Mocking roles/permissions for now until we move them to server actions or session callback
  const has = (perm: string) => true;
  const roles: string[] = [];
  const isActive = true;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar (right side because dir=rtl) */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 right-0 z-40 w-64 bg-sidebar text-sidebar-foreground transition-transform duration-200 flex flex-col",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        <div className="px-5 py-5 border-b border-sidebar-border flex items-center gap-3">
          <div className="size-10 rounded-lg bg-white border flex items-center justify-center p-1">
            <Image
              src={logo}
              alt="فید ایران صنعت"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm leading-tight">فید ایران صنعت</div>
            <div className="text-[11px] text-sidebar-foreground/60">مدیریت انبار</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.filter((i) => !i.perm || has(i.perm)).map((item) => {
            const active = item.to === "/" ? path === "/" : path?.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                href={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "hover:bg-sidebar-accent text-sidebar-foreground/85"
                )}
              >
                <Icon className="size-[18px]" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-sidebar-accent text-sidebar-foreground/85"
          >
            <LogOut className="size-[18px]" /> خروج از حساب
          </button>
          <div className="text-[10px] text-center text-sidebar-foreground/50 pt-1">
            طراحی و توسعه: علی میرحسینی
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 rounded-md hover:bg-muted"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <h1 className="font-semibold text-base lg:text-lg">سیستم مدیریت انبار</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="p-2 rounded-md hover:bg-muted"
              title="حالت تیره/روشن"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            {roles.length > 0 && (
              <div className="hidden md:block text-[11px] px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                {roles.join("، ")}
              </div>
            )}
            <div className="hidden sm:block text-xs text-muted-foreground px-3 py-1.5 rounded-md bg-muted">
              {session.user.email}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-x-auto">
          {!isActive ? (
            <div className="max-w-md mx-auto mt-20 text-center bg-card border rounded-xl p-8">
              <h2 className="text-lg font-bold mb-2">حساب کاربری شما غیرفعال است</h2>
              <p className="text-sm text-muted-foreground">
                برای فعال‌سازی با مدیر سیستم تماس بگیرید.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
