"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Search, Package, Printer, Eye, X } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  Button,
  Input,
  Field,
  Textarea,
  Select,
  Modal,
  ConfirmDialog,
  PageHeader,
  DataTable,
  EmptyState,
} from "@/components/ui-kit";
import { formatNumber, toFaDigits } from "@/lib/persian";
import { Barcode } from "@/components/Barcode";
import { generateBarcodeSvg } from "@/lib/barcode";
import { printHtml, escapeHtml, brandHeader } from "@/lib/print";
import { matchesSearch } from "@/lib/search";
import { WarehouseCombobox } from "@/components/WarehouseCombobox";
import { fetchProductsData, saveProduct, deleteProduct, fetchProductLabelSerials } from "./actions";

const UNITS = ["عدد", "کیلوگرم", "متر", "دستگاه", "حلقه", "لیتر", "بسته"] as const;

interface Product {
  id: string;
  code: string;
  name: string;
  product_group_id: string | null;
  description: string | null;
  initial_quantity: number;
  unit: string | null;
  notes: string | null;
  barcode: string | null;
  is_serial_tracked?: boolean | null;
  tracking_notes?: string | null;
  die_material?: string | null;
  warehouse_id?: string | null;
}

const DIE_MATERIALS = [
  { value: "X46Cr13", label: "X46Cr13 (استیل ضدزنگ)" },
  { value: "20CrMnTi", label: "20CrMnTi (فولاد آلیاژی)" },
];
interface Group {
  id: string;
  title: string;
}
interface Warehouse {
  id: string;
  name: string;
}

function autoCode() {
  const t = Date.now().toString().slice(-8);
  const r = Math.floor(Math.random() * 90 + 10);
  return `P${t}${r}`;
}

