"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function changePasswordAction(formData: FormData) {
  const new_password = String(formData.get("new_password") ?? "");
  const confirm_password = String(formData.get("confirm_password") ?? "");
  if (!new_password || new_password.length < 6 || new_password !== confirm_password) return;

  const db = await supabaseServerAuth();
  const { error } = await db.auth.updateUser({ password: new_password });
  if (error) throw error;

  revalidatePath("/dashboard/settings/account");
}

export async function deleteAccountAction(formData: FormData) {
  const confirmEmail = String(formData.get("confirm_email") ?? "")
    .trim()
    .toLowerCase();

  const db = await supabaseServerAuth();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || !user.email) return;
  if (confirmEmail !== user.email.toLowerCase()) return;

  // Deleting the auth user cascades to tenant_members (on delete cascade)
  // but not to the tenant itself or its data — any tenant this was the
  // sole member of becomes orphaned. The account page warns about this
  // by name before letting the user get here.
  const { error } = await supabaseAdmin().auth.admin.deleteUser(user.id);
  if (error) throw error;

  redirect("/login");
}
