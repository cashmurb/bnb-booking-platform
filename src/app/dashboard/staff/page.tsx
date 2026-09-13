import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SearchBar } from "../search-bar";
import { ProfileMenu } from "../profile-menu";
import { AddStaffForm } from "./add-staff-form";
import { StaffStatusButton } from "./staff-status-button";

export default async function StaffPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    redirect("/dashboard");
  }

  const { data: accounts } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .order("role");

  return (
    <main className="px-10 py-6">
      <div className="mb-7 flex items-center gap-4">
        <SearchBar />
        <div className="ml-auto flex items-center gap-5 text-[13px]">
          <div className="hidden items-center gap-5 lg:flex">
            <Link href="/dashboard/records" className="text-[#4a4a4a]">
              Records
            </Link>
            <Link href="/dashboard/reports" className="text-[#4a4a4a]">
              Reports
            </Link>
            <div className="h-5 w-px bg-[#ececec]" />
          </div>
          <ProfileMenu
            name={profile?.full_name ?? user.email ?? "Account"}
            role="Owner"
          />
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[26px] font-normal text-guest-ink">
          Manage Staff
        </h1>
      </div>

      <div className="mb-5">
        <AddStaffForm />
      </div>

      <div className="overflow-hidden rounded-[14px] bg-white">
        <div className="grid grid-cols-[1.2fr_0.8fr_1fr] px-5 py-3.5 text-[11px] uppercase tracking-wide text-[#8a8a8a]">
          <span>Name</span>
          <span>Role</span>
          <span>Status</span>
        </div>
        {(accounts ?? []).map((a) => (
          <div
            key={a.id}
            className="grid grid-cols-[1.2fr_0.8fr_1fr] items-center border-t border-[#ececec] px-5 py-3.5 text-[13px]"
          >
            <span className="font-semibold text-guest-ink">
              {a.full_name}
            </span>
            <span className="capitalize text-guest-ink">{a.role}</span>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] ${
                  a.is_active
                    ? "bg-[#e6f4ea] text-[#1e7d3c]"
                    : "bg-[#f0f0f2] text-[#8a8a8a]"
                }`}
              >
                {a.is_active ? "Active" : "Inactive"}
              </span>
              {a.role !== "owner" && (
                <StaffStatusButton
                  userId={a.id}
                  mode={a.is_active ? "deactivate" : "reactivate"}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
