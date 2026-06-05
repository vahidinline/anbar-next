"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Search,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Printer,
  ListOrdered,
} from "lucide-react";
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
  Badge,
  Card,
} from "@/components/ui-kit";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { matchesSearch } from "@/lib/search";
import { WarehouseCombobox } from "@/components/WarehouseCombobox";
import { formatJalali, formatNumber, toFaDigits } from "@/lib/persian";
import { printHtml, escapeHtml, brandHeader } from "@/lib/print";
import {
  fetchDocumentsData,
  fetchProductSerials,
  fetchDocumentSerials,
  saveDocument,
  deleteDocument,
} from "./actions";

interface ProductOpt {
  id: string;
  code: string;
  name: string;
  product_group_id: string | null;
}
function ProductCombobox({
  products,
  groupMap,
  value,
  onChange,
}: {
  products: ProductOpt[];
  groupMap: Record<string, string>;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = products.find((p) => p.id === value);
  const selLabel = selected
    ? `${groupMap[selected.product_group_id ?? ""] ?? "—"} | ${selected.name}${selected.code ? " | " + selected.code : ""}`
    : "";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm text-right hover:bg-accent/30 transition"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selLabel : "— انتخاب کالا —"}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ms-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width] min-w-[340px]"
        align="start"
        dir="rtl"
      >
        <Command
          shouldFilter={true}
          filter={(val, search) => {
            return matchesSearch(val, search) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="جستجو: گروه، شرح، کد..." className="text-right" />
          <CommandList className="max-h-72">
            <CommandEmpty>کالایی یافت نشد</CommandEmpty>
            <CommandGroup>
              {products.map((p) => {
                const g = groupMap[p.product_group_id ?? ""] ?? "—";
                const composite = `${g} | ${p.name} | ${p.code ?? ""}`;
                return (
                  <CommandItem
                    key={p.id}
                    value={composite}
                    onSelect={() => {
                      onChange(p.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("me-2 h-4 w-4", value === p.id ? "opacity-100" : "opacity-0")}
                    />
                    <div className="flex-1 grid grid-cols-[1fr_1.4fr_auto] gap-2 text-right items-center">
                      <span className="font-semibold text-foreground truncate">{g}</span>
                      <span className="text-foreground/90 truncate">{p.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{p.code}</span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Interfaces
interface Doc {
  id: string;
  doc_number: number;
  document_type: "incoming" | "outgoing";
  contact_id: string | null;
  product_id: string | null;
  product_group_id: string | null;
  warehouse_id: string | null;
  quantity: number;
  unit: string | null;
  document_date: string;
  description: string | null;
}
interface Product {
  id: string;
  code: string;
  name: string;
  product_group_id: string | null;
  unit: string | null;
  initial_quantity: number;
  is_serial_tracked?: boolean | null;
  warehouse_id?: string | null;
}
interface Group {
  id: string;
  title: string;
}
interface Contact {
  id: string;
  name: string;
}
interface Warehouse {
  id: string;
  name: string;
}

export default function DocumentsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const has = (p: string) => true; // Mock perms
  const canCreate = has("inventory.create");
  const canEdit = has("inventory.edit");
  const canDelete = has("inventory.delete");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [productSerials, setProductSerials] = useState<any[]>([]);
  const [serialSearch, setSerialSearch] = useState("");
  const [viewSerialsDoc, setViewSerialsDoc] = useState<Doc | null>(null);
  const [viewSerialsList, setViewSerialsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "incoming" | "outgoing">("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Doc | null>(null);

  const [form, setForm] = useState({
    document_type: "incoming" as "incoming" | "outgoing",
    contact_id: "",
    product_id: "",
    warehouse_id: "",
    quantity: "",
    document_date: new Date().toISOString().slice(0, 10),
    description: "",
    serials: "",
    batch_number: "",
    proforma_number: "",
    invoice_number: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchDocumentsData();
      setDocs(data.docs as any[]);
      setProducts(data.products as any[]);
      setGroups(data.groups as any[]);
      setContacts(data.contacts as any[]);
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

  useEffect(() => {
    const pid = form.product_id;
    const p = pid ? products.find((x) => x.id === pid) : null;
    if (!pid || !p?.is_serial_tracked) {
      setProductSerials([]);
      return;
    }
    fetchProductSerials(pid).then((data) => setProductSerials(data as any[]));
  }, [form.product_id, products]);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const groupMap = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g.title])), [groups]);
  const contactMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c.name])),
    [contacts],
  );
  const warehouseMap = useMemo(
    () => Object.fromEntries(warehouses.map((w) => [w.id, w.name])),
    [warehouses],
  );

  const selectedProduct = form.product_id ? productMap[form.product_id] : null;
  const autoGroup = selectedProduct ? (groupMap[selectedProduct.product_group_id ?? ""] ?? "") : "";
  const autoUnit = selectedProduct?.unit ?? "";

  const currentStock = useMemo(() => {
    if (!selectedProduct) return 0;
    const wid = form.warehouse_id || null;
    const initial =
      (selectedProduct.warehouse_id ?? null) === wid
        ? Number(selectedProduct.initial_quantity ?? 0)
        : 0;
    const sum = docs.reduce((acc, d) => {
      if (d.product_id !== selectedProduct.id) return acc;
      if ((d.warehouse_id ?? null) !== wid) return acc;
      return acc + (d.document_type === "incoming" ? Number(d.quantity) : -Number(d.quantity));
    }, 0);
    return initial + sum;
  }, [selectedProduct, docs, form.warehouse_id]);

  const openCreate = () => {
    setForm({
      document_type: "incoming",
      contact_id: "",
      product_id: "",
      warehouse_id: "",
      quantity: "",
      document_date: new Date().toISOString().slice(0, 10),
      description: "",
      serials: "",
      batch_number: "",
      proforma_number: "",
      invoice_number: "",
    });
    setSerialSearch("");
    setOpen(true);
  };

  const parseSerials = (raw: string): string[] =>
    raw
      .split(/[\n,،;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const toggleOutgoingSerial = (sn: string) => {
    const cur = parseSerials(form.serials);
    const i = cur.indexOf(sn);
    if (i >= 0) cur.splice(i, 1);
    else cur.push(sn);
    setForm({ ...form, serials: cur.join("\n") });
  };

  const openSerialsViewer = async (d: Doc) => {
    setViewSerialsDoc(d);
    setViewSerialsList([]);
    const data = await fetchDocumentSerials(d.id, d.document_type);
    setViewSerialsList(data as any[]);
  };

  const save = async () => {
    if (!user) return;
    if (!form.product_id) {
      toast.error("انتخاب کالا الزامی است");
      return;
    }
    if (!form.warehouse_id) {
      toast.error("انتخاب انبار الزامی است");
      return;
    }
    const product = productMap[form.product_id];
    const isSerial = !!product?.is_serial_tracked;
    const serials = isSerial ? parseSerials(form.serials) : [];
    const qty = isSerial ? serials.length : Number(form.quantity);

    if (isSerial) {
      if (serials.length === 0) {
        toast.error("حداقل یک سریال نامبر وارد کنید");
        return;
      }
      const dup = serials.find((s, i) => serials.indexOf(s) !== i);
      if (dup) {
        toast.error(`سریال تکراری در ورودی: ${dup}`);
        return;
      }
    } else {
      if (!qty || qty <= 0) {
        toast.error("مقدار باید بزرگتر از صفر باشد");
        return;
      }
    }
    if (form.document_type === "outgoing") {
      if (currentStock <= 0) {
        toast.error("این کالا در انبار انتخاب شده موجود نیست");
        return;
      }
      if (qty > currentStock) {
        toast.error(
          `موجودی انبار انتخاب شده کافی نیست. موجودی فعلی: ${formatNumber(currentStock)}`,
        );
        return;
      }
    }

    setBusy(true);
    try {
      await saveDocument(
        {
          ...form,
          quantity: qty,
          isSerial,
          serials,
        },
        user.id,
      );

      toast.success("سند با موفقیت ثبت شد");
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!del || !user) return;
    setBusy(true);
    try {
      await deleteDocument(del.id, del.document_type, del.doc_number, user.id);
      toast.success("سند حذف شد");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDel(null);
      setBusy(false);
    }
  };

  const printIssueSlip = async (d: Doc) => {
    const p = productMap[d.product_id ?? ""];
    const cname = contactMap[d.contact_id ?? ""] ?? "—";
    const gname = groupMap[d.product_group_id ?? ""] ?? "—";

    let serialsHtml = "";
    if (p?.is_serial_tracked) {
      const sns = await fetchDocumentSerials(d.id, "outgoing");
      const list = (sns ?? []) as any[];
      if (list.length) {
        serialsHtml = `
          <div style="margin-top:14px;font-weight:700;font-size:13px;">لیست سریال نامبرهای خروج شده (${escapeHtml(toFaDigits(list.length))} مورد)</div>
          <table style="margin-top:6px;">
            <thead><tr><th>ردیف</th><th>سریال نامبر</th><th>شماره بچ</th><th>پروفرما</th><th>اینویس</th><th>انبار</th></tr></thead>
            <tbody>
              ${list
                .map(
                  (s, i) => `
                <tr>
                  <td>${escapeHtml(toFaDigits(i + 1))}</td>
                  <td style="font-family:monospace;">${escapeHtml(s.serial_number)}</td>
                  <td>${escapeHtml(s.batch_number ?? "—")}</td>
                  <td>${escapeHtml(s.proforma_number ?? "—")}</td>
                  <td>${escapeHtml(s.invoice_number ?? "—")}</td>
                  <td>${escapeHtml(warehouseMap[s.warehouse_id ?? ""] ?? "—")}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        `;
      }
    }

    const html = `
      ${brandHeader("حواله خروج انبار")}
      <div class="meta">
        <div><b>شماره سند:</b>${escapeHtml(toFaDigits(d.doc_number))}</div>
        <div><b>تاریخ:</b>${escapeHtml(formatJalali(d.document_date))}</div>
        <div><b>طرف حساب:</b>${escapeHtml(cname)}</div>
        <div><b>نوع سند:</b>خروجی</div>
        <div><b>صادر کننده:</b>${escapeHtml(user?.email ?? "—")}</div>
        <div><b>انبار:</b>انبار مرکزی</div>
      </div>
      <table>
        <thead><tr><th>ردیف</th><th>نام کالا</th><th>گروه کالا</th><th>تعداد</th><th>واحد</th><th>شرح کالا</th></tr></thead>
        <tbody>
          <tr>
            <td>${escapeHtml(toFaDigits(1))}</td>
            <td>${escapeHtml(p?.name ?? "—")}</td>
            <td>${escapeHtml(gname)}</td>
            <td>${escapeHtml(formatNumber(d.quantity))}</td>
            <td>${escapeHtml(d.unit ?? "—")}</td>
            <td>${escapeHtml(d.description ?? "—")}</td>
          </tr>
        </tbody>
      </table>
      ${serialsHtml}
      <div class="notes"><b>توضیحات:</b> ${escapeHtml(d.description ?? "—")}</div>
      <div class="footer">
        <div class="sign">امضا انباردار</div>
        <div class="sign">امضا تحویل گیرنده</div>
        <div class="sign">امضا تایید کننده</div>
      </div>
    `;
    printHtml(html, `حواله خروج ${d.doc_number}`);
  };

  const filtered = docs.filter((d) => {
    if (filterType !== "all" && d.document_type !== filterType) return false;
    if (!search) return true;
    const pname = productMap[d.product_id ?? ""]?.name ?? "";
    const pcode = productMap[d.product_id ?? ""]?.code ?? "";
    const cname = contactMap[d.contact_id ?? ""] ?? "";
    return (
      matchesSearch(pname, search) ||
      matchesSearch(pcode, search) ||
      matchesSearch(cname, search) ||
      matchesSearch(String(d.doc_number), search)
    );
  });

  return (
    <>
      <PageHeader
        title="صدور سند"
        description="ثبت اسناد ورود و خروج کالا"
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              سند جدید
            </Button>
          ) : null
        }
      />

      <Card className="p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="جستجو در اسناد..."
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select
          value={filterType}
          onChange={(e: any) => setFilterType(e.target.value as any)}
          className="max-w-[180px]"
        >
          <option value="all">همه اسناد</option>
          <option value="incoming">ورودی</option>
          <option value="outgoing">خروجی</option>
        </Select>
      </Card>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">در حال بارگذاری...</div>
      ) : filtered.length === 0 ? (
        <EmptyState message="سندی ثبت نشده است" icon={<FileText className="size-10" />} />
      ) : (
        <DataTable
          columns={[
            "شماره سند",
            "نوع سند",
            "کالا",
            "گروه کالا",
            "طرف حساب",
            "مقدار",
            "واحد",
            "تاریخ",
            "توضیحات",
            "عملیات",
          ]}
        >
          {filtered.map((d) => {
            const p = productMap[d.product_id ?? ""];
            return (
              <tr key={d.id}>
                <td className="px-4 py-3 font-mono">{toFaDigits(d.doc_number)}</td>
                <td className="px-4 py-3">
                  {d.document_type === "incoming" ? (
                    <Badge tone="success">
                      <ArrowDownToLine className="size-3 ml-1" />
                      ورودی
                    </Badge>
                  ) : (
                    <Badge tone="destructive">
                      <ArrowUpFromLine className="size-3 ml-1" />
                      خروجی
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 font-medium">{p?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {groupMap[d.product_group_id ?? ""] ?? "—"}
                </td>
                <td className="px-4 py-3">{contactMap[d.contact_id ?? ""] ?? "—"}</td>
                <td className="px-4 py-3 font-medium">{formatNumber(d.quantity)}</td>
                <td className="px-4 py-3 text-muted-foreground">{d.unit || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatJalali(d.document_date)}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">
                  {d.description || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {p?.is_serial_tracked && (
                      <Button
                        variant="ghost"
                        onClick={() => openSerialsViewer(d)}
                        className="px-2 py-1.5"
                        title="نمایش سریال‌ها"
                      >
                        <ListOrdered className="size-4" />
                      </Button>
                    )}
                    {d.document_type === "outgoing" && (
                      <Button
                        variant="ghost"
                        onClick={() => printIssueSlip(d)}
                        className="px-2 py-1.5"
                        title="چاپ حواله خروج"
                      >
                        <Printer className="size-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="ghost"
                        onClick={() => setDel(d)}
                        className="px-2 py-1.5 text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="سند انبار جدید"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              انصراف
            </Button>
            <Button onClick={save} disabled={busy}>
              ثبت سند
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="نوع سند" required>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, document_type: "incoming" })}
                className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${form.document_type === "incoming" ? "bg-success text-success-foreground border-success" : "bg-card hover:bg-muted"}`}
              >
                ورودی
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, document_type: "outgoing" })}
                className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${form.document_type === "outgoing" ? "bg-destructive text-destructive-foreground border-destructive" : "bg-card hover:bg-muted"}`}
              >
                خروجی
              </button>
            </div>
          </Field>

          <Field label="طرف حساب">
            <Select
              value={form.contact_id}
              onChange={(e: any) => setForm({ ...form, contact_id: e.target.value })}
            >
              <option value="">— انتخاب کنید —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="انبار" required>
            <WarehouseCombobox
              warehouses={warehouses}
              value={form.warehouse_id}
              onChange={(id: any) => setForm({ ...form, warehouse_id: id })}
            />
          </Field>

          <Field label="کالا" required>
            <ProductCombobox
              products={products}
              groupMap={groupMap}
              value={form.product_id}
              onChange={(id) => setForm({ ...form, product_id: id })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="گروه کالا (خودکار)">
              <Input value={autoGroup} readOnly className="bg-muted/50" />
            </Field>
            <Field label="واحد (خودکار)">
              <Input value={autoUnit} readOnly className="bg-muted/50" />
            </Field>
          </div>

          {selectedProduct && (
            <div
              className={`text-xs px-3 py-2 rounded-lg ${form.document_type === "outgoing" && Number(form.quantity) > currentStock ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}
            >
              موجودی فعلی:{" "}
              <strong>
                {formatNumber(currentStock)} {autoUnit}
              </strong>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="مقدار" required>
              <Input
                type="number"
                step="0.01"
                dir="ltr"
                value={
                  selectedProduct?.is_serial_tracked
                    ? String(parseSerials(form.serials).length)
                    : form.quantity
                }
                onChange={(e: any) => setForm({ ...form, quantity: e.target.value })}
                readOnly={!!selectedProduct?.is_serial_tracked}
                className={selectedProduct?.is_serial_tracked ? "bg-muted/50" : ""}
              />
              {selectedProduct?.is_serial_tracked && (
                <span className="text-[11px] text-muted-foreground">
                  مقدار از تعداد سریال‌ها محاسبه می‌شود
                </span>
              )}
            </Field>
            <Field label="تاریخ سند" required>
              <Input
                type="date"
                dir="ltr"
                value={form.document_date}
                onChange={(e: any) => setForm({ ...form, document_date: e.target.value })}
              />
              {form.document_date && (
                <span className="text-[11px] text-muted-foreground">
                  معادل شمسی: {formatJalali(form.document_date)}
                </span>
              )}
            </Field>
          </div>

          {selectedProduct?.is_serial_tracked && (
            <div className="border-t pt-3 space-y-3 bg-primary/5 -mx-1 px-3 py-3 rounded-lg">
              <div className="text-sm font-bold flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary"></span>
                {form.document_type === "incoming"
                  ? "ثبت سریال نامبرهای ورودی"
                  : "انتخاب سریال نامبرهای خروج"}
              </div>

              {form.document_type === "incoming" && (
                <>
                  <Field label="سریال نامبرها" required>
                    <Textarea
                      dir="ltr"
                      className="font-mono text-xs"
                      value={form.serials}
                      onChange={(e: any) => setForm({ ...form, serials: e.target.value })}
                      placeholder={
                        "هر سریال در یک خط، یا با کاما جدا کنید\nمثال:\nSN-001\nSN-002\nSN-003"
                      }
                    />
                    <span className="text-[11px] text-muted-foreground">
                      تعداد وارد شده: {toFaDigits(parseSerials(form.serials).length)}
                    </span>
                  </Field>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="شماره بچ">
                      <Input
                        value={form.batch_number}
                        onChange={(e: any) => setForm({ ...form, batch_number: e.target.value })}
                      />
                    </Field>
                    <Field label="شماره پروفرما">
                      <Input
                        value={form.proforma_number}
                        onChange={(e: any) => setForm({ ...form, proforma_number: e.target.value })}
                      />
                    </Field>
                    <Field label="شماره اینویس">
                      <Input
                        value={form.invoice_number}
                        onChange={(e: any) => setForm({ ...form, invoice_number: e.target.value })}
                      />
                    </Field>
                  </div>
                </>
              )}

              {form.document_type === "outgoing" &&
                (() => {
                  const available = productSerials.filter((s: any) => s.status === "available");
                  const visible = serialSearch.trim()
                    ? available.filter(
                        (s: any) =>
                          matchesSearch(s.serial_number, serialSearch) ||
                          matchesSearch(s.batch_number, serialSearch) ||
                          matchesSearch(s.proforma_number, serialSearch) ||
                          matchesSearch(s.invoice_number, serialSearch),
                      )
                    : available;
                  const selected = new Set(parseSerials(form.serials));

                  if (available.length === 0) {
                    return (
                      <div className="text-xs text-destructive">
                        هیچ سریال در دسترسی برای این کالا یافت نشد.
                      </div>
                    );
                  }

                  const allVisibleSelected =
                    visible.length > 0 && visible.every((s: any) => selected.has(s.serial_number));
                  const toggleAllVisible = () => {
                    const next = new Set(selected);
                    if (allVisibleSelected)
                      visible.forEach((s: any) => next.delete(s.serial_number));
                    else visible.forEach((s: any) => next.add(s.serial_number));
                    setForm({ ...form, serials: Array.from(next).join("\n") });
                  };

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                          <Input
                            value={serialSearch}
                            onChange={(e: any) => setSerialSearch(e.target.value)}
                            placeholder="جستجو در سریال، بچ، پروفرما، اینویس..."
                            className="pr-9 h-9 text-xs"
                          />
                        </div>
                        <Badge tone="default">
                          انتخاب شده: {toFaDigits(selected.size)} / {toFaDigits(available.length)}
                        </Badge>
                      </div>
                      <div className="max-h-72 overflow-y-auto border rounded bg-background">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/60 sticky top-0">
                            <tr>
                              <th className="px-2 py-2 text-right w-8">
                                <input
                                  type="checkbox"
                                  checked={allVisibleSelected}
                                  onChange={toggleAllVisible}
                                />
                              </th>
                              <th className="px-2 py-2 text-right">سریال نامبر</th>
                              <th className="px-2 py-2 text-right">شماره بچ</th>
                              <th className="px-2 py-2 text-right">پروفرما</th>
                              <th className="px-2 py-2 text-right">اینویس</th>
                              <th className="px-2 py-2 text-right">انبار</th>
                              <th className="px-2 py-2 text-right">وضعیت</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visible.map((s: any) => {
                              const isSel = selected.has(s.serial_number);
                              return (
                                <tr
                                  key={s.id}
                                  onClick={() => toggleOutgoingSerial(s.serial_number)}
                                  className={`border-t cursor-pointer hover:bg-primary/10 ${isSel ? "bg-primary/5" : ""}`}
                                >
                                  <td className="px-2 py-1.5">
                                    <input type="checkbox" checked={isSel} readOnly />
                                  </td>
                                  <td className="px-2 py-1.5 font-mono">{s.serial_number}</td>
                                  <td className="px-2 py-1.5 font-mono">{s.batch_number || "—"}</td>
                                  <td className="px-2 py-1.5 font-mono">
                                    {s.proforma_number || "—"}
                                  </td>
                                  <td className="px-2 py-1.5 font-mono">
                                    {s.invoice_number || "—"}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {warehouseMap[s.warehouse_id ?? ""] ?? "—"}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <Badge tone="success">آماده</Badge>
                                  </td>
                                </tr>
                              );
                            })}
                            {visible.length === 0 && (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-2 py-4 text-center text-muted-foreground"
                                >
                                  نتیجه‌ای مطابق جستجو یافت نشد
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        مقدار سند به‌صورت خودکار برابر تعداد سریال‌های انتخاب‌شده محاسبه می‌شود.
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}

          <Field label="توضیحات">
            <Textarea
              value={form.description}
              onChange={(e: any) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!viewSerialsDoc}
        onClose={() => {
          setViewSerialsDoc(null);
          setViewSerialsList([]);
        }}
        title={
          viewSerialsDoc
            ? `سریال‌های سند شماره ${toFaDigits(viewSerialsDoc.doc_number)}`
            : "سریال‌ها"
        }
      >
        {viewSerialsDoc && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              {productMap[viewSerialsDoc.product_id ?? ""]?.name ?? "—"} — تعداد:{" "}
              {toFaDigits(viewSerialsList.length)}
            </div>
            <div className="max-h-[60vh] overflow-y-auto border rounded">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-right">ردیف</th>
                    <th className="px-2 py-2 text-right">سریال نامبر</th>
                    <th className="px-2 py-2 text-right">بچ</th>
                    <th className="px-2 py-2 text-right">پروفرما</th>
                    <th className="px-2 py-2 text-right">اینویس</th>
                    <th className="px-2 py-2 text-right">انبار</th>
                    <th className="px-2 py-2 text-right">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {viewSerialsList.map((s, i) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-2 py-1.5">{toFaDigits(i + 1)}</td>
                      <td className="px-2 py-1.5 font-mono">{s.serial_number}</td>
                      <td className="px-2 py-1.5 font-mono">{s.batch_number || "—"}</td>
                      <td className="px-2 py-1.5 font-mono">{s.proforma_number || "—"}</td>
                      <td className="px-2 py-1.5 font-mono">{s.invoice_number || "—"}</td>
                      <td className="px-2 py-1.5">{warehouseMap[s.warehouse_id ?? ""] ?? "—"}</td>
                      <td className="px-2 py-1.5">
                        {s.status === "available" ? (
                          <Badge tone="success">آماده</Badge>
                        ) : (
                          <Badge tone="destructive">خروج‌شده</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {viewSerialsList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-2 py-6 text-center text-muted-foreground">
                        سریالی برای این سند ثبت نشده است
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        onConfirm={confirmDelete}
        busy={busy}
        message={`آیا از حذف سند شماره ${toFaDigits(del?.doc_number ?? "")} اطمینان دارید؟`}
      />
    </>
  );
}
