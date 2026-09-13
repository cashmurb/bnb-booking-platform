import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ManagementSidebar } from "./management-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    redirect("/login?deactivated=1");
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8]">
      <ManagementSidebar role={profile?.role ?? "staff"} />
      <div className="pb-20 lg:pb-0 lg:pl-[100px]">{children}</div>
    </div>
  );
}
