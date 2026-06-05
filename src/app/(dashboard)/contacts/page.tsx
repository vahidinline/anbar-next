"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Search, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  Button,
  Input,
  Field,
  Textarea,
  Modal,
  ConfirmDialog,
  PageHeader,
  DataTable,
  EmptyState,
} from "@/components/ui-kit";
import { toFaDigits } from "@/lib/persian";
import { matchesSearch } from "@/lib/search";
import { fetchContactsData, saveContact, deleteContact } from "./actions";

interface Contact {
  id: string;
  name: string;
  mobile: string | null;
  phone: string | null;
  address: string | null;
}

export default function ContactsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState({ name: "", mobile: "", phone: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Contact | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchContactsData();
      setItems(data as unknown as Contact[]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", mobile: "", phone: "", address: "" });
    setOpen(true);
  };
  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({
      name: c.name,
      mobile: c.mobile ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("نام طرف حساب الزامی است");
      return;
    }
    setBusy(true);
    try {
      await saveContact(
        {
          id: editing?.id,
          ...form,
        },
        user.id,
      );
      toast.success(editing ? "طرف حساب ویرایش شد" : "طرف حساب جدید ثبت شد");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!del) return;
    setBusy(true);
    try {
      await deleteContact(del.id);
      toast.success("طرف حساب حذف شد");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDel(null);
      setBusy(false);
    }
  };

  const filtered = items.filter(
    (c) =>
      matchesSearch(c.name, search) ||
      matchesSearch(c.mobile || "", search) ||
      matchesSearch(c.phone || "", search),
  );

  return (
    <>
      <PageHeader
        title="طرف حساب"
        description="مشتریان و تامین‌کنندگان"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            طرف حساب جدید
          </Button>
        }
      />
      <div className="mb-4 relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="جستجو..."
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">در حال بارگذاری...</div>
      ) : filtered.length === 0 ? (
        <EmptyState message="طرف حسابی ثبت نشده است" icon={<Users className="size-10" />} />
      ) : (
        <DataTable columns={["#", "نام طرف حساب", "شماره تماس", "تلفن", "آدرس", "عملیات"]}>
          {filtered.map((c, i) => (
            <tr key={c.id}>
              <td className="px-4 py-3">{toFaDigits(i + 1)}</td>
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3" dir="ltr">
                {toFaDigits(c.mobile ?? "—")}
              </td>
              <td className="px-4 py-3" dir="ltr">
                {toFaDigits(c.phone ?? "—")}
              </td>
              <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                {c.address || "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Button variant="ghost" onClick={() => openEdit(c)} className="px-2 py-1.5">
                    <Edit2 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setDel(c)}
                    className="px-2 py-1.5 text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "ویرایش طرف حساب" : "طرف حساب جدید"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              انصراف
            </Button>
            <Button onClick={save} disabled={busy}>
              ذخیره
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="نام طرف حساب" required>
            <Input
              value={form.name}
              onChange={(e: any) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="شماره تماس (موبایل)">
              <Input
                dir="ltr"
                value={form.mobile}
                onChange={(e: any) => setForm({ ...form, mobile: e.target.value })}
              />
            </Field>
            <Field label="تلفن ثابت">
              <Input
                dir="ltr"
                value={form.phone}
                onChange={(e: any) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
          <Field label="آدرس">
            <Textarea
              value={form.address}
              onChange={(e: any) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={confirmDelete}
        busy={busy}
        message={`آیا از حذف «${del?.name}» اطمینان دارید؟`}
      />
    </>
  );
}
