import { getT } from "@/lib/i18n/getT";
import { LoginForm } from "@/app/login/LoginForm";

export default async function LoginPage() {
  const t = await getT();
  return <LoginForm t={t.auth} />;
}
