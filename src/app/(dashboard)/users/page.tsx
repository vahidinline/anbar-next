"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, UserPlus, Pencil } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  Button,
  Input,
  Field,
  Select,
  PageHeader,
  Modal,
  DataTable,
  EmptyState,
  Badge,
  Card,
} from "@/components/ui-kit";
import { ROLE_LABELS, type AppRole } from "@/lib/permissions";
import { formatJalali } from "@/lib/persian";
import { matchesSearch } from "@/lib/search";
import { fetchUsersData, saveUser, toggleUserActive, inviteUser as createNewUser } from "./actions";

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: Date;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const me = session?.user as any;
  const [rows, setRows] = useState<Profile[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("sales");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [busy, setBusy] = useState(false);

  // invite new user form
  const [showInvite, setShowInvite] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invPwd, setInvPwd] = useState("");
  const [invName, setInvName] = useState("");
  const [invPhone, setInvPhone] = useState("");
  const [invRole, setInvRole] = useState<AppRole>("sales");

  const load = async () => {
    setLoading(true);
    try {
      const { profiles, userRoles } = await fetchUsersData();
      setRows(profiles as unknown as Profile[]);
      const map: Record<string, AppRole[]> = {};
      for (const r of (userRoles ?? []) as { user_id: string; role: string }[]) {
        (map[r.user_id] ||= []).push(r.role as AppRole);
      }
      setRolesByUser(map);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    return rows.filter(
      (r) =>
        matchesSearch(r.full_name || "", q) ||
        matchesSearch(r.email || "", q) ||
        matchesSearch(r.phone || "", q),
    );
  }, [rows, q]);

  const openEdit = (p: Profile) => {
    setEditing(p);
    setEditName(p.full_name ?? "");
    setEditPhone(p.phone ?? "");
    setEditActive(p.is_active);
    setEditRole((rolesByUser[p.id]?.[0] as AppRole) ?? "sales");
  };

  const saveEdit = async () => {
    if (!editing || !me) return;
    setBusy(true);
    try {
      await saveUser(
        {
          id: editing.id,
          full_name: editName,
          phone: editPhone,
          is_active: editActive,
          role: editRole,
        },
        me.id,
      );
      toast.success("کاربر بروزرسانی شد");
      setEditing(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "خطا در ذخیره");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (p: Profile) => {
    if (!me) return;
    try {
      await toggleUserActive(p.id, p.is_active, me.id);
      toast.success(!p.is_active ? "حساب فعال شد" : "حساب غیرفعال شد");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const inviteUser = async () => {
    if (!me) return;
    if (!invEmail || !invPwd) {
      toast.error("ایمیل و رمز عبور الزامی است");
      return;
    }
    if (invPwd.length < 6) {
      toast.error("رمز باید حداقل ۶ کاراکتر باشد");
      return;
    }
    setBusy(true);
    try {
      await createNewUser(
        {
          email: invEmail,
          password: invPwd,
          full_name: invName,
          phone: invPhone,
          role: invRole,
        },
        me.id,
      );

      toast.success("کاربر جدید ایجاد شد");
      setShowInvite(false);
      setInvEmail("");
      setInvPwd("");
      setInvName("");
      setInvPhone("");
      setInvRole("sales");
      load();
    } catch (err: any) {
      toast.error(err.message || "خطا در ایجاد کاربر");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="مدیریت کاربران"
        description="افزودن، ویرایش و فعال/غیرفعال‌سازی کاربران سیستم و تخصیص نقش"
        action={
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="size-4" /> افزودن کاربر
          </Button>
        }
      />

      <Card className="p-3 mb-4">
        <div className="relative">
          <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="جستجو بر اساس نام، ایمیل یا شماره تماس..."
            value={q}
            onChange={(e: any) => setQ(e.target.value)}
          />
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">در حال بارگذاری...</div>
      ) : filtered.length === 0 ? (
        <EmptyState message="کاربری یافت نشد" />
      ) : (
        <DataTable
          columns={[
            "نام کاربر",
            "ایمیل",
            "شماره تماس",
            "نقش کاربر",
            "وضعیت حساب",
            "تاریخ عضویت",
            "عملیات",
          ]}
        >
          {filtered.map((p) => {
            const roles = rolesByUser[p.id] ?? [];
            return (
              <tr key={p.id}>
                <td className="px-4 py-2.5 font-medium">{p.full_name ?? "—"}</td>
                <td className="px-4 py-2.5 text-xs" dir="ltr">
                  {p.email ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-xs" dir="ltr">
                  {p.phone ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  {roles.length === 0 ? (
                    <Badge tone="warning">بدون نقش</Badge>
                  ) : (
                    roles.map((r) => (
                      <Badge key={r} tone="default">
                        {ROLE_LABELS[r]}
                      </Badge>
                    ))
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {p.is_active ? (
                    <Badge tone="success">فعال</Badge>
                  ) : (
                    <Badge tone="destructive">غیرفعال</Badge>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                  {formatJalali(p.created_at.toISOString())}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      className="!px-2 !py-1 text-xs"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="size-3" /> ویرایش
                    </Button>
                    <Button
                      variant={p.is_active ? "destructive" : "success"}
                      className="!px-2 !py-1 text-xs"
                      onClick={() => toggleActive(p)}
                      disabled={p.id === me?.id}
                    >
                      {p.is_active ? "غیرفعال‌سازی" : "فعال‌سازی"}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="ویرایش کاربر"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>
              انصراف
            </Button>
            <Button onClick={saveEdit} disabled={busy}>
              {busy ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="نام کاربر">
            <Input value={editName} onChange={(e: any) => setEditName(e.target.value)} />
          </Field>
          <Field label="شماره تماس">
            <Input
              dir="ltr"
              value={editPhone}
              onChange={(e: any) => setEditPhone(e.target.value)}
            />
          </Field>
          <Field label="نقش کاربر">
            <Select value={editRole} onChange={(e: any) => setEditRole(e.target.value as AppRole)}>
              <option value="admin">{ROLE_LABELS.admin}</option>
              <option value="warehouse_keeper">{ROLE_LABELS.warehouse_keeper}</option>
              <option value="sales">{ROLE_LABELS.sales}</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editActive}
              onChange={(e: any) => setEditActive(e.target.checked)}
              className="size-4"
            />
            حساب کاربری فعال است
          </label>
        </div>
      </Modal>

      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="افزودن کاربر جدید"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowInvite(false)} disabled={busy}>
              انصراف
            </Button>
            <Button onClick={inviteUser} disabled={busy}>
              {busy ? "در حال ایجاد..." : "ایجاد کاربر"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="نام کامل">
            <Input value={invName} onChange={(e: any) => setInvName(e.target.value)} />
          </Field>
          <Field label="ایمیل" required>
            <Input
              type="email"
              dir="ltr"
              value={invEmail}
              onChange={(e: any) => setInvEmail(e.target.value)}
            />
          </Field>
          <Field label="رمز عبور موقت" required>
            <Input
              type="password"
              dir="ltr"
              value={invPwd}
              onChange={(e: any) => setInvPwd(e.target.value)}
            />
          </Field>
          <Field label="شماره تماس">
            <Input dir="ltr" value={invPhone} onChange={(e: any) => setInvPhone(e.target.value)} />
          </Field>
          <Field label="نقش کاربر" required>
            <Select value={invRole} onChange={(e: any) => setInvRole(e.target.value as AppRole)}>
              <option value="sales">{ROLE_LABELS.sales}</option>
              <option value="warehouse_keeper">{ROLE_LABELS.warehouse_keeper}</option>
              <option value="admin">{ROLE_LABELS.admin}</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </>
  );
}
