"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Radar, Printer, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { useSession } from "next-auth/react";
import { PageHeader, Card, DataTable, EmptyState, Input, Select, Field, Button, Badge, Modal, Textarea } from "@/components/ui-kit";
import { formatJalali, toFaDigits } from "@/lib/persian";
import { printHtml, escapeHtml, brandHeader } from "@/lib/print";
import { matchesSearch } from "@/lib/search";
import { fetchTraceabilityData } from "./actions";

interface Serial {
  id: string;
  serial_number: string;
  batch_number: string | null;
  proforma_number: string | null;
  invoice_number: string | null;
  status: "available" | "out" | "reserved";
  product_id: string;
  warehouse_id: string | null;
  inventory_document_id: string | null;
  outgoing_document_id: string | null;
  created_at: Date;
}
interface Product { id: string; code: string; name: string; product_group_id: string | null; die_material?: string | null; tracking_notes?: string | null; unit?: string | null }
interface Group { id: string; title: string }
interface Warehouse { id: string; name: string }
interface Doc { id: string; doc_number: number; document_date: string; document_type: "incoming" | "outgoing"; contact_id: string | null }
interface Contact { id: string; name: string }

type SearchField = "all" | "serial" | "proforma" | "invoice" | "batch" | "code";

const STATUS_LABEL: Record<string, string> = {
  available: "موجود",
  out: "خارج شده",
  reserved: "رزرو شده",
};

