import { getT } from "@/lib/i18n/getT";
import { SignupForm } from "@/app/signup/SignupForm";

export default async function SignupPage() {
  const t = await getT();
  return <SignupForm t={t.auth} />;
}
