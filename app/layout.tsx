import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Sidebar } from "@/app/Sidebar";
import { TopBar } from "@/app/TopBar";
import { getT } from "@/lib/i18n/getT";
import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { getCurrentUser } from "@/lib/supabase/getCurrentUser";
import { getLocale } from "@/lib/i18n/getLocale";
import { nameFromEmail } from "@/lib/format/userName";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Omnichannel AI Agent & CRM",
  description: "Multi-agent conversational commerce platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const t = await getT();
  const locale = await getLocale();
  const cookieStore = await cookies();
  const sidebarCollapsed = cookieStore.get("sidebar_collapsed")?.value === "true";
  // Only signed-in requests may query `tenants` — RLS evaluates
  // app_current_tenant_ids(), which anon has no EXECUTE grant on (see
  // migration 0007_lock_down_security_definer_fns), so this must stay
  // gated behind a real session or it 500s on /login and /signup.
  const { email, name, avatarUrl } = await getCurrentUser();
  const { tenant } = email ? await getCurrentTenant() : { tenant: null };
  const displayName = name ?? nameFromEmail(email);

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full flex bg-[var(--app-bg)]">
        <Sidebar
          labels={t.nav}
          initialCollapsed={sidebarCollapsed}
          tenant={tenant ? { business_name: tenant.business_name, logo_url: tenant.logo_url } : null}
          signOutLabel={t.shell.signOut}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <TopBar
            locale={locale}
            displayName={displayName}
            email={email}
            avatarUrl={avatarUrl}
            searchPlaceholder={t.shell.search}
          />
          <main className="flex-1 min-h-0 overflow-y-auto px-6 py-8">
            <div className="max-w-6xl mx-auto h-full">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
