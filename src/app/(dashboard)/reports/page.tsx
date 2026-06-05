"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useSession } from "next-auth/react";
import {
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Input,
  Select,
  Field,
} from "@/components/ui-kit";
import { formatNumber, toFaDigits, formatJalali } from "@/lib/persian";
import { printHtml, escapeHtml, brandHeader } from "@/lib/print";
import { matchesSearch } from "@/lib/search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchReportsData } from "./actions";

type Tab = "stock" | "incoming" | "outgoing" | "movement";

interface Product {
  id: string;
  code: string;
  name: string;
  product_group_id: string | null;
  unit: string | null;
  initial_quantity: number;
  warehouse_id: string | null;
}
interface Doc {
  id: string;
  doc_number: number;
  product_id: string | null;
  product_group_id: string | null;
  document_type: "incoming" | "outgoing";
  quantity: number;
  unit: string | null;
  document_date: string;
  contact_id: string | null;
  description: string | null;
  warehouse_id: string | null;
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

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "stock", label: "موجودی فعلی", icon: BarChart3 },
  { id: "incoming", label: "ورود کالا", icon: ArrowDownToLine },
  { id: "outgoing", label: "خروج کالا", icon: ArrowUpFromLine },
  { id: "movement", label: "گردش کالا", icon: Activity },
];

