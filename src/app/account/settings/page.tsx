import { requireUser } from "@/server/auth/guard";
import { AccountSettingsForm } from "@/components/account/AccountSettingsForm";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function AccountSettingsPage() {
  const user = (await requireUser("/account/settings")) as {
    name: string;
    email: string;
    phone?: string | null;
    marketingOptIn?: boolean;
  };

  return (
    <>
      <h1 className="font-display text-3xl sm:text-4xl">Settings</h1>
      <p className="mt-2 text-ink-soft">Your profile, password and email preferences.</p>
      <div className="mt-8">
        <AccountSettingsForm
          name={user.name}
          email={user.email}
          phone={user.phone ?? ""}
          marketingOptIn={!!user.marketingOptIn}
        />
      </div>
    </>
  );
}
