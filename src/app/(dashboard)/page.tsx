import Link from "next/link";
import { Package, FileText, Users, Boxes, ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, DataTable, EmptyState, Badge } from "@/components/ui-kit";
import { formatJalali, formatNumber, toFaDigits } from "@/lib/persian";

export const dynamic = "force-dynamic"; // Since it's a dashboard, we want fresh data

export default async function DashboardPage() {
  const [productsCount, documentsCount, contactsCount, documents, products] = await Promise.all([
    prisma.product.count(),
    prisma.inventoryDocument.count(),
    prisma.contact.count(),
    prisma.inventoryDocument.findMany({
      take: 8,
      orderBy: { doc_number: "desc" },
      include: {
        product: true,
        contact: true,
      },
    }),
    prisma.product.findMany(),
  ]);

  // Calculate stock by product
  const stockByProduct: Record<string, number> = {};
  for (const p of products) {
    stockByProduct[p.id] = p.initial_quantity;
  }

  // Get all documents to calculate exact stock (for dashboard stats)
  const allDocs = await prisma.inventoryDocument.findMany({
    select: { product_id: true, quantity: true, document_type: true },
  });

  for (const d of allDocs) {
    if (!d.product_id) continue;
    stockByProduct[d.product_id] =
      (stockByProduct[d.product_id] || 0) +
      (d.document_type === "incoming" ? d.quantity : -d.quantity);
  }

  const totalStock = Object.values(stockByProduct).reduce((a, b) => a + b, 0);

  const lowStock = products
    .map((p) => ({ ...p, qty: stockByProduct[p.id] || 0 }))
    .filter((p) => p.qty <= 5)
    .slice(0, 5);

  const stats = {
    products: productsCount,
    documents: documentsCount,
    contacts: contactsCount,
    totalStock,
  };

  const cards = [
    { label: "تعداد کالاها", value: stats.products, icon: Package, color: "bg-primary/10 text-primary" },
    { label: "تعداد اسناد", value: stats.documents, icon: FileText, color: "bg-accent text-accent-foreground" },
    { label: "موجودی کل", value: stats.totalStock, icon: Boxes, color: "bg-success/15 text-success" },
    { label: "تعداد طرف حساب‌ها", value: stats.contacts, icon: Users, color: "bg-warning/20 text-warning-foreground" },
  ];

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">پیشخوان مدیریت</h2>
        <p className="text-sm text-muted-foreground mt-1">
          خلاصه‌ای از وضعیت انبار شما — به‌روزرسانی لحظه‌ای
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{label}</span>
              <div className={`size-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="size-5" />
              </div>
            </div>
            <div className="text-2xl font-bold">{formatNumber(value)}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">آخرین اسناد انبار</h3>
            <Link href="/documents" className="text-xs text-primary hover:underline">
              مشاهده همه
            </Link>
          </div>
          {documents.length === 0 ? (
            <EmptyState message="هنوز سندی ثبت نشده" />
          ) : (
            <DataTable columns={["شماره", "نوع", "کالا", "طرف حساب", "مقدار", "تاریخ"]}>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2.5 font-mono">{toFaDigits(d.doc_number)}</td>
                  <td className="px-4 py-2.5">
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
                  <td className="px-4 py-2.5">{d.product?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{d.contact?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 font-medium">{formatNumber(d.quantity)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {formatJalali(d.document_date)}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="size-4 text-warning-foreground" />
            <h3 className="font-semibold">هشدار موجودی</h3>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-xs text-muted-foreground">موجودی همه کالاها مناسب است.</p>
          ) : (
            <ul className="space-y-2">
              {lowStock.map((p) => (
                <li key={p.id} className="flex justify-between items-center p-2.5 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  <Badge tone={p.qty <= 0 ? "destructive" : "warning"}>
                    {formatNumber(p.qty)} {p.unit ?? ""}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
