## Goal

Make inventory warehouse-aware end-to-end: every stock movement is tied to a specific warehouse, and stock is calculated per `(product, warehouse)` instead of per product.

## 1. Database migration

Add nullable `warehouse_id uuid` to two tables (nullable so existing rows survive; the app layer enforces required at the form level going forward):

- `public.products.warehouse_id` — warehouse that holds the product's `initial_quantity`.
- `public.inventory_documents.warehouse_id` — warehouse the movement affects.

Add helper indexes on both columns.

> Existing rows: kept as-is with `NULL` warehouse. They will appear under a "بدون انبار" bucket in calculations until an admin assigns them. No data is destroyed.

## 2. Product form (`src/routes/products.tsx`)

- Add a required, searchable warehouse select (reuse the same Popover + Command searchable pattern used for products in `documents.tsx`).
- Persist `warehouse_id` on create/update.
- Show warehouse column in the products table.

## 3. Inventory document form (`src/routes/documents.tsx`)

- Add a required, searchable warehouse select (works for both incoming and outgoing).
- On outgoing: before save, compute available stock in the selected warehouse as
  `initial_quantity (if product.warehouse_id === selected) + Σ incoming(this warehouse) − Σ outgoing(this warehouse)`,
  and block submit with toast: **"این کالا در انبار انتخاب شده موجود نیست"** (or "موجودی انبار انتخاب شده کافی نیست" when present but insufficient).
- Show warehouse column in the documents table.

## 4. Stock calculation (single source of truth)

Update `src/modules/inventory/services.ts` `calculateStock` to also key by warehouse and export a `calculateStockByWarehouse(docs, products)` helper returning `Map<"productId|warehouseId", number>` plus per-product totals. All callers switch to it:

- Dashboard (`src/routes/index.tsx`) — total stock still sums everything.
- Reports (`src/routes/reports.tsx`) — current-inventory and movement reports group by `(product, warehouse)`; print layout already has an "انبار" column for the stock report, populate it correctly; add it to the movement report too.
- Traceability (`src/routes/traceability.tsx`) — show warehouse per movement row.

## 5. Serial numbers

`serial_numbers.warehouse_id` already exists. No schema change. When an outgoing document selects serials, continue current behavior; just ensure the selected warehouse matches `serial.warehouse_id` (warn if mismatch). Incoming serial creation writes the document's `warehouse_id` onto the serial row.

## 6. UI/UX

- Keep current visual design; only add the warehouse field/column.
- Warehouse select uses the same searchable Popover/Command pattern already used for products — case-insensitive search via `src/lib/search.ts`.
- All Persian RTL labels preserved.

## Technical notes

- Migration: `ALTER TABLE products ADD COLUMN warehouse_id uuid;` + index; same for `inventory_documents`. No FK constraint (matches the project's existing convention of no FKs on these tables) — referential integrity is enforced in app code.
- Types: `src/integrations/supabase/types.ts` is auto-regenerated after the migration is approved.
- No changes to RLS — existing `can_read`/`can_write` policies already cover the new column.
- Backward compatibility: rows without `warehouse_id` are treated as warehouse "—" in reports and excluded from per-warehouse validation (outgoing on such product without warehouse selection on the doc behaves as before).
