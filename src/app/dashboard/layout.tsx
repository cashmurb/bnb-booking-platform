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
    .select("role")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-[#f6f6f8]">
      <ManagementSidebar role={profile?.role ?? "staff"} />
      <div className="pl-[100px]">{children}</div>
    </div>
  );
}
