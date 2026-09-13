"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PhotoActionResult = { error: string | null };

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadResourcePhoto(
  resourceId: string,
  formData: FormData
): Promise<PhotoActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "owner") {
    return { error: "Only the Owner can upload photos." };
  }

  const file = formData.get("photo") as File | null;

  if (!file || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Only JPEG, PNG, or WebP images are allowed." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "Photo must be smaller than 8MB." };
  }

  const extension = file.name.split(".").pop() ?? "jpg";
  const storagePath = `${resourceId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("room-photos")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { count } = await supabase
    .from("resource_photos")
    .select("id", { count: "exact", head: true })
    .eq("resource_id", resourceId);

  const { error: dbError } = await supabase.from("resource_photos").insert({
    resource_id: resourceId,
    storage_path: storagePath,
    display_order: count ?? 0,
  });

  if (dbError) {
    await supabase.storage.from("room-photos").remove([storagePath]);
    return { error: dbError.message };
  }

  revalidatePath(`/dashboard/listings/${resourceId}`);
  return { error: null };
}

export async function deleteResourcePhoto(
  photoId: string,
  storagePath: string,
  resourceId: string
): Promise<PhotoActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "owner") {
    return { error: "Only the Owner can remove photos." };
  }

  const { error: dbError } = await supabase
    .from("resource_photos")
    .delete()
    .eq("id", photoId);

  if (dbError) {
    return { error: dbError.message };
  }

  await supabase.storage.from("room-photos").remove([storagePath]);

  revalidatePath(`/dashboard/listings/${resourceId}`);
  return { error: null };
}
