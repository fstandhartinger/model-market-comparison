"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "./AccountContext";
import { Avatar } from "./AccountButton";

/** CR-5.1 / CR-5.5: sign in, what is stored, sign out, and "delete my account and data". */
export function AccountPanel() {
  const { status, user, signInWithGoogle, signOutNow, deleteAccount } = useAccount();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    // Auth.js sends failed sign-ins here with ?error=…
    if (new URLSearchParams(window.location.search).has("error")) setMessage("Sign-in did not complete. Please try again.");
  }, []);

  return <section className="mt-4 grid gap-4 text-sm">
    {message && <p role="alert" className="rounded-lg border border-line bg-accent/5 px-3 py-2">{message}</p>}
    {status === "loading" && <p className="bh-muted">Checking your sign-in…</p>}
    {status === "disabled" && <p className="bh-muted">Accounts are not available yet. Your saved presets and settings stay in this browser.</p>}
    {status === "signed-out" && <>
      <p>Sign in to keep your saved presets and settings in an account, so they are not lost and follow you to other browsers. Presets you already saved in this browser are added to the account on the first sign-in.</p>
      <div><button type="button" data-bh-account-signin className="bh-button" onClick={signInWithGoogle}>Sign in with Google</button></div>
    </>}
    {status === "signed-in" && user && <>
      <div className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3">
        <Avatar name={user.name ?? user.email} image={user.image} size={40} />
        <div className="min-w-0"><p className="truncate font-semibold">{user.name ?? user.email}</p><p className="bh-muted truncate text-xs">{user.email}</p></div>
      </div>
      <div>
        <h2 className="font-semibold">What we store</h2>
        <p className="bh-muted mt-1">Your Google account ID, email address, name and profile picture link, plus the presets and settings you save here. Nothing else. Details in the <Link className="text-accent" href="/privacy">privacy policy</Link>.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="bh-button" onClick={() => void signOutNow()}>Sign out</button>
        {!confirming && <button type="button" data-bh-delete-account className="bh-button" onClick={() => setConfirming(true)}>Delete my account and data</button>}
      </div>
      {confirming && <div role="alertdialog" aria-labelledby="bh-delete-title" className="rounded-xl border border-red-500/40 p-3">
        <p id="bh-delete-title" className="font-semibold">Delete your account?</p>
        <p className="bh-muted mt-1">This removes your account, saved presets and settings from our database right away. Presets remain in this browser until you clear them.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" data-bh-delete-confirm className="bh-button !border-red-500/60 text-red-500" onClick={async () => { const ok = await deleteAccount(); setConfirming(false); setMessage(ok ? "Your account and its data were deleted." : "Deleting did not work. Please try again."); }}>Delete permanently</button>
          <button type="button" className="bh-button" onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      </div>}
    </>}
  </section>;
}