export default function ProductsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const has = (p: string) => true; // Mock perms
  const canCreate = has("products.create");
  const canEdit = has("products.edit");
  const canDelete = has("products.delete");
  const [items, setItems] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    code: "",
    barcode: "",
    name: "",
    product_group_id: "",
    warehouse_id: "",
    description: "",
    initial_quantity: "0",
    unit: "عدد",
    notes: "",
    is_serial_tracked: false,
    tracking_notes: "",
    die_material: "",
  });

  type SerialRow = {
    serial_number: string;
    batch_number: string;
    proforma_number: string;
    invoice_number: string;
  };
  const emptyRow = (): SerialRow => ({
    serial_number: "",
    batch_number: "",
    proforma_number: "",
    invoice_number: "",
  });
  const [serials, setSerials] = useState<SerialRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Product | null>(null);

  // Label printing
  const [labelTarget, setLabelTarget] = useState<Product | null>(null);
  const [labelMode, setLabelMode] = useState<"print" | "preview">("print");
  const [labelOpts, setLabelOpts] = useState({
    count: "6",
    size: "medium" as "small" | "medium" | "large",
    perRow: "3",
    showName: true,
    showDesc: true,
    showBarcode: true,
    showCode: true,
    showGroup: true,
    showSerial: true,
  });
  const [labelSerials, setLabelSerials] = useState<
    Array<{ serial_number: string; status: string }>
  >([]);
  const [selectedSerials, setSelectedSerials] = useState<string[]>([]);
  const [serialSearch, setSerialSearch] = useState("");

  useEffect(() => {
    if (!labelTarget) {
      setLabelSerials([]);
      setSelectedSerials([]);
      setSerialSearch("");
      return;
    }
    if (!labelTarget.is_serial_tracked) {
      setLabelSerials([]);
      setSelectedSerials([]);
      return;
    }
    (async () => {
      const data = await fetchProductLabelSerials(labelTarget.id);
      setLabelSerials(data as any[]);
      setSelectedSerials(data.map((s) => s.serial_number));
    })();
  }, [labelTarget]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchProductsData();
      setItems(data.products as any[]);
      setGroups(data.groups as any[]);
      setWarehouses(data.warehouses as any[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (user) load();
  }, [user]);

  const openCreate = () => {
    setEditing(null);
    const code = autoCode();
    setForm({
      code,
      barcode: code,
      name: "",
      product_group_id: "",
      warehouse_id: "",
      description: "",
      initial_quantity: "0",
      unit: "عدد",
      notes: "",
      is_serial_tracked: false,
      tracking_notes: "",
      die_material: "",
    });
    setSerials([]);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      code: p.code,
      barcode: p.barcode ?? p.code,
      name: p.name,
      product_group_id: p.product_group_id ?? "",
      warehouse_id: p.warehouse_id ?? "",
      description: p.description ?? "",
      initial_quantity: String(p.initial_quantity ?? 0),
      unit: p.unit ?? "عدد",
      notes: p.notes ?? "",
      is_serial_tracked: !!p.is_serial_tracked,
      tracking_notes: p.tracking_notes ?? "",
      die_material: p.die_material ?? "",
    });
    setSerials([]);
    setOpen(true);
  };

  useEffect(() => {
    if (editing || !form.is_serial_tracked) return;
    const qty = Math.max(0, Math.floor(Number(form.initial_quantity) || 0));
    setSerials((prev) => {
      if (prev.length === qty) return prev;
      if (prev.length < qty)
        return [...prev, ...Array.from({ length: qty - prev.length }, emptyRow)];
      return prev.slice(0, qty);
    });
  }, [form.initial_quantity, form.is_serial_tracked, editing]);

  const updateSerial = (idx: number, patch: Partial<SerialRow>) => {
    setSerials((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addSerialRow = () => setSerials((prev) => [...prev, emptyRow()]);
  const removeSerialRow = (idx: number) => setSerials((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("نام کالا الزامی است");
      return;
    }
    if (!form.product_group_id) {
      toast.error("گروه کالا الزامی است");
      return;
    }
    if (!form.warehouse_id) {
      toast.error("انتخاب انبار الزامی است");
      return;
    }
    if (!form.code.trim()) {
      toast.error("کد کالا الزامی است");
      return;
    }

    if (!editing && form.is_serial_tracked) {
      const qty = Math.max(0, Math.floor(Number(form.initial_quantity) || 0));
      if (qty < 1) {
        toast.error("برای کالای دارای سریال، مقدار اولیه باید حداقل ۱ باشد");
        return;
      }
      if (serials.length !== qty) {
        toast.error(`تعداد سریال‌ها (${serials.length}) با مقدار اولیه (${qty}) مطابقت ندارد`);
        return;
      }
      const cleaned = serials.map((r) => r.serial_number.trim());
      if (cleaned.some((s) => !s)) {
        toast.error("همه ردیف‌های سریال باید مقدار داشته باشند");
        return;
      }
      const dupLocal = cleaned.find((s, i) => cleaned.indexOf(s) !== i);
      if (dupLocal) {
        toast.error(`سریال تکراری در فرم: «${dupLocal}»`);
        return;
      }
    }

    setBusy(true);
    try {
      const payload = {
        code: form.code,
        barcode: form.barcode || form.code,
        name: form.name,
        product_group_id: form.product_group_id || null,
        warehouse_id: form.warehouse_id || null,
        description: form.description || null,
        initial_quantity: Number(form.initial_quantity) || 0,
        unit: form.unit || null,
        notes: form.notes || null,
        is_serial_tracked: form.is_serial_tracked,
        tracking_notes: form.tracking_notes || null,
        die_material: form.die_material || null,
      } as any;

      if (editing) {
        payload.id = editing.id;
      } else if (form.is_serial_tracked) {
        payload.serials = serials;
      }

      await saveProduct(payload, user.id);
      toast.success(editing ? "کالا ویرایش شد" : "کالای جدید ثبت شد");
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
      await deleteProduct(del.id);
      toast.success("کالا حذف شد");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDel(null);
      setBusy(false);
    }
  };

  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.title ?? "—";
  const warehouseName = (id: string | null | undefined) =>
    warehouses.find((w) => w.id === id)?.name ?? "—";
  const filtered = items.filter(
    (p) =>
      matchesSearch(p.name, search) ||
      matchesSearch(p.code, search) ||
      matchesSearch(p.barcode, search),
  );

  const labelSizeMap: Record<string, { w: string; h: string; fs: number }> = {
    small: { w: "40mm", h: "25mm", fs: 10 },
    medium: { w: "60mm", h: "38mm", fs: 12 },
    large: { w: "80mm", h: "50mm", fs: 14 },
  };

  const buildLabelHtml = (p: Product) => {
    const perRow = Math.max(1, Math.min(8, Number(labelOpts.perRow) || 1));
    const size = labelSizeMap[labelOpts.size];
    const baseCode = p.barcode || p.code || "";
    const groupTitle = groupName(p.product_group_id);

    const renderOne = (serial?: string) => {
      const barcodeValue = serial ? `${baseCode}-${serial}` : baseCode;
      const barcodeSvg =
        labelOpts.showBarcode && barcodeValue
          ? generateBarcodeSvg(barcodeValue, {
              height: 44,
              width: 1.4,
              fontSize: 10,
              displayValue: true,
            })
          : "";
      return `
        <div class="label" style="width:${size.w};height:${size.h};font-size:${size.fs}px;">
          <div class="label-body">
            ${labelOpts.showGroup && groupTitle && groupTitle !== "—" ? `<div class="group">${escapeHtml(groupTitle)}</div>` : ""}
            ${labelOpts.showName ? `<div class="name">${escapeHtml(p.name)}</div>` : ""}
            ${labelOpts.showDesc && p.description ? `<div class="desc">${escapeHtml(p.description)}</div>` : ""}
            ${serial && labelOpts.showSerial ? `<div class="serial">S/N ${escapeHtml(serial)}</div>` : ""}
            ${labelOpts.showCode ? `<div class="code">${escapeHtml(baseCode)}</div>` : ""}
          </div>
          ${barcodeSvg ? `<div class="bc">${barcodeSvg}</div>` : ""}
        </div>`;
    };

    let labels: string[] = [];
    if (p.is_serial_tracked) {
      labels = selectedSerials.map((s) => renderOne(s));
    } else {
      const count = Math.max(1, Math.min(500, Number(labelOpts.count) || 1));
      labels = Array.from({ length: count }, () => renderOne());
    }
    const grid = `<div class="labels" style="grid-template-columns: repeat(${perRow}, ${size.w});gap:3mm;">${labels.join("")}</div>`;
    return `
      ${brandHeader(`چاپ لیبل کالا — ${p.name}`)}
      <style>
        .labels{display:grid;}
        .label{border:1.2px solid #000;padding:3px 4px;text-align:center;display:flex;flex-direction:column;justify-content:space-between;align-items:stretch;page-break-inside:avoid;background:#fff;line-height:1.15;}
        .label-body{flex:1 1 auto;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;gap:2px;overflow:hidden;min-height:0;}
        .label .group{font-size:1.35em;color:#000;font-weight:800;line-height:1.1;width:100%;overflow-wrap:anywhere;word-wrap:break-word;}
        .label .name{font-size:1.15em;color:#111;font-weight:700;line-height:1.15;width:100%;overflow-wrap:anywhere;word-wrap:break-word;}
        .label .desc{font-size:1em;color:#222;font-weight:500;line-height:1.15;width:100%;overflow-wrap:anywhere;word-wrap:break-word;}
        .label .serial{font-family:'Vazirmatn', monospace;font-weight:800;font-size:1.1em;color:#000;line-height:1.1;width:100%;border-top:1px dashed #bbb;padding-top:2px;margin-top:1px;overflow-wrap:anywhere;word-wrap:break-word;}
        .label .code{font-family:monospace;font-size:0.9em;color:#333;line-height:1.1;width:100%;overflow-wrap:anywhere;word-wrap:break-word;}
        .label .bc{margin-top:3px;flex-shrink:0;align-self:center;display:flex;justify-content:center;align-items:center;width:100%;}
        .label .bc svg{max-width:100%;height:auto;}
      </style>
      ${grid}
    `;
  };

  const handleLabelAction = () => {
    if (!labelTarget) return;
    if (labelTarget.is_serial_tracked && selectedSerials.length === 0) {
      toast.error("حداقل یک سریال نامبر برای چاپ انتخاب کنید");
      return;
    }
    const html = buildLabelHtml(labelTarget);
    if (labelMode === "print") {
      printHtml(html, `لیبل ${labelTarget.name}`);
    } else {
      const w = window.open("", "_blank", "width=900,height=700");
      if (!w) return;
      w.document
        .write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>پیش نمایش لیبل</title>
        <style>body{font-family:Tahoma;direction:rtl;margin:20px;background:#f5f5f5}</style>
        </head><body>${html}</body></html>`);
      w.document.close();
    }
    setLabelTarget(null);
  };

  return (
    <>
      <PageHeader
        title="کالاها"
        description="مدیریت کالاهای انبار"
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              کالای جدید
            </Button>
          ) : null
        }
      />
      <div className="mb-4 relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="جستجو بر اساس نام، کد یا بارکد..."
          value={search}
          onChange={(e: any) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">در حال بارگذاری...</div>
      ) : filtered.length === 0 ? (
        <EmptyState message="کالایی ثبت نشده است" icon={<Package className="size-10" />} />
      ) : (
        <DataTable
          columns={[
            "کد کالا",
            "بارکد",
            "شرح کالا",
            "گروه کالا",
            "انبار",
            "جنس کالا",
            "مقدار اولیه",
            "واحد",
            "عملیات",
          ]}
        >
          {filtered.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 font-mono text-xs">{p.code || "—"}</td>
              <td className="px-4 py-3">
                <Barcode value={p.barcode || p.code} height={28} width={1} fontSize={9} />
              </td>
              <td className="px-4 py-3 font-medium">
                {p.name}
                {p.is_serial_tracked && (
                  <span className="mr-2 inline-block px-1.5 py-0.5 rounded text-[10px] bg-primary/15 text-primary font-medium">
                    رهگیری سریال
                  </span>
                )}
              </td>
              <td className="px-4 py-3">{groupName(p.product_group_id)}</td>
              <td className="px-4 py-3 text-muted-foreground">{warehouseName(p.warehouse_id)}</td>
              <td className="px-4 py-3 text-xs font-mono">{p.die_material || "—"}</td>
              <td className="px-4 py-3">{formatNumber(p.initial_quantity)}</td>
              <td className="px-4 py-3 text-muted-foreground">{p.unit || "—"}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setLabelTarget(p);
                      setLabelMode("print");
                    }}
                    className="px-2 py-1.5"
                    title="چاپ لیبل"
                  >
                    <Printer className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setLabelTarget(p);
                      setLabelMode("preview");
                    }}
                    className="px-2 py-1.5"
                    title="پیش نمایش لیبل"
                  >
                    <Eye className="size-4" />
                  </Button>
                  {canEdit && (
                    <Button variant="ghost" onClick={() => openEdit(p)} className="px-2 py-1.5">
                      <Edit2 className="size-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      onClick={() => setDel(p)}
                      className="px-2 py-1.5 text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "ویرایش کالا" : "کالای جدید"}
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="کد کالا" required>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e: any) => setForm({ ...form, code: e.target.value })}
                  disabled={!!editing}
                  readOnly={!!editing}
                  className={editing ? "bg-muted cursor-not-allowed" : ""}
                />
                {!editing && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const c = autoCode();
                      setForm({ ...form, code: c, barcode: c });
                    }}
                  >
                    تولید
                  </Button>
                )}
              </div>
              {editing && (
                <div className="text-[11px] text-muted-foreground mt-1">
                  کد کالا پس از ثبت قابل تغییر نیست. برای تغییر، کالا را حذف و مجدداً ثبت کنید.
                </div>
              )}
            </Field>
            <Field label="واحد کالا">
              <Select
                value={form.unit}
                onChange={(e: any) => setForm({ ...form, unit: e.target.value })}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="بارکد کالا">
            <div className="flex gap-2 items-center">
              <Input
                value={form.barcode}
                onChange={(e: any) => setForm({ ...form, barcode: e.target.value })}
                placeholder="در صورت خالی بودن از کد کالا استفاده می‌شود"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm({ ...form, barcode: form.code })}
              >
                هم‌سان با کد
              </Button>
            </div>
            {(form.barcode || form.code) && (
              <div className="mt-2 flex justify-center bg-white p-2 rounded border">
                <Barcode value={form.barcode || form.code} height={40} fontSize={11} />
              </div>
            )}
          </Field>
          <Field label="شرح کالا" required>
            <Input
              value={form.name}
              onChange={(e: any) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="گروه کالا" required>
            <Select
              value={form.product_group_id}
              onChange={(e: any) => setForm({ ...form, product_group_id: e.target.value })}
            >
              <option value="">— انتخاب گروه —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="انبار" required>
            <WarehouseCombobox
              warehouses={warehouses}
              value={form.warehouse_id}
              onChange={(id) => setForm({ ...form, warehouse_id: id })}
            />
            {warehouses.length === 0 && (
              <div className="text-[11px] text-destructive mt-1">
                ابتدا از منوی «انبارها» حداقل یک انبار ایجاد کنید.
              </div>
            )}
          </Field>
          <Field label="جنس کالا">
            <Select
              value={form.die_material}
              onChange={(e: any) => setForm({ ...form, die_material: e.target.value })}
            >
              <option value="">— انتخاب جنس —</option>
              {DIE_MATERIALS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="مقدار اولیه">
            <Input
              type="number"
              step="0.01"
              dir="ltr"
              value={form.initial_quantity}
              onChange={(e: any) => setForm({ ...form, initial_quantity: e.target.value })}
            />
          </Field>
          <Field label="توضیحات">
            <Textarea
              value={form.description}
              onChange={(e: any) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="border-t pt-3 space-y-3">
            <label
              className={`flex items-center gap-2 text-sm font-medium ${editing ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
            >
              <input
                type="checkbox"
                className="size-4"
                checked={form.is_serial_tracked}
                disabled={!!editing}
                onChange={(e: any) => setForm({ ...form, is_serial_tracked: e.target.checked })}
              />
              این کالا دارای سریال نامبر است
            </label>
            {form.is_serial_tracked && (
              <div className="space-y-3 bg-primary/5 -mx-1 px-3 py-3 rounded-lg border border-primary/20">
                <div className="text-xs font-medium text-primary">تنظیمات رهگیری سریال</div>
                {editing ? (
                  <>
                    {form.tracking_notes && (
                      <Field label="توضیحات رهگیری">
                        <Textarea
                          value={form.tracking_notes}
                          readOnly
                          disabled
                          className="bg-muted cursor-not-allowed"
                        />
                      </Field>
                    )}
                    <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/30 rounded p-2 leading-6">
                      مشخصات رهگیری سریال این کالا قفل شده است و قابل ویرایش نیست. برای مدیریت
                      سریال‌ها، شماره بچ، پروفرما و اینویس به صفحه «رهگیری کالا» مراجعه کنید. در
                      صورت نیاز به تغییر اساسی، این کالا را حذف و کالای جدید ثبت کنید.
                    </div>
                  </>
                ) : (
                  <>
                    <Field label="توضیحات رهگیری">
                      <Textarea
                        value={form.tracking_notes}
                        onChange={(e: any) => setForm({ ...form, tracking_notes: e.target.value })}
                        placeholder="توضیحات مربوط به رهگیری سریال، بچ، پروفرما و ..."
                      />
                    </Field>
                    <div className="flex items-center justify-between text-xs">
                      <div className="text-muted-foreground">
                        تعداد سریال‌ها باید با مقدار اولیه (
                        {toFaDigits(
                          String(Math.max(0, Math.floor(Number(form.initial_quantity) || 0))),
                        )}
                        ) برابر باشد. ثبت شده:{" "}
                        <span className="font-bold text-foreground">
                          {toFaDigits(String(serials.length))}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addSerialRow}
                        className="text-xs px-2 py-1"
                      >
                        <Plus className="size-3" />
                        افزودن ردیف
                      </Button>
                    </div>
                    {serials.length === 0 ? (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded text-center">
                        ابتدا مقدار اولیه را وارد کنید تا ردیف‌های سریال به‌صورت خودکار ساخته شوند.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[320px] overflow-auto pl-1">
                        {serials.map((row, idx) => (
                          <div
                            key={idx}
                            className="border border-border rounded-md p-2 bg-background"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-bold text-primary">
                                سریال #{toFaDigits(String(idx + 1))}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSerialRow(idx)}
                                className="text-destructive hover:bg-destructive/10 rounded p-1"
                                title="حذف ردیف"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Field label="سریال نامبر">
                                <Input
                                  dir="ltr"
                                  className="font-mono h-8 text-xs"
                                  value={row.serial_number}
                                  onChange={(e: any) =>
                                    updateSerial(idx, { serial_number: e.target.value })
                                  }
                                  placeholder={`SN-${String(idx + 1).padStart(4, "0")}`}
                                />
                              </Field>
                              <Field label="شماره بچ">
                                <Input
                                  dir="ltr"
                                  className="font-mono h-8 text-xs"
                                  value={row.batch_number}
                                  onChange={(e: any) =>
                                    updateSerial(idx, { batch_number: e.target.value })
                                  }
                                />
                              </Field>
                              <Field label="شماره پروفرما">
                                <Input
                                  dir="ltr"
                                  className="font-mono h-8 text-xs"
                                  value={row.proforma_number}
                                  onChange={(e: any) =>
                                    updateSerial(idx, { proforma_number: e.target.value })
                                  }
                                />
                              </Field>
                              <Field label="شماره اینویس">
                                <Input
                                  dir="ltr"
                                  className="font-mono h-8 text-xs"
                                  value={row.invoice_number}
                                  onChange={(e: any) =>
                                    updateSerial(idx, { invoice_number: e.target.value })
                                  }
                                />
                              </Field>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Label Print Modal */}
      <Modal
        open={!!labelTarget}
        onClose={() => setLabelTarget(null)}
        title={labelMode === "print" ? "چاپ لیبل کالا" : "پیش نمایش لیبل"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLabelTarget(null)}>
              انصراف
            </Button>
            <Button onClick={handleLabelAction}>{labelMode === "print" ? "چاپ" : "نمایش"}</Button>
          </>
        }
      >
        {labelTarget &&
          (() => {
            const isSN = !!labelTarget.is_serial_tracked;
            const filteredSerials = labelSerials.filter(
              (s) => !serialSearch || matchesSearch(s.serial_number, serialSearch),
            );
            const allVisibleSelected =
              filteredSerials.length > 0 &&
              filteredSerials.every((s) => selectedSerials.includes(s.serial_number));
            const toggleSN = (sn: string) =>
              setSelectedSerials((prev) =>
                prev.includes(sn) ? prev.filter((x) => x !== sn) : [...prev, sn],
              );
            const toggleAllVisible = () => {
              if (allVisibleSelected)
                setSelectedSerials((prev) =>
                  prev.filter((x) => !filteredSerials.some((s) => s.serial_number === x)),
                );
              else
                setSelectedSerials((prev) =>
                  Array.from(new Set([...prev, ...filteredSerials.map((s) => s.serial_number)])),
                );
            };
            const previewSerial = isSN
              ? selectedSerials[0] || labelSerials[0]?.serial_number || ""
              : "";
            const previewBarcode = previewSerial
              ? `${labelTarget.barcode || labelTarget.code}-${previewSerial}`
              : labelTarget.barcode || labelTarget.code;
            return (
              <div className="space-y-4">
                <div className="text-sm bg-muted p-2 rounded flex items-center justify-between gap-2">
                  <div>
                    کالا: <strong>{labelTarget.name}</strong> — کد:{" "}
                    <span className="font-mono">{labelTarget.code}</span>
                  </div>
                  {isSN && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-primary/15 text-primary font-medium">
                      رهگیری سریال
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {!isSN && (
                    <Field label="تعداد چاپ" required>
                      <Input
                        type="number"
                        min="1"
                        max="500"
                        dir="ltr"
                        value={labelOpts.count}
                        onChange={(e: any) => setLabelOpts({ ...labelOpts, count: e.target.value })}
                      />
                    </Field>
                  )}
                  {isSN && (
                    <Field label="تعداد لیبل">
                      <Input
                        value={toFaDigits(String(selectedSerials.length))}
                        readOnly
                        disabled
                        className="bg-muted cursor-not-allowed text-center"
                      />
                    </Field>
                  )}
                  <Field label="سایز لیبل">
                    <Select
                      value={labelOpts.size}
                      onChange={(e: any) =>
                        setLabelOpts({ ...labelOpts, size: e.target.value as any })
                      }
                    >
                      <option value="small">کوچک (40×25)</option>
                      <option value="medium">متوسط (60×38)</option>
                      <option value="large">بزرگ (80×50)</option>
                    </Select>
                  </Field>
                  <Field label="تعداد در هر ردیف">
                    <Input
                      type="number"
                      min="1"
                      max="8"
                      dir="ltr"
                      value={labelOpts.perRow}
                      onChange={(e: any) => setLabelOpts({ ...labelOpts, perRow: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={labelOpts.showGroup}
                      onChange={(e: any) =>
                        setLabelOpts({ ...labelOpts, showGroup: e.target.checked })
                      }
                    />
                    گروه کالا
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={labelOpts.showName}
                      onChange={(e: any) =>
                        setLabelOpts({ ...labelOpts, showName: e.target.checked })
                      }
                    />
                    نام کالا
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={labelOpts.showDesc}
                      onChange={(e: any) =>
                        setLabelOpts({ ...labelOpts, showDesc: e.target.checked })
                      }
                    />
                    شرح کالا
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={labelOpts.showBarcode}
                      onChange={(e: any) =>
                        setLabelOpts({ ...labelOpts, showBarcode: e.target.checked })
                      }
                    />
                    بارکد
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={labelOpts.showCode}
                      onChange={(e: any) =>
                        setLabelOpts({ ...labelOpts, showCode: e.target.checked })
                      }
                    />
                    کد کالا
                  </label>
                  {isSN && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={labelOpts.showSerial}
                        onChange={(e: any) =>
                          setLabelOpts({ ...labelOpts, showSerial: e.target.checked })
                        }
                      />
                      سریال نامبر
                    </label>
                  )}
                </div>

                {isSN && (
                  <div className="border rounded-md">
                    <div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/40">
                      <div className="text-xs font-medium">
                        انتخاب سریال‌ها برای چاپ ({toFaDigits(String(selectedSerials.length))} /{" "}
                        {toFaDigits(String(labelSerials.length))})
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input
                          value={serialSearch}
                          onChange={(e: any) => setSerialSearch(e.target.value)}
                          placeholder="جستجوی سریال..."
                          className="h-7 text-xs w-40"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-7 text-xs px-2"
                          onClick={toggleAllVisible}
                        >
                          {allVisibleSelected ? "لغو همه" : "انتخاب همه"}
                        </Button>
                      </div>
                    </div>
                    {labelSerials.length === 0 ? (
                      <div className="text-xs text-muted-foreground p-3 text-center">
                        برای این کالا سریالی ثبت نشده است.
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/30 sticky top-0">
                            <tr className="text-right">
                              <th className="p-1.5 w-8"></th>
                              <th className="p-1.5">سریال نامبر</th>
                              <th className="p-1.5">وضعیت</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSerials.map((s) => (
                              <tr
                                key={s.serial_number}
                                className="border-t hover:bg-muted/30 cursor-pointer"
                                onClick={() => toggleSN(s.serial_number)}
                              >
                                <td className="p-1.5">
                                  <input
                                    type="checkbox"
                                    checked={selectedSerials.includes(s.serial_number)}
                                    onChange={() => toggleSN(s.serial_number)}
                                  />
                                </td>
                                <td className="p-1.5 font-mono">{s.serial_number}</td>
                                <td className="p-1.5">
                                  {s.status === "out" ? (
                                    <span className="text-destructive">خارج شده</span>
                                  ) : (
                                    <span className="text-emerald-600">موجود</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white border rounded p-3 flex flex-col items-center text-black">
                  <div className="text-xs text-muted-foreground mb-1">پیش نمایش یک لیبل:</div>
                  {labelOpts.showGroup && groupName(labelTarget.product_group_id) !== "—" && (
                    <div className="text-[10px] text-gray-700 font-semibold">
                      {groupName(labelTarget.product_group_id)}
                    </div>
                  )}
                  {labelOpts.showName && (
                    <div className="font-bold text-sm">{labelTarget.name}</div>
                  )}
                  {labelOpts.showDesc && labelTarget.description && (
                    <div className="text-[10px] text-gray-600">{labelTarget.description}</div>
                  )}
                  {labelOpts.showBarcode && (
                    <Barcode value={previewBarcode} height={36} fontSize={10} />
                  )}
                  {labelOpts.showCode && (
                    <div className="font-mono text-[10px] mt-1">{toFaDigits(labelTarget.code)}</div>
                  )}
                  {isSN && labelOpts.showSerial && previewSerial && (
                    <div className="font-mono font-extrabold text-xs mt-1 border-t border-dashed border-gray-400 pt-1 w-full text-center">
                      SN: {previewSerial}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={confirmDelete}
        busy={busy}
        message={`آیا از حذف کالای «${del?.name}» اطمینان دارید؟`}
      />
    </>
  );
}
