import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/superadmin";
import { OrganizationsView } from "./OrganizationsView";

/**
 * Cross-tenant org/user directory. Stricter than the rest of /admin: regular
 * admins (role==="admin") are NOT allowed — super admin only.
 */
export default async function OrganizationsPage() {
  if (!(await isSuperAdmin())) {
    redirect("/admin");
  }
  return <OrganizationsView />;
}
