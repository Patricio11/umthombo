import { requireUser } from "@/server/auth/guard";
import { AccountShell } from "@/components/account/AccountShell";

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("/account");
  const firstName = (user.name || "").trim().split(/\s+/)[0] || "there";
  return (
    <AccountShell firstName={firstName} email={user.email}>
      {children}
    </AccountShell>
  );
}
