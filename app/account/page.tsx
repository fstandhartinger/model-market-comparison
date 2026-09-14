import type { Metadata } from "next";
import { AccountPanel } from "../../components/AccountPanel";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default function AccountPage() {
  return <div className="mx-auto max-w-xl">
    <h1 className="text-2xl font-bold">Account</h1>
    <AccountPanel />
  </div>;
}
