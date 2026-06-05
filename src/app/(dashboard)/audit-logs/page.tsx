"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, DataTable, EmptyState, Input, PageHeader, Badge, Select } from "@/components/ui-kit";
import { formatJalali, toFaDigits } from "@/lib/persian";
import { matchesSearch } from "@/lib/search";
import { fetchAuditLogsData } from "./actions";

interface Log {
  id: string; user_email: string | null; action: string; entity: string;
  entity_id: string | null; details: string | null; created_at: Date;
}

const ACTION_LABEL: Record<string, string> = {
  create: "ایجاد", update: "ویرایش", delete: "حذف",
  activate: "فعال‌سازی", deactivate: "غیرفعال‌سازی",
  print: "چاپ", export: "خروجی",
};
const ENTITY_LABEL: Record<string, string> = {
  user: "کاربر", product: "کالا", product_group: "گروه کالا",
  warehouse: "انبار", contact: "طرف حساب",
  inventory_document: "سند انبار", serial_number: "سریال نامبر", report: "گزارش",
};

export default function AuditPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogsData();
      setRows(data as unknown as Log[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (entityFilter && r.entity !== entityFilter) return false;
      if (q.trim()) {
        const detailsStr = r.details || "";
        if (!matchesSearch(r.user_email || "", q)
          && !matchesSearch(r.action, q)
          && !matchesSearch(detailsStr, q)) return false;
      }
      return true;
    });
  }, [rows, q, entityFilter]);

  return (
    <>
      <PageHeader title="گزارش فعالیت کاربران" description="پیگیری تمامی عملیات انجام‌شده در سامانه" />
      <Card className="p-3 mb-4 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pr-9" placeholder="جستجو در کاربر، عملیات یا جزئیات..." value={q} onChange={(e: any) => setQ(e.target.value)} />
        </div>
        <div className="sm:w-56">
          <Select value={entityFilter} onChange={(e: any) => setEntityFilter(e.target.value)}>
            <option value="">همه موجودیت‌ها</option>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
      </Card>

      {loading ? <div className="text-center py-10 text-muted-foreground text-sm">در حال بارگذاری...</div>
        : filtered.length === 0 ? <EmptyState message="رویدادی ثبت نشده است" />
          : (
            <DataTable columns={["کاربر", "عملیات", "موجودیت", "تاریخ", "جزئیات تغییرات"]}>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2.5 text-xs" dir="ltr">{r.user_email ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={r.action === "delete" ? "destructive" : r.action === "create" ? "success" : "default"}>
                      {ACTION_LABEL[r.action] ?? r.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">{ENTITY_LABEL[r.entity] ?? r.entity}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {formatJalali(r.created_at.toISOString())} - {toFaDigits(new Date(r.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }))}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate" title={r.details || ""}>
                    {r.details || "—"}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
    </>
  );
}
