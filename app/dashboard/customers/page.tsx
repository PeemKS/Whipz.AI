import Link from "next/link";
import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { listCustomers, listCustomerChannels } from "@/lib/db/customers";
import { getT } from "@/lib/i18n/getT";
import { Card } from "@/components/ui/Card";

export default async function CustomersPage() {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const db = await supabaseServerAuth();
  const [customers, channels] = await Promise.all([listCustomers(db, tenant.id), listCustomerChannels(db, tenant.id)]);
  const t = await getT();
  const c = t.customers;

  const channelsByCustomer = new Map<string, string[]>();
  for (const ch of channels) {
    const list = channelsByCustomer.get(ch.customer_id) ?? [];
    list.push(ch.channel);
    channelsByCustomer.set(ch.customer_id, list);
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <table className="w-full text-sm text-center">
        <thead className="bg-zinc-50 text-zinc-500">
          <tr>
            <th className="px-4 py-2 font-medium">{c.name}</th>
            <th className="px-4 py-2 font-medium">{c.channels}</th>
            <th className="px-4 py-2 font-medium">{c.email}</th>
            <th className="px-4 py-2 font-medium">{c.phone}</th>
          </tr>
        </thead>
        <tbody>
          {customers.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                {c.noneYet}
              </td>
            </tr>
          )}
          {customers.map((customer) => (
            <tr key={customer.id} className="border-t border-zinc-100 align-middle">
              <td className="px-4 py-2">
                <Link href={`/dashboard/customers/${customer.id}`} className="underline">
                  {customer.display_name ?? customer.id.slice(0, 8)}
                </Link>
              </td>
              <td className="px-4 py-2">{(channelsByCustomer.get(customer.id) ?? []).join(", ") || "—"}</td>
              <td className="px-4 py-2">{customer.email ?? "—"}</td>
              <td className="px-4 py-2">{customer.phone ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
