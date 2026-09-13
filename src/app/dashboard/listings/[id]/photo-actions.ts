"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PhotoActionResult = { error: string | null };

export type UploadPhotosResult = {
  uploadedCount: number;
  errors: { fileName: string; message: string }[];
};

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadResourcePhotos(
  resourceId: string,
  formData: FormData
): Promise<UploadPhotosResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { uploadedCount: 0, errors: [{ fileName: "", message: "Not signed in." }] };
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "owner") {
    return {
      uploadedCount: 0,
      errors: [{ fileName: "", message: "Only the Owner can upload photos." }],
    };
  }

  const files = formData.getAll("photo") as File[];
  const realFiles = files.filter((f) => f && f.size > 0);

  if (realFiles.length === 0) {
    return {
      uploadedCount: 0,
      errors: [{ fileName: "", message: "Choose at least one photo to upload." }],
    };
  }

  const { count } = await supabase
    .from("resource_photos")
    .select("id", { count: "exact", head: true })
    .eq("resource_id", resourceId);

  let nextDisplayOrder = count ?? 0;
  let uploadedCount = 0;
  const errors: { fileName: string; message: string }[] = [];

  for (const file of realFiles) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push({ fileName: file.name, message: "Not a JPEG, PNG, or WebP image." });
      continue;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push({ fileName: file.name, message: "Larger than 8MB." });
      continue;
    }

    const extension = file.name.split(".").pop() ?? "jpg";
    const storagePath = `${resourceId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("room-photos")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      errors.push({ fileName: file.name, message: uploadError.message });
      continue;
    }

    const { error: dbError } = await supabase.from("resource_photos").insert({
      resource_id: resourceId,
      storage_path: storagePath,
      display_order: nextDisplayOrder,
    });

    if (dbError) {
      await supabase.storage.from("room-photos").remove([storagePath]);
      errors.push({ fileName: file.name, message: dbError.message });
      continue;
    }

    nextDisplayOrder++;
    uploadedCount++;
  }

  if (uploadedCount > 0) {
    revalidatePath(`/dashboard/listings/${resourceId}`);
  }

  return { uploadedCount, errors };
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
