"use server";

import { revalidatePath } from "next/cache";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { updateOrderStatus } from "@/lib/db/orders";
import { updateCustomerLastOrderAt } from "@/lib/db/customers";
import { awardPointsForOrder } from "@/lib/loyalty/engine";

export async function markOrderPaidAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const db = await supabaseServerAuth();
  const order = await updateOrderStatus(db, id, "paid");
  await awardPointsForOrder(db, order);
  await updateCustomerLastOrderAt(db, order.customer_id, order.created_at);

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");
}

export async function cancelOrderAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const db = await supabaseServerAuth();
  await updateOrderStatus(db, id, "cancelled");
  revalidatePath("/dashboard/orders");
}
