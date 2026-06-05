# معماری پروژه

## ساختار پوشه‌ها

```
src/
  components/
    ui/             → کامپوننت‌های پایه shadcn
    shared/         → کامپوننت‌های مشترک (SearchBar و ...)
    ui-kit.tsx      → کیت کامپوننت‌های فارسی (Button, Modal, DataTable, ...)
    AppLayout.tsx   → لایوت اصلی + سایدبار
    RequirePerm.tsx → نگهبان دسترسی
    Barcode.tsx     → بارکد SVG
  hooks/
    useDebounce.ts        → جستجوی زنده
    useSupabaseList.ts    → wrapper روی useQuery
  lib/
    auth.tsx        → AuthProvider و useAuth
    permissions.ts  → نقش‌ها و دسترسی‌ها
    audit.ts        → ثبت لاگ
    barcode.ts      → تولید بارکد
    print.ts        → چاپ
    persian.ts      → ابزار فارسی
    platform.ts     → انتزاع پلتفرم (آماده Desktop)
  modules/
    products/services.ts
    product-groups/services.ts
    warehouses/services.ts
    contacts/services.ts
    inventory/services.ts        ← شامل calculateStock
    serials/services.ts
    users/services.ts
    audit/services.ts
  routes/           → صفحات (TanStack Router file-based)
  integrations/supabase/ → کلاینت auto-generated
```

## اصول

1. **جداسازی منطق از UI** — query‌های Supabase در `modules/*/services.ts` نگهداری می‌شوند.
2. **کش با TanStack Query** — `useSupabaseList(['products'], productsService.list)` به‌جای fetch مستقیم.
3. **انتزاع پلتفرم** — تماس‌های مرورگری (print، download، storage) از `lib/platform.ts` عبور کند.
4. **Code splitting خودکار** — TanStack Start به‌صورت پیش‌فرض هر route را در chunk جدا قرار می‌دهد.
5. **Memoization** — `DataTable` با `React.memo` بسته‌بندی شده تا با تغییر سایر state‌ها re-render نشود.

## مهاجرت تدریجی route‌ها

route‌های موجود همچنان کار می‌کنند. برای بهینه‌سازی هر صفحه، الگو:

```tsx
import { useSupabaseList } from "@/hooks/useSupabaseList";
import { productsService } from "@/modules/products/services";

const { data: products = [], isLoading } = useSupabaseList(["products"], productsService.list);
```

## آماده‌سازی Desktop

- `src/lib/platform.ts` نقطه ورود برای پل زدن به Electron / Tauri است.
- در صورت بسته‌بندی، در `vite.config.ts` گزینه `base: './'` لازم است.
- چاپ، ذخیره فایل و localStorage از طریق `platform.*` فراخوانی شود.
