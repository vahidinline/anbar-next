export type AppRole = "admin" | "warehouse_keeper" | "sales";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "مدیر سیستم",
  warehouse_keeper: "انباردار",
  sales: "فروش",
};

export type Permission =
  | "products.view"
  | "products.create"
  | "products.edit"
  | "products.delete"
  | "inventory.view"
  | "inventory.create"
  | "inventory.edit"
  | "inventory.delete"
  | "reports.view"
  | "reports.print"
  | "warehouses.view"
  | "warehouses.manage"
  | "serials.view"
  | "serials.manage"
  | "contacts.view"
  | "contacts.manage"
  | "users.manage"
  | "permissions.manage"
  | "settings.manage"
  | "audit.view";

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  admin: [
    "products.view",
    "products.create",
    "products.edit",
    "products.delete",
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.delete",
    "reports.view",
    "reports.print",
    "warehouses.view",
    "warehouses.manage",
    "serials.view",
    "serials.manage",
    "contacts.view",
    "contacts.manage",
    "users.manage",
    "permissions.manage",
    "settings.manage",
    "audit.view",
  ],
  warehouse_keeper: [
    "products.view",
    "products.create",
    "products.edit",
    "products.delete",
    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.delete",
    "reports.view",
    "reports.print",
    "warehouses.view",
    "warehouses.manage",
    "serials.view",
    "serials.manage",
    "contacts.view",
    "contacts.manage",
  ],
  sales: [
    "products.view",
    "inventory.view",
    "reports.view",
    "warehouses.view",
    "serials.view",
    "contacts.view",
  ],
};

export function permissionsFor(roles: AppRole[]): Set<Permission> {
  const s = new Set<Permission>();
  for (const r of roles) ROLE_PERMISSIONS[r]?.forEach((p) => s.add(p));
  return s;
}

export const DENIED_MESSAGE = "شما دسترسی لازم برای این عملیات را ندارید";
