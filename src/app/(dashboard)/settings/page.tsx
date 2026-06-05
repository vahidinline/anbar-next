"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Search, Warehouse as WhIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button, Input, Field, Textarea, Modal, ConfirmDialog, PageHeader, DataTable, EmptyState } from "@/components/ui-kit";
import { formatJalali } from "@/lib/persian";
import { matchesSearch } from "@/lib/search";
import { fetchWarehousesData, saveWarehouse, deleteWarehouse } from "./actions";

interface Warehouse { id: string; name: string; description: string | null; created_at: Date }

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [items, setItems] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Warehouse | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchWarehousesData();
      setItems(data as unknown as Warehouse[]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const openCreate = () => { setEditing(null); setName(""); setDesc(""); setOpen(true); };
  const openEdit = (w: Warehouse) => { setEditing(w); setName(w.name); setDesc(w.description ?? ""); setOpen(true); };

  const save = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error("نام انبار الزامی است"); return; }
    setBusy(true);
    try {
      await saveWarehouse({
        id: editing?.id,
        name,
        description: desc
      }, user.id);
      
      toast.success(editing ? "انبار با موفقیت ویرایش شد" : "انبار جدید ثبت شد");
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
      await deleteWarehouse(del.id);
      toast.success("انبار حذف شد");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDel(null); 
      setBusy(false);
    }
  };

  const filtered = items.filter((w) => matchesSearch(w.name, search) || matchesSearch(w.description || "", search));

  return (
    <>
      <PageHeader
        title="تنظیمات انبار"
        description="مدیریت انبارهای سازمان"
        action={<Button onClick={openCreate}><Plus className="size-4" />انبار جدید</Button>}
      />
      <div className="mb-4 relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="جستجو در انبارها..." value={search} onChange={(e: any) => setSearch(e.target.value)} className="pr-10" />
      </div>

      {loading ? <div className="text-center py-10 text-muted-foreground">در حال بارگذاری...</div>
        : filtered.length === 0
          ? <EmptyState message="هیچ انباری ثبت نشده است" icon={<WhIcon className="size-10" />} />
          : (
            <DataTable columns={["#", "نام انبار", "توضیحات", "تاریخ ثبت", "عملیات"]}>
              {filtered.map((w, i) => (
                <tr key={w.id}>
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{w.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{w.description || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatJalali(w.created_at.toISOString())}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" onClick={() => openEdit(w)} className="px-2 py-1.5"><Edit2 className="size-4" /></Button>
                      <Button variant="ghost" onClick={() => setDel(w)} className="px-2 py-1.5 text-destructive"><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "ویرایش انبار" : "انبار جدید"} footer={
        <>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>انصراف</Button>
          <Button onClick={save} disabled={busy}>ذخیره</Button>
        </>
      }>
        <div className="space-y-4">
          <Field label="نام انبار" required><Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="مثلاً: انبار سیاه سنگ" /></Field>
          <Field label="توضیحات"><Textarea value={desc} onChange={(e: any) => setDesc(e.target.value)} placeholder="توضیحات اختیاری" /></Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} onConfirm={confirmDelete} busy={busy}
        message={`آیا از حذف انبار «${del?.name}» اطمینان دارید؟ این عملیات قابل بازگشت نیست.`} />
    </>
  );
}
