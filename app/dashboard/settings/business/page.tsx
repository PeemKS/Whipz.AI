import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { updateProfileAction } from "@/app/dashboard/settings/actions";
import { WEEK_DAYS } from "@/lib/supabase/types";
import { getT } from "@/lib/i18n/getT";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";

export default async function BusinessSettingsPage() {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const t = await getT();
  const s = t.settings;

  return (
    <Card className="max-w-lg">
      <h2 className="font-medium mb-3">{s.businessProfile}</h2>
      <form action={updateProfileAction} className="space-y-3">
        <input type="hidden" name="tenant_id" value={tenant.id} />

        <div className="flex items-center gap-3">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt={tenant.business_name}
              className="w-14 h-14 rounded-full object-cover border border-zinc-200"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-400">
              {s.noLogo}
            </div>
          )}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">{s.logo}</label>
            <input name="logo" type="file" accept="image/*" className="text-xs" />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500">{s.businessName}</label>
          <Input name="business_name" required defaultValue={tenant.business_name} />
        </div>
        <div>
          <label className="text-xs text-zinc-500">{s.category}</label>
          <Input name="category" defaultValue={tenant.category ?? ""} placeholder={s.categoryPlaceholder} />
        </div>
        <div>
          <label className="text-xs text-zinc-500">{s.address}</label>
          <Input name="address" defaultValue={tenant.address ?? ""} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500">{s.phone}</label>
            <Input name="phone" defaultValue={tenant.phone ?? ""} />
          </div>
          <div>
            <label className="text-xs text-zinc-500">{s.website}</label>
            <Input name="website" defaultValue={tenant.website ?? ""} placeholder="https://…" />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-500">{s.description}</label>
          <Textarea name="description" rows={2} defaultValue={tenant.description ?? ""} />
        </div>

        <div>
          <label className="text-xs text-zinc-500 block mb-1">{s.openingHours}</label>
          <div className="space-y-1">
            {WEEK_DAYS.map((day) => {
              const hours = tenant.opening_hours[day];
              return (
                <div key={day} className="flex items-center gap-2 text-sm">
                  <span className="w-24 shrink-0 text-xs text-zinc-500">{s.days[day]}</span>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Toggle name={`hours_${day}_closed`} defaultChecked={hours?.closed ?? false} autoSubmit={false} />
                    <span>{s.closed}</span>
                  </div>
                  <input
                    type="time"
                    name={`hours_${day}_open`}
                    defaultValue={hours?.open ?? "09:00"}
                    className="border border-zinc-200 bg-white rounded-xl px-2 py-1 text-xs"
                  />
                  <span className="text-xs text-zinc-400">{s.to}</span>
                  <input
                    type="time"
                    name={`hours_${day}_close`}
                    defaultValue={hours?.close ?? "18:00"}
                    className="border border-zinc-200 bg-white rounded-xl px-2 py-1 text-xs"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <Button type="submit">{t.customers.saveProfile}</Button>
      </form>
    </Card>
  );
}
