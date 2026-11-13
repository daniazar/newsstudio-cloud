import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";
import { isSuperAdminEmail } from "@/lib/superadmin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const email = user.primaryEmailAddress?.emailAddress;
  const isApproved = isSuperAdminEmail(email) || user.publicMetadata?.role === "admin";

  if (!isApproved) {
    redirect("/pending-approval");
  }

  return <>{children}</>;
}
