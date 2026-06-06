import { MapPin } from "lucide-react";
import { requireUser } from "@/server/auth/guard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Addresses",
  robots: { index: false, follow: false },
};

export default async function AccountAddressesPage() {
  await requireUser("/account/addresses");
  return (
    <>
      <h1 className="font-display text-3xl sm:text-4xl">Addresses</h1>
      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-cream-3 bg-cream px-6 py-16 text-center">
        <MapPin size={28} className="text-taupe" />
        <p className="mt-4 font-medium text-ink">Saved addresses are coming</p>
        <p className="mt-1 max-w-xs text-sm text-ink-soft">
          Save delivery addresses and pick one in a tap at checkout.
        </p>
      </div>
    </>
  );
}
