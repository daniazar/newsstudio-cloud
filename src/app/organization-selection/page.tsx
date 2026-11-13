import { OrganizationList } from "@clerk/nextjs";

/**
 * Tenant gate. When a signed-in user has no active organization, the proxy
 * redirects here to force them to pick (or create) a tenant context before
 * accessing the newsroom/admin surfaces. Intentionally not in the sidebar.
 */
export default function OrganizationSelectionPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-4 text-white">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-black tracking-tight mb-2">Select an organization</h1>
        <p className="text-slate-400">Choose a workspace to continue, or create a new one.</p>
      </div>
      <OrganizationList
        hidePersonal
        afterSelectOrganizationUrl="/newsroom"
        afterCreateOrganizationUrl="/newsroom"
      />
    </div>
  );
}
