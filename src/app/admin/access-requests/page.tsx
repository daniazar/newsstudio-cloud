import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/superadmin";
import { AccessRequestsView } from "./AccessRequestsView";

/** Super-admin review queue for platform access requests. */
export default async function AccessRequestsPage() {
  if (!(await isSuperAdmin())) {
    redirect("/admin");
  }
  return <AccessRequestsView />;
}