export default function TraceabilityPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [serials, setSerials] = useState<Serial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [field, setField] = useState<SearchField>("all");
  const [statusF, setStatusF] = useState<string>("");
  const [detail, setDetail] = useState<Serial | null>(null);
  const [detailProduct, setDetailProduct] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    fetchTraceabilityData().then(({ serials: s, products: p, groups: g, warehouses: w, docs: d, contacts: c }) => {
      setSerials(s as unknown as Serial[]);
      setProducts(p as any[]);
      setGroups(g as any[]);
      setWarehouses(w as any[]);
      setDocs(d as any[]);
      setContacts(c as any[]);
      setLoading(false);
    });
  }, [user]);

  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const groupMap = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g.title])), [groups]);
  const warehouseMap = useMemo(() => Object.fromEntries(warehouses.map((w) => [w.id, w.name])), [warehouses]);
  const docMap = useMemo(() => Object.fromEntries(docs.map((d) => [d.id, d])), [docs]);
  const contactMap = useMemo(() => Object.fromEntries(contacts.map((c) => [c.id, c.name])), [contacts]);

  const rows = useMemo(() => {
    let r = serials;
    if (statusF) r = r.filter((s) => s.status === statusF);
    if (query.trim()) {
      r = r.filter((s) => {
        const p = productMap[s.product_id];
        if (field === "serial") return matchesSearch(s.serial_number, query);
        if (field === "proforma") return matchesSearch(s.proforma_number || "", query);
        if (field === "invoice") return matchesSearch(s.invoice_number || "", query);
        if (field === "batch") return matchesSearch(s.batch_number || "", query);
        if (field === "code") return matchesSearch(p?.code || "", query);
        
        return matchesSearch(s.serial_number, query)
          || matchesSearch(s.proforma_number || "", query)
          || matchesSearch(s.invoice_number || "", query)
          || matchesSearch(s.batch_number || "", query)
          || matchesSearch(p?.code || "", query)
          || matchesSearch(p?.name || "", query);
      });
    }
    return r;
  }, [serials, query, field, statusF, productMap]);

  const exportExcel = () => {
    const data = rows.map((s) => {
      const p = productMap[s.product_id];
      const inDoc = s.inventory_document_id ? docMap[s.inventory_document_id] : null;
      const outDoc = s.outgoing_document_id ? docMap[s.outgoing_document_id] : null;
      return {
        "سریال نامبر": s.serial_number,
        "کد کالا": p?.code ?? "",
        "نام کالا": p?.name ?? "",
        "گروه کالا": groupMap[p?.product_group_id ?? ""] ?? "",
        "شماره بچ": s.batch_number ?? "",
        "شماره پروفرما": s.proforma_number ?? "",
        "شماره اینویس": s.invoice_number ?? "",
        "وضعیت": STATUS_LABEL[s.status],
        "انبار": warehouseMap[s.warehouse_id ?? ""] ?? "",
        "تاریخ ورود": inDoc ? formatJalali(inDoc.document_date) : "",
        "تاریخ خروج": outDoc ? formatJalali(outDoc.document_date) : "",
        "طرف حساب ورود": inDoc ? (contactMap[inDoc.contact_id ?? ""] ?? "") : "",
        "طرف حساب خروج": outDoc ? (contactMap[outDoc.contact_id ?? ""] ?? "") : "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    (ws as any)["!rtl"] = true;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "رهگیری کالا");
    XLSX.writeFile(wb, "رهگیری-کالا.xlsx");
  };

  const printReport = () => {
    const html = `
      ${brandHeader("گزارش رهگیری کالا")}
      <div class="meta">
        <div><b>تاریخ گزارش:</b>${escapeHtml(formatJalali(new Date().toISOString()))}</div>
        <div><b>تعداد رکورد:</b>${escapeHtml(toFaDigits(String(rows.length)))}</div>
        ${query ? `<div><b>جستجو:</b>${escapeHtml(query)}</div>` : ""}
      </div>
      <table>
        <thead><tr>
          <th>سریال</th><th>کد کالا</th><th>نام کالا</th><th>گروه</th>
          <th>پروفرما</th><th>اینویس</th><th>بچ</th>
          <th>وضعیت</th><th>انبار</th><th>تاریخ ورود</th><th>تاریخ خروج</th>
        </tr></thead>
        <tbody>
          ${rows.map((s) => {
            const p = productMap[s.product_id];
            const inDoc = s.inventory_document_id ? docMap[s.inventory_document_id] : null;
            const outDoc = s.outgoing_document_id ? docMap[s.outgoing_document_id] : null;
            return `<tr>
              <td>${escapeHtml(s.serial_number)}</td>
              <td>${escapeHtml(p?.code ?? "")}</td>
              <td>${escapeHtml(p?.name ?? "")}</td>
              <td>${escapeHtml(groupMap[p?.product_group_id ?? ""] ?? "")}</td>
              <td>${escapeHtml(s.proforma_number ?? "—")}</td>
              <td>${escapeHtml(s.invoice_number ?? "—")}</td>
              <td>${escapeHtml(s.batch_number ?? "—")}</td>
              <td>${escapeHtml(STATUS_LABEL[s.status])}</td>
              <td>${escapeHtml(warehouseMap[s.warehouse_id ?? ""] ?? "—")}</td>
              <td>${inDoc ? escapeHtml(formatJalali(inDoc.document_date)) : "—"}</td>
              <td>${outDoc ? escapeHtml(formatJalali(outDoc.document_date)) : "—"}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    `;
    printHtml(html, "گزارش رهگیری کالا");
  };

  return (
    <>
      <PageHeader
        title="رهگیری کالا"
        description="جستجوی صنعتی بر اساس سریال، پروفرما، اینویس یا بچ"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={printReport}><Printer className="size-4" />چاپ</Button>
            <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="size-4" />خروجی اکسل</Button>
          </div>
        }
      />

      <Card className="p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <Field label="جستجو">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input className="pr-10" value={query} onChange={(e: any) => setQuery(e.target.value)} placeholder="سریال، پروفرما، اینویس، بچ، کد..." />
          </div>
        </Field>
        <Field label="جستجو در">
          <Select value={field} onChange={(e: any) => setField(e.target.value as SearchField)}>
            <option value="all">همه فیلدها</option>
            <option value="serial">سریال نامبر</option>
            <option value="proforma">شماره پروفرما</option>
            <option value="invoice">شماره اینویس</option>
            <option value="batch">شماره بچ</option>
            <option value="code">کد کالا</option>
          </Select>
        </Field>
        <Field label="وضعیت">
          <Select value={statusF} onChange={(e: any) => setStatusF(e.target.value)}>
            <option value="">همه وضعیت‌ها</option>
            <option value="available">موجود</option>
            <option value="out">خارج شده</option>
            <option value="reserved">رزرو شده</option>
          </Select>
        </Field>
        <div className="flex items-end">
          <div className="text-sm text-muted-foreground">تعداد نتایج: <strong>{toFaDigits(String(rows.length))}</strong></div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">در حال بارگذاری...</div>
      ) : rows.length === 0 ? (
        <EmptyState message="رکوردی یافت نشد" icon={<Radar className="size-10" />} />
      ) : (
        <DataTable columns={["سریال نامبر", "نام کالا", "گروه", "پروفرما", "اینویس", "بچ", "وضعیت", "انبار", "تاریخ ورود", "تاریخ خروج", "طرف حساب"]}>
          {rows.map((s) => {
            const p = productMap[s.product_id];
            const inDoc = s.inventory_document_id ? docMap[s.inventory_document_id] : null;
            const outDoc = s.outgoing_document_id ? docMap[s.outgoing_document_id] : null;
            const contact = outDoc ? contactMap[outDoc.contact_id ?? ""] : (inDoc ? contactMap[inDoc.contact_id ?? ""] : "");
            return (
              <tr key={s.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => {
                setDetail(s);
                setDetailProduct(p);
              }}>
                <td className="px-4 py-3 font-mono text-xs">{s.serial_number}</td>
                <td className="px-4 py-3 font-medium">{p?.name ?? "—"} <span className="text-muted-foreground text-xs">({p?.code ?? "—"})</span></td>
                <td className="px-4 py-3 text-muted-foreground">{groupMap[p?.product_group_id ?? ""] ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.proforma_number || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.invoice_number || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.batch_number || "—"}</td>
                <td className="px-4 py-3">
                  {s.status === "available" && <Badge tone="success">موجود</Badge>}
                  {s.status === "out" && <Badge tone="destructive">خارج شده</Badge>}
                  {s.status === "reserved" && <Badge tone="warning">رزرو شده</Badge>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{warehouseMap[s.warehouse_id ?? ""] ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{inDoc ? formatJalali(inDoc.document_date) : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{outDoc ? formatJalali(outDoc.document_date) : "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{contact || "—"}</td>
              </tr>
            );
          })}
        </DataTable>
      )}

      {/* Read-only detail modal */}
      <Modal open={!!detail} onClose={() => { setDetail(null); setDetailProduct(null); }} title="جزئیات کالا و سریال (فقط مشاهده)" footer={
        <Button variant="secondary" onClick={() => { setDetail(null); setDetailProduct(null); }}>بستن</Button>
      }>
        {detail && (() => {
          const p = detailProduct || productMap[detail.product_id];
          const inDoc = detail.inventory_document_id ? docMap[detail.inventory_document_id] : null;
          const outDoc = detail.outgoing_document_id ? docMap[detail.outgoing_document_id] : null;
          const inContact = inDoc ? contactMap[inDoc.contact_id ?? ""] : "";
          const outContact = outDoc ? contactMap[outDoc.contact_id ?? ""] : "";
          const ro = "bg-muted cursor-not-allowed";
          return (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground bg-amber-500/10 border border-amber-500/30 rounded p-2 leading-6">
                این فرم فقط برای مشاهده است. کد کالا و مشخصات رهگیری سریال قفل‌اند و قابل ویرایش نیستند. در صورت نیاز به تغییر، کالا را از صفحه «کالاها» حذف و مجدداً ثبت کنید.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="کد کالا"><Input value={p?.code ?? ""} readOnly disabled className={ro} /></Field>
                <Field label="واحد کالا"><Input value={p?.unit ?? ""} readOnly disabled className={ro} /></Field>
              </div>
              <Field label="شرح کالا"><Input value={p?.name ?? ""} readOnly disabled className={ro} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="گروه کالا"><Input value={groupMap[p?.product_group_id ?? ""] ?? "—"} readOnly disabled className={ro} /></Field>
                <Field label="جنس کالا"><Input value={p?.die_material ?? "—"} readOnly disabled className={`font-mono ${ro}`} /></Field>
              </div>

              <div className="border-t pt-3 space-y-3">
                <div className="text-sm font-medium text-primary">تنظیمات رهگیری سریال (قفل)</div>
                {p?.tracking_notes && (
                  <Field label="توضیحات رهگیری">
                    <Textarea value={p.tracking_notes} readOnly disabled className={ro} />
                  </Field>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="سریال نامبر"><Input dir="ltr" className={`font-mono ${ro}`} value={detail.serial_number} readOnly disabled /></Field>
                  <Field label="شماره بچ"><Input dir="ltr" className={`font-mono ${ro}`} value={detail.batch_number ?? ""} readOnly disabled /></Field>
                  <Field label="شماره پروفرما"><Input dir="ltr" className={`font-mono ${ro}`} value={detail.proforma_number ?? ""} readOnly disabled /></Field>
                  <Field label="شماره اینویس"><Input dir="ltr" className={`font-mono ${ro}`} value={detail.invoice_number ?? ""} readOnly disabled /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="وضعیت"><Input value={STATUS_LABEL[detail.status]} readOnly disabled className={ro} /></Field>
                  <Field label="انبار"><Input value={warehouseMap[detail.warehouse_id ?? ""] ?? "—"} readOnly disabled className={ro} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="تاریخ ورود"><Input value={inDoc ? formatJalali(inDoc.document_date) : "—"} readOnly disabled className={ro} /></Field>
                  <Field label="طرف حساب ورود"><Input value={inContact || "—"} readOnly disabled className={ro} /></Field>
                  <Field label="تاریخ خروج"><Input value={outDoc ? formatJalali(outDoc.document_date) : "—"} readOnly disabled className={ro} /></Field>
                  <Field label="طرف حساب خروج"><Input value={outContact || "—"} readOnly disabled className={ro} /></Field>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </>
  );
}
