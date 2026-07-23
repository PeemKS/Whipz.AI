"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";

const AVATAR_BUCKET = "user-avatars";

export async function updateUserProfileAction(formData: FormData) {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const db = await supabaseServerAuth();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return;

  const data: Record<string, string> = {};
  if (full_name) data.full_name = full_name;

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const ext = avatar.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await db.storage
      .from(AVATAR_BUCKET)
      .upload(path, avatar, { contentType: avatar.type || "image/jpeg", upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = db.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    // Cache-bust so the new photo shows immediately even though the path is stable.
    data.avatar_url = `${publicUrlData.publicUrl}?t=${Date.now()}`;
  }

  if (Object.keys(data).length > 0) {
    const { error } = await db.auth.updateUser({ data });
    if (error) throw error;
  }

  revalidatePath("/", "layout");
}

export async function removeAvatarAction() {
  const db = await supabaseServerAuth();
  const { error } = await db.auth.updateUser({ data: { avatar_url: null } });
  if (error) throw error;
  revalidatePath("/", "layout");
}
