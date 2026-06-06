import { requireUser } from "@/server/auth/guard";
import { getUserAddresses } from "@/server/db/addresses";
import { AddressManager } from "@/components/account/AddressManager";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Addresses",
  robots: { index: false, follow: false },
};

export default async function AccountAddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await getUserAddresses(user.id);

  return (
    <>
      <h1 className="font-display text-3xl sm:text-4xl">Addresses</h1>
      <p className="mt-2 text-ink-soft">
        Save delivery addresses and pick one in a tap at checkout.
      </p>
      <div className="mt-8">
        <AddressManager addresses={addresses} />
      </div>
    </>
  );
}
