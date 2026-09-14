"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "./AccountContext";

function Avatar({ name, image, size = 28 }: { name: string | null; image: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (image && !broken) {
    // eslint-disable-next-line @next/next/no-img-element -- a 28 px Google avatar; no optimisation needed
    return <img src={image} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-full" onError={() => setBroken(true)} />;
  }
  return <span aria-hidden="true" className="inline-flex items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent" style={{ width: size, height: size }}>{(name ?? "?").trim().charAt(0).toUpperCase()}</span>;
}

/** CR-5.1: desktop header control. Phones reach the same through More → Account. Renders nothing while
 *  accounts are not enabled, so the header never offers a sign-in that cannot work. */
export function AccountButton() {
  const { status, user, signInWithGoogle, signOutNow } = useAccount();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  if (status === "loading" || status === "disabled") return null;
  if (status === "signed-out") {
    return <button type="button" data-bh-signin className="bh-nav-button hidden min-h-10 items-center rounded-md px-2.5 text-sm text-gray-300 hover:bg-accent/10 hover:text-accent lg:inline-flex" onClick={signInWithGoogle}>Sign in</button>;
  }
  return <div ref={box} className="relative hidden lg:block">
    <button type="button" data-bh-account className="bh-nav-button inline-flex min-h-10 items-center rounded-md px-1.5 hover:bg-accent/10" aria-expanded={open} aria-label={`Account: ${user?.name ?? user?.email ?? ""}`} onClick={() => setOpen(!open)}>
      <Avatar name={user?.name ?? user?.email ?? null} image={user?.image ?? null} />
    </button>
    {open && <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-line bg-panel p-2 shadow-lg">
      <div className="px-3 py-2">
        <p className="truncate text-sm font-semibold">{user?.name ?? user?.email}</p>
        <p className="bh-muted truncate text-xs">{user?.email}</p>
        <p className="bh-muted mt-1.5 text-xs">Your presets and settings sync to this account.</p>
      </div>
      <Link href="/account" className="block rounded-md px-3 py-2.5 text-sm hover:bg-accent/5" onClick={() => setOpen(false)}>Account &amp; data</Link>
      <button type="button" className="block w-full rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent/5" onClick={() => { setOpen(false); void signOutNow(); }}>Sign out</button>
    </div>}
  </div>;
}

/** Phone header: an entry in the More menu while accounts are enabled. */
export function AccountMenuLink({ className }: { className: string }) {
  const { status } = useAccount();
  if (status === "loading" || status === "disabled") return null;
  return <Link href="/account" className={className}>{status === "signed-in" ? "Account" : "Sign in"}</Link>;
}

export { Avatar };
