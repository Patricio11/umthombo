import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/guard";
import { AdminShell } from "@/components/admin/AdminShell";
import { ToastProvider } from "@/components/admin/Toast";
import { ConfirmProvider } from "@/components/admin/ConfirmDialog";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Umthombo Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminShell user={{ name: user.name, email: user.email }}>
          {children}
        </AdminShell>
      </ConfirmProvider>
    </ToastProvider>
  );
}
