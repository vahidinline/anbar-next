"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Search, Layers } from "lucide-react";
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
import { formatJalali } from "@/lib/persian";
import { matchesSearch } from "@/lib/search";
import { fetchProductGroupsData, saveProductGroup, deleteProductGroup } from "./actions";

interface Group {
  id: string;
  title: string;
  description: string | null;
  created_at: Date;
}

export default function GroupsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [items, setItems] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Group | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchProductGroupsData();
      setItems(data as unknown as Group[]);
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
    setTitle("");
    setDesc("");
    setOpen(true);
  };
  const openEdit = (g: Group) => {
    setEditing(g);
    setTitle(g.title);
    setDesc(g.description ?? "");
    setOpen(true);
  };

  const save = async (closeAfter: boolean) => {
    if (!user) return;
    if (!title.trim()) {
      toast.error("عنوان گروه کالا الزامی است");
      return;
    }
    setBusy(true);
    try {
      await saveProductGroup(
        {
          id: editing?.id,
          title,
          description: desc,
        },
        user.id,
      );
      toast.success(editing ? "گروه ویرایش شد" : "گروه جدید ثبت شد");

      load();
      if (closeAfter) setOpen(false);
      else {
        setEditing(null);
        setTitle("");
        setDesc("");
      }
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
      await deleteProductGroup(del.id);
      toast.success("گروه حذف شد");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDel(null);
      setBusy(false);
    }
  };

  const filtered = items.filter(
    (g) => matchesSearch(g.title, search) || matchesSearch(g.description || "", search),
  );

  return (
    <>
      <PageHeader
        title="گروه کالا"
        description="دسته‌بندی کالاهای انبار"
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            گروه جدید
          </Button>
        }
      />
      <div className="mb-4 relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="جستجو و ویرایش..."
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">در حال بارگذاری...</div>
      ) : filtered.length === 0 ? (
        <EmptyState message="گروهی ثبت نشده است" icon={<Layers className="size-10" />} />
      ) : (
        <DataTable columns={["#", "عنوان گروه", "توضیحات", "تاریخ", "عملیات"]}>
          {filtered.map((g, i) => (
            <tr key={g.id}>
              <td className="px-4 py-3">{i + 1}</td>
              <td className="px-4 py-3 font-medium">{g.title}</td>
              <td className="px-4 py-3 text-muted-foreground">{g.description || "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatJalali(g.created_at.toISOString())}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Button variant="ghost" onClick={() => openEdit(g)} className="px-2 py-1.5">
                    <Edit2 className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setDel(g)}
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
        title={editing ? "ویرایش گروه کالا" : "گروه کالای جدید"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              انصراف
            </Button>
            {!editing && (
              <Button variant="outline" onClick={() => save(false)} disabled={busy}>
                ذخیره و جدید
              </Button>
            )}
            <Button onClick={() => save(true)} disabled={busy}>
              ذخیره و بستن
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="عنوان گروه کالا" required>
            <Input
              value={title}
              onChange={(e: any) => setTitle(e.target.value)}
              placeholder="مثلاً: گروه SZLH 420"
            />
          </Field>
          <Field label="توضیحات">
            <Textarea value={desc} onChange={(e: any) => setDesc(e.target.value)} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={confirmDelete}
        busy={busy}
        message={`آیا از حذف گروه «${del?.title}» اطمینان دارید؟`}
      />
    </>
  );
}
