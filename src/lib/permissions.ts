/** Admin permissions. The owner has all of them implicitly; staff get a selected subset. */
export const PERMISSIONS = [
  { key: "products", label: "Products" },
  { key: "categories", label: "Categories" },
  { key: "inventory", label: "Inventory" },
  { key: "orders", label: "Orders" },
  { key: "payments", label: "Payments" },
  { key: "refunds", label: "Refunds" },
  { key: "customers", label: "Customers" },
  { key: "coupons", label: "Coupons" },
  { key: "analytics", label: "Analytics" },
  { key: "settings", label: "Store settings" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];
export type Role = "customer" | "staff" | "owner";

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as Permission[];

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: "staff" | "owner";
  permissions: Permission[];
};

export function isPermission(value: string): value is Permission {
  return (PERMISSION_KEYS as string[]).includes(value);
}

export function hasPermission(user: Pick<StaffUser, "role" | "permissions">, permission: Permission): boolean {
  return user.role === "owner" || user.permissions.includes(permission);
}