export default function ReportsPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [tab, setTab] = useState<Tab>("stock");
  const [products, setProducts] = useState<Product[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [groupF, setGroupF] = useState("");
  const [warehouseF, setWarehouseF] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "stock">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (!user) return;
    fetchReportsData().then(({ products: p, docs: d, groups: g, contacts: c, warehouses: w }) => {
      setProducts(p as any[]);
      setDocs(d as any[]);
      setGroups(g as any[]);
      setContacts(c as any[]);
      setWarehouses(w as any[]);
      setLoading(false);
    });
  }, [user]);

  const groupMap = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g.title])), [groups]);
  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const contactMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c.name])),
    [contacts],
  );
  const warehouseMap = useMemo(
    () => Object.fromEntries(warehouses.map((w) => [w.id, w.name])),
    [warehouses],
  );

  const inDateRange = (date: string) => {
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  };

  type StockRow = {
    key: string;
    name: string;
    product_group_id: string | null;
    unit: string | null;
    warehouse_id: string | null;
    warehouse_name: string;
    initial: number;
    incoming: number;
    outgoing: number;
    stock: number;
  };

  const buildAggregatedRows = (rangeDocs: Doc[]): StockRow[] => {
    const bucket = new Map<string, StockRow>();
    const keyOf = (name: string, wid: string | null) => `${name}||${wid ?? ""}`;
    const ensure = (name: string, p: Product | null, wid: string | null): StockRow => {
      const k = keyOf(name, wid);
      let row = bucket.get(k);
      if (!row) {
        row = {
          key: k,
          name,
          product_group_id: p?.product_group_id ?? null,
          unit: p?.unit ?? null,
          warehouse_id: wid,
          warehouse_name: warehouseMap[wid ?? ""] ?? "—",
          initial: 0,
          incoming: 0,
          outgoing: 0,
          stock: 0,
        };
        bucket.set(k, row);
      }
      return row;
    };

    for (const p of products) {
      const init = Number(p.initial_quantity ?? 0);
      if (init === 0) continue;
      const row = ensure(p.name, p, p.warehouse_id ?? null);
      row.initial += init;
    }

    for (const d of rangeDocs) {
      const p = d.product_id ? productMap[d.product_id] : null;
      if (!p) continue;
      const row = ensure(p.name, p, d.warehouse_id ?? null);
      const q = Number(d.quantity ?? 0);
      if (d.document_type === "incoming") row.incoming += q;
      else row.outgoing += q;
    }
    for (const r of bucket.values()) r.stock = r.initial + r.incoming - r.outgoing;
    return Array.from(bucket.values());
  };

  const stockRows = useMemo(() => {
    let rows = buildAggregatedRows(docs).filter((r) => r.stock > 0);
    if (groupF) rows = rows.filter((r) => r.product_group_id === groupF);
    if (warehouseF) rows = rows.filter((r) => (r.warehouse_id ?? "") === warehouseF);
    if (search) rows = rows.filter((r) => matchesSearch(r.name, search));
    rows.sort((a, b) => {
      const cmp = sortKey === "stock" ? a.stock - b.stock : a.name.localeCompare(b.name, "fa");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [products, docs, groupF, warehouseF, search, sortKey, sortDir, warehouseMap, productMap]);

  const docRows = useMemo(() => {
    let rows = docs.filter((d) => inDateRange(d.document_date));
    if (tab === "incoming") rows = rows.filter((d) => d.document_type === "incoming");
    if (tab === "outgoing") rows = rows.filter((d) => d.document_type === "outgoing");
    if (groupF) rows = rows.filter((d) => d.product_group_id === groupF);
    if (warehouseF) rows = rows.filter((d) => (d.warehouse_id ?? "") === warehouseF);
    if (search) {
      rows = rows.filter((d) => {
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
    }
    return rows;
  }, [docs, tab, groupF, warehouseF, search, from, to, productMap, contactMap]);

  const movementRows = useMemo(() => {
    const rangeDocs = docs.filter((d) => inDateRange(d.document_date));
    let rows = buildAggregatedRows(rangeDocs)
      .map((r) => ({ ...r, net: r.incoming - r.outgoing }))
      .filter((r) => r.stock > 0 && (r.incoming > 0 || r.outgoing > 0));
    if (groupF) rows = rows.filter((r) => r.product_group_id === groupF);
    if (warehouseF) rows = rows.filter((r) => (r.warehouse_id ?? "") === warehouseF);
    if (search) rows = rows.filter((r) => matchesSearch(r.name, search));
    return rows;
  }, [products, docs, from, to, groupF, warehouseF, search, warehouseMap, productMap]);

  const totalStock = stockRows.reduce((a, r) => a + r.stock, 0);
  const totalIncoming = docRows
    .filter((d) => d.document_type === "incoming")
    .reduce((a, d) => a + Number(d.quantity), 0);
  const totalOutgoing = docRows
    .filter((d) => d.document_type === "outgoing")
    .reduce((a, d) => a + Number(d.quantity), 0);

  const exportExcel = () => {
    let data: any[] = [];
    let name = "گزارش";
    if (tab === "stock") {
      name = "موجودی فعلی";
      data = stockRows.map((r) => ({
        "نام کالا": r.name,
        "گروه کالا": groupMap[r.product_group_id ?? ""] ?? "",
        انبار: r.warehouse_name,
        واحد: r.unit ?? "",
        "موجودی فعلی": r.stock,
      }));
    } else if (tab === "movement") {
      name = "گردش کالا";
      data = movementRows.map((r) => ({
        "نام کالا": r.name,
        "گروه کالا": groupMap[r.product_group_id ?? ""] ?? "",
        انبار: r.warehouse_name,
        واحد: r.unit ?? "",
        "موجودی اولیه": r.initial,
        ورودی: r.incoming,
        خروجی: r.outgoing,
        "موجودی فعلی": r.stock,
      }));
    } else {
      name = tab === "incoming" ? "ورود کالا" : "خروج کالا";
      data = docRows.map((d) => ({
        "شماره سند": d.doc_number,
        تاریخ: formatJalali(d.document_date),
        نوع: d.document_type === "incoming" ? "ورودی" : "خروجی",
        کالا: productMap[d.product_id ?? ""]?.name ?? "",
        گروه: groupMap[d.product_group_id ?? ""] ?? "",
        انبار: warehouseMap[d.warehouse_id ?? ""] ?? "—",
        "طرف حساب": contactMap[d.contact_id ?? ""] ?? "",
        مقدار: Number(d.quantity),
        واحد: d.unit ?? "",
        توضیحات: d.description ?? "",
      }));
    }
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!rtl" as any] = true;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, name);
    XLSX.writeFile(wb, `${name}.xlsx`);
  };

  const exportCSV = () => {
    let header: string[] = [];
    let rows: any[][] = [];
    if (tab === "stock") {
      header = ["نام کالا", "گروه", "انبار", "واحد", "موجودی فعلی"];
      rows = stockRows.map((r) => [
        r.name,
        groupMap[r.product_group_id ?? ""] ?? "",
        r.warehouse_name,
        r.unit ?? "",
        r.stock,
      ]);
    } else if (tab === "movement") {
      header = [
        "نام کالا",
        "گروه",
        "انبار",
        "واحد",
        "موجودی اولیه",
        "ورودی",
        "خروجی",
        "موجودی فعلی",
      ];
      rows = movementRows.map((r) => [
        r.name,
        groupMap[r.product_group_id ?? ""] ?? "",
        r.warehouse_name,
        r.unit ?? "",
        r.initial,
        r.incoming,
        r.outgoing,
        r.stock,
      ]);
    } else {
      header = [
        "شماره سند",
        "تاریخ",
        "نوع",
        "کالا",
        "گروه",
        "انبار",
        "طرف حساب",
        "مقدار",
        "واحد",
        "توضیحات",
      ];
      rows = docRows.map((d) => [
        d.doc_number,
        formatJalali(d.document_date),
        d.document_type === "incoming" ? "ورودی" : "خروجی",
        productMap[d.product_id ?? ""]?.name ?? "",
        groupMap[d.product_group_id ?? ""] ?? "",
        warehouseMap[d.warehouse_id ?? ""] ?? "—",
        contactMap[d.contact_id ?? ""] ?? "",
        d.quantity,
        d.unit ?? "",
        d.description ?? "",
      ]);
    }
    const lines = [header.join(",")].concat(
      rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")),
    );
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tab}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printStyle = `
    <style>
      table { width:100%; border-collapse: collapse; font-size:12px; font-family:'Vazirmatn', Tahoma, sans-serif; direction: ltr; table-layout: auto; }
      th, td { border:1px solid #333; padding:7px 9px; vertical-align: middle; line-height: 1.6; }
      th { background:#111; color:#fff; font-weight:700; font-size:12.5px; text-align:center; letter-spacing: 0.2px; }
      td { text-align:center; }
      td.l, th.l { text-align:left; }
      td.num, th.num { text-align:center; font-variant-numeric: tabular-nums; }
      tbody tr:nth-child(even) td { background:#fafafa; }
      tfoot td { background:#f0f0f0; font-weight:700; text-align:center; }
      tfoot td.l { text-align:left; }
    </style>
  `;

  const printCurrentInventory = () => {
    let rows = buildAggregatedRows(docs).filter((r) => r.stock > 0);
    if (groupF) rows = rows.filter((r) => r.product_group_id === groupF);
    if (warehouseF) rows = rows.filter((r) => (r.warehouse_id ?? "") === warehouseF);
    if (search) rows = rows.filter((r) => matchesSearch(r.name, search));
    rows.sort(
      (a, b) =>
        a.name.localeCompare(b.name, "fa") ||
        a.warehouse_name.localeCompare(b.warehouse_name, "fa"),
    );
    const total = rows.reduce((a, r) => a + r.stock, 0);
    const table = `<table>
      <thead><tr>
        <th class="l">نام کالا</th><th class="l">گروه</th><th class="l">انبار</th><th class="num">واحد</th><th class="num">موجودی فعلی</th>
      </tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
          <td class="l">${escapeHtml(r.name)}</td>
          <td class="l">${escapeHtml(groupMap[r.product_group_id ?? ""] ?? "")}</td>
          <td class="l">${escapeHtml(r.warehouse_name)}</td>
          <td class="num">${escapeHtml(r.unit ?? "")}</td>
          <td class="num"><b>${escapeHtml(formatNumber(r.stock))}</b></td>
        </tr>`,
          )
          .join("")}
      </tbody>
      <tfoot><tr>
        <td class="l" colspan="4">جمع کل موجودی</td>
        <td class="num">${escapeHtml(formatNumber(total))}</td>
      </tr></tfoot>
    </table>`;
    const html = `
      ${printStyle}
      ${brandHeader("گزارش موجودی فعلی")}
      <div class="meta">
        <div><b>تاریخ گزارش:</b>${escapeHtml(formatJalali(new Date().toISOString()))}</div>
        <div><b>تعداد اقلام:</b>${escapeHtml(formatNumber(rows.length))}</div>
        ${groupF ? `<div><b>گروه کالا:</b>${escapeHtml(groupMap[groupF] ?? "")}</div>` : ""}
        ${warehouseF ? `<div><b>انبار:</b>${escapeHtml(warehouseMap[warehouseF] ?? "")}</div>` : ""}
      </div>
      ${table}
    `;
    printHtml(html, "گزارش موجودی فعلی");
  };

  const printMovement = () => {
    const rangeDocs = docs.filter((d) => inDateRange(d.document_date));
    let rows = buildAggregatedRows(rangeDocs).filter((r) => r.stock > 0);
    if (groupF) rows = rows.filter((r) => r.product_group_id === groupF);
    if (warehouseF) rows = rows.filter((r) => (r.warehouse_id ?? "") === warehouseF);
    if (search) rows = rows.filter((r) => matchesSearch(r.name, search));
    rows.sort(
      (a, b) =>
        a.name.localeCompare(b.name, "fa") ||
        a.warehouse_name.localeCompare(b.warehouse_name, "fa"),
    );

    const sumIn = rows.reduce((a, r) => a + r.incoming, 0);
    const sumOut = rows.reduce((a, r) => a + r.outgoing, 0);
    const sumInit = rows.reduce((a, r) => a + r.initial, 0);
    const sumStock = rows.reduce((a, r) => a + r.stock, 0);

    const table = `<table>
      <thead><tr>
        <th class="l">نام کالا</th><th class="l">گروه</th><th class="l">انبار</th>
        <th class="num">واحد</th><th class="num">موجودی اولیه</th>
        <th class="num">ورودی</th><th class="num">خروجی</th><th class="num">موجودی فعلی</th>
      </tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
          <td class="l">${escapeHtml(r.name)}</td>
          <td class="l">${escapeHtml(groupMap[r.product_group_id ?? ""] ?? "")}</td>
          <td class="l">${escapeHtml(r.warehouse_name)}</td>
          <td class="num">${escapeHtml(r.unit ?? "")}</td>
          <td class="num">${escapeHtml(formatNumber(r.initial))}</td>
          <td class="num">${escapeHtml(formatNumber(r.incoming))}</td>
          <td class="num">${escapeHtml(formatNumber(r.outgoing))}</td>
          <td class="num"><b>${escapeHtml(formatNumber(r.stock))}</b></td>
        </tr>`,
          )
          .join("")}
      </tbody>
      <tfoot><tr>
        <td class="l" colspan="4">جمع کل</td>
        <td class="num">${escapeHtml(formatNumber(sumInit))}</td>
        <td class="num">${escapeHtml(formatNumber(sumIn))}</td>
        <td class="num">${escapeHtml(formatNumber(sumOut))}</td>
        <td class="num">${escapeHtml(formatNumber(sumStock))}</td>
      </tr></tfoot>
    </table>`;

    const html = `
      ${printStyle}
      ${brandHeader("گزارش گردش کالا")}
      <div class="meta">
        <div><b>تاریخ گزارش:</b>${escapeHtml(formatJalali(new Date().toISOString()))}</div>
        ${from ? `<div><b>از تاریخ:</b>${escapeHtml(formatJalali(from))}</div>` : ""}
        ${to ? `<div><b>تا تاریخ:</b>${escapeHtml(formatJalali(to))}</div>` : ""}
        ${groupF ? `<div><b>گروه کالا:</b>${escapeHtml(groupMap[groupF] ?? "")}</div>` : ""}
        ${warehouseF ? `<div><b>انبار:</b>${escapeHtml(warehouseMap[warehouseF] ?? "")}</div>` : ""}
      </div>
      ${table}
    `;
    printHtml(html, "گزارش گردش کالا");
  };

  return (
    <>
      <PageHeader
        title="گزارشات"
        description="گزارشات تفصیلی موجودی و گردش کالا"
        action={
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Printer className="size-4" />
                  چاپ گزارش
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[220px]">
                <DropdownMenuItem onClick={printCurrentInventory}>
                  <BarChart3 className="size-4" />
                  گزارش موجودی فعلی
                </DropdownMenuItem>
                <DropdownMenuItem onClick={printMovement}>
                  <Activity className="size-4" />
                  گزارش گردش کالا
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={exportExcel}>
              <FileSpreadsheet className="size-4" />
              خروجی اکسل
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="size-4" />
              CSV
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <Field label="جستجو">
          <Input
            placeholder="نام / کد / شماره سند..."
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
          />
        </Field>
        <Field label="گروه کالا">
          <Select value={groupF} onChange={(e: any) => setGroupF(e.target.value)}>
            <option value="">همه گروه‌ها</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="انبار">
          <Select value={warehouseF} onChange={(e: any) => setWarehouseF(e.target.value)}>
            <option value="">همه انبارها</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </Field>
        {tab !== "stock" && (
          <>
            <Field label="از تاریخ">
              <Input
                type="date"
                dir="ltr"
                value={from}
                onChange={(e: any) => setFrom(e.target.value)}
              />
            </Field>
            <Field label="تا تاریخ">
              <Input
                type="date"
                dir="ltr"
                value={to}
                onChange={(e: any) => setTo(e.target.value)}
              />
            </Field>
          </>
        )}
        {tab === "stock" && (
          <>
            <Field label="مرتب‌سازی">
              <Select value={sortKey} onChange={(e: any) => setSortKey(e.target.value as any)}>
                <option value="name">نام کالا</option>
                <option value="stock">موجودی</option>
              </Select>
            </Field>
            <Field label="ترتیب">
              <Select value={sortDir} onChange={(e: any) => setSortDir(e.target.value as any)}>
                <option value="asc">صعودی</option>
                <option value="desc">نزولی</option>
              </Select>
            </Field>
          </>
        )}
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {tab === "stock" && (
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">جمع موجودی</div>
            <div className="text-xl font-bold mt-1">{formatNumber(totalStock)}</div>
          </Card>
        )}
        {(tab === "incoming" || tab === "outgoing") && (
          <>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">تعداد اسناد</div>
              <div className="text-xl font-bold mt-1">{formatNumber(docRows.length)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">جمع مقادیر</div>
              <div className="text-xl font-bold mt-1">
                {formatNumber(tab === "incoming" ? totalIncoming : totalOutgoing)}
              </div>
            </Card>
          </>
        )}
        {tab === "movement" && (
          <>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">جمع ورودی</div>
              <div className="text-xl font-bold mt-1 text-success">
                {formatNumber(movementRows.reduce((a, r) => a + r.incoming, 0))}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">جمع خروجی</div>
              <div className="text-xl font-bold mt-1 text-destructive">
                {formatNumber(movementRows.reduce((a, r) => a + r.outgoing, 0))}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">خالص گردش</div>
              <div className="text-xl font-bold mt-1">
                {formatNumber(movementRows.reduce((a, r) => a + r.net, 0))}
              </div>
            </Card>
          </>
        )}
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">در حال بارگذاری...</div>
      ) : tab === "stock" ? (
        stockRows.length === 0 ? (
          <EmptyState
            message="کالایی برای گزارش‌گیری وجود ندارد"
            icon={<BarChart3 className="size-10" />}
          />
        ) : (
          <DataTable
            dir="ltr"
            columns={[
              { label: "نام کالا", align: "left" },
              { label: "گروه", align: "left" },
              { label: "انبار", align: "left" },
              { label: "واحد", align: "center" },
              { label: "موجودی فعلی", align: "center" },
            ]}
          >
            {stockRows.map((r) => (
              <tr key={r.key}>
                <td className="px-3 py-2.5 text-left font-medium">{r.name}</td>
                <td className="px-3 py-2.5 text-left text-muted-foreground">
                  {groupMap[r.product_group_id ?? ""] ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-left text-muted-foreground">{r.warehouse_name}</td>
                <td className="px-3 py-2.5 text-center text-muted-foreground">{r.unit || "—"}</td>
                <td
                  className={`px-3 py-2.5 text-center tabular-nums font-bold ${r.stock <= 0 ? "text-destructive" : r.stock <= 5 ? "text-warning-foreground" : ""}`}
                >
                  {formatNumber(r.stock)}
                </td>
              </tr>
            ))}
          </DataTable>
        )
      ) : tab === "movement" ? (
        movementRows.length === 0 ? (
          <EmptyState
            message="گردشی در بازه‌ی انتخابی ثبت نشده است"
            icon={<Activity className="size-10" />}
          />
        ) : (
          <DataTable
            dir="ltr"
            columns={[
              { label: "نام کالا", align: "left" },
              { label: "گروه", align: "left" },
              { label: "انبار", align: "left" },
              { label: "واحد", align: "center" },
              { label: "موجودی اولیه", align: "center" },
              { label: "ورودی", align: "center" },
              { label: "خروجی", align: "center" },
              { label: "موجودی فعلی", align: "center" },
            ]}
          >
            {movementRows.map((r) => (
              <tr key={r.key}>
                <td className="px-3 py-2.5 text-left font-medium">{r.name}</td>
                <td className="px-3 py-2.5 text-left text-muted-foreground">
                  {groupMap[r.product_group_id ?? ""] ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-left text-muted-foreground">{r.warehouse_name}</td>
                <td className="px-3 py-2.5 text-center text-muted-foreground">{r.unit || "—"}</td>
                <td className="px-3 py-2.5 text-center tabular-nums">{formatNumber(r.initial)}</td>
                <td className="px-3 py-2.5 text-center tabular-nums text-success">
                  {formatNumber(r.incoming)}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums text-destructive">
                  {formatNumber(r.outgoing)}
                </td>
                <td className="px-3 py-2.5 text-center tabular-nums font-bold">
                  {formatNumber(r.stock)}
                </td>
              </tr>
            ))}
          </DataTable>
        )
      ) : docRows.length === 0 ? (
        <EmptyState
          message="سندی در بازه‌ی انتخابی نیست"
          icon={
            tab === "incoming" ? (
              <ArrowDownToLine className="size-10" />
            ) : (
              <ArrowUpFromLine className="size-10" />
            )
          }
        />
      ) : (
        <DataTable
          dir="ltr"
          columns={[
            { label: "شماره سند", align: "left" },
            { label: "تاریخ", align: "left" },
            { label: "کالا", align: "left" },
            { label: "گروه", align: "left" },
            { label: "انبار", align: "left" },
            { label: "طرف حساب", align: "left" },
            { label: "مقدار", align: "center" },
            { label: "واحد", align: "center" },
            { label: "توضیحات", align: "left" },
          ]}
        >
          {docRows.map((d) => (
            <tr key={d.id}>
              <td className="px-3 py-2.5 text-left font-mono tabular-nums">
                {toFaDigits(String(d.doc_number))}
              </td>
              <td className="px-3 py-2.5 text-left text-muted-foreground">
                {formatJalali(d.document_date)}
              </td>
              <td className="px-3 py-2.5 text-left font-medium">
                {productMap[d.product_id ?? ""]?.name ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-left text-muted-foreground">
                {groupMap[d.product_group_id ?? ""] ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-left text-muted-foreground">
                {warehouseMap[d.warehouse_id ?? ""] ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-left">{contactMap[d.contact_id ?? ""] ?? "—"}</td>
              <td className="px-3 py-2.5 text-center tabular-nums font-medium">
                {formatNumber(d.quantity)}
              </td>
              <td className="px-3 py-2.5 text-center text-muted-foreground">{d.unit ?? "—"}</td>
              <td className="px-3 py-2.5 text-left text-muted-foreground max-w-[220px] truncate">
                {d.description ?? "—"}
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </>
  );
}
