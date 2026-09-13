"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AvatarActionResult = { error: string | null };

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; 
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadAvatar(
  formData: FormData
): Promise<AvatarActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const file = formData.get("avatar") as File | null;

  if (!file || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Only JPEG, PNG, or WebP images are allowed." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "Photo must be smaller than 5MB." };
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .single();

  const extension = file.name.split(".").pop() ?? "jpg";
  const storagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_path: storagePath })
    .eq("id", user.id);

  if (dbError) {
    await supabase.storage.from("avatars").remove([storagePath]);
    return { error: dbError.message };
  }

  if (existingProfile?.avatar_path) {
    await supabase.storage.from("avatars").remove([existingProfile.avatar_path]);
  }

  revalidatePath("/dashboard", "layout");
  return { error: null };
}
