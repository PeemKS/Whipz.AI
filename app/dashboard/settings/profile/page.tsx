import { getCurrentUser } from "@/lib/supabase/getCurrentUser";
import { nameFromEmail, initialFromEmail } from "@/lib/format/userName";
import { updateUserProfileAction, removeAvatarAction } from "@/app/dashboard/settings/profile/actions";
import { getT } from "@/lib/i18n/getT";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default async function ProfileSettingsPage() {
  const { email, name, avatarUrl } = await getCurrentUser();
  const t = await getT();
  const s = t.settings;
  const displayName = name ?? nameFromEmail(email);

  return (
    <Card className="max-w-lg">
      <h2 className="font-medium mb-3">{s.profileTitle}</h2>

      <div className="flex items-center gap-3 mb-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={displayName} className="w-14 h-14 rounded-full object-cover border border-zinc-200 shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-zinc-900 text-white flex items-center justify-center text-lg font-medium shrink-0">
            {initialFromEmail(email)}
          </div>
        )}
        {avatarUrl && (
          <form action={removeAvatarAction}>
            <Button type="submit" variant="secondary" size="sm">
              {s.removePhoto}
            </Button>
          </form>
        )}
      </div>

      <form action={updateUserProfileAction} className="space-y-3">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">{s.photo}</label>
          <input name="avatar" type="file" accept="image/*" className="text-xs" />
        </div>
        <div>
          <label className="text-xs text-zinc-500">{s.name}</label>
          <Input name="full_name" defaultValue={displayName} placeholder={s.namePlaceholder} />
        </div>
        <div>
          <label className="text-xs text-zinc-500">{s.email}</label>
          <Input value={email ?? ""} disabled readOnly className="bg-zinc-50 text-zinc-500 cursor-not-allowed" />
          <p className="text-xs text-zinc-400 mt-1">{s.emailNote}</p>
        </div>
        <Button type="submit">{t.common.save}</Button>
      </form>
    </Card>
  );
}
