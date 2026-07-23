import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { listOrders } from "@/lib/db/orders";
import { markOrderPaidAction, cancelOrderAction } from "@/app/dashboard/orders/actions";
import { getT } from "@/lib/i18n/getT";
import { getLocale } from "@/lib/i18n/getLocale";
import { formatDateTime } from "@/lib/i18n/formatDate";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const STATUS_VARIANT = {
  paid: "success",
  pending: "warning",
  cancelled: "neutral",
} as const;

export default async function OrdersPage() {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const db = await supabaseServerAuth();
  const orders = await listOrders(db, tenant.id);
  const t = await getT();
  const locale = await getLocale();
  const o = t.orders;

  return (
    <Card padding="none" className="overflow-hidden">
      <table className="w-full text-sm text-center">
        <thead className="bg-zinc-50 text-zinc-500">
          <tr>
            <th className="px-4 py-2 font-medium">{o.customer}</th>
            <th className="px-4 py-2 font-medium">{o.items}</th>
            <th className="px-4 py-2 font-medium">{o.total}</th>
            <th className="px-4 py-2 font-medium">{o.status}</th>
            <th className="px-4 py-2 font-medium">{o.created}</th>
            <th className="px-4 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                {o.noneYet}
              </td>
            </tr>
          )}
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-zinc-100 align-middle">
              <td className="px-4 py-2">{order.customer_display_name ?? "—"}</td>
              <td className="px-4 py-2 text-xs">
                {order.items.map((item) => `${item.sku} x${item.qty}`).join(", ")}
              </td>
              <td className="px-4 py-2">{order.total_amount}</td>
              <td className="px-4 py-2">
                <Badge variant={STATUS_VARIANT[order.status as keyof typeof STATUS_VARIANT]}>{order.status}</Badge>
              </td>
              <td className="px-4 py-2 text-xs text-zinc-500">
                {formatDateTime(order.created_at, locale)}
              </td>
              <td className="px-4 py-2">
                {order.status === "pending" && (
                  <div className="flex justify-center gap-2">
                    <form action={markOrderPaidAction}>
                      <input type="hidden" name="id" value={order.id} />
                      <Button type="submit" variant="secondary" size="sm">
                        {o.markPaid}
                      </Button>
                    </form>
                    <form action={cancelOrderAction}>
                      <input type="hidden" name="id" value={order.id} />
                      <Button type="submit" variant="destructive" size="sm">
                        {o.cancel}
                      </Button>
                    </form>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
