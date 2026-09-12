"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function startTask(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_task", { p_task_id: taskId });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}

export async function completeTask(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_task", { p_task_id: taskId });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}

export async function reopenTask(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_task", { p_task_id: taskId });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}
