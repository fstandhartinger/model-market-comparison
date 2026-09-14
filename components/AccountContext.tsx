"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { ACCOUNT_MARKER_KEY, planPresetSync, planSettingsSync, SIGNIN_TOAST_KEY } from "../lib/account-sync.mjs";
import { sanitizeStore, STORE_KEY } from "../lib/presets.mjs";
import { useSettings } from "./SettingsContext";

export interface AccountUser { id: string; email: string; name: string | null; image: string | null }
type Status = "loading" | "disabled" | "signed-out" | "signed-in";

interface AccountCtx {
  status: Status;
  user: AccountUser | null;
  signInWithGoogle: () => void;
  signOutNow: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  /** CR-5.3: call after a signed-out save; shows the sign-in suggestion once per session. */
  suggestSignIn: () => void;
}

const fallback: AccountCtx = { status: "disabled", user: null, signInWithGoogle: () => {}, signOutNow: async () => {}, deleteAccount: async () => false, suggestSignIn: () => {} };
const Ctx = createContext<AccountCtx>(fallback);
const PRESET_EVENT = "bh-presets";

const readLocalPresets = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? "null"); } catch { return null; } };
const put = (body: unknown) => fetch("/api/account", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.text()).catch(() => undefined);

/** CR-5.1 – CR-5.4: account state, the sync of presets and settings, and the signed-out toast. */
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const { hydrated, settingsState, replaceSettings } = settings;
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AccountUser | null>(null);
  const [synced, setSynced] = useState(false);
  const [toast, setToast] = useState(false);
  const lastSettings = useRef<string>("");

  // Load the account once stored settings are in place, so applying the account's copy is not undone.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/account", { cache: "no-store" }).catch(() => null);
      const data = res?.ok ? await res.json().catch(() => null) : null;
      if (cancelled) return;
      if (!data?.enabled) { setStatus("disabled"); return; }
      if (!data.user) { setStatus("signed-out"); return; }
      const uid: string = data.user.id;
      const presetPlan = planPresetSync({ account: data.presets, local: readLocalPresets(), syncedUid: localStorage.getItem(ACCOUNT_MARKER_KEY), uid });
      try { localStorage.setItem(STORE_KEY, JSON.stringify(presetPlan.presets)); localStorage.setItem(ACCOUNT_MARKER_KEY, uid); } catch { /* storage blocked */ }
      window.dispatchEvent(new Event(PRESET_EVENT));
      const settingsPlan = planSettingsSync({ accountSettings: data.settings, localSettings: settingsState });
      // A shared link's filters (?f=, CR-2.5) win over the account's stored ones for this visit.
      const urlFilters = new URLSearchParams(window.location.search).has("f");
      if (settingsPlan.apply && !urlFilters) { replaceSettings(settingsPlan.apply); lastSettings.current = JSON.stringify(settingsPlan.apply); }
      const body: Record<string, unknown> = {};
      if (presetPlan.push) body.presets = presetPlan.presets;
      if (settingsPlan.push) { body.settings = settingsState; lastSettings.current = JSON.stringify(settingsState); }
      if (Object.keys(body).length) await put(body);
      setUser(data.user);
      setStatus("signed-in");
      setSynced(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once after hydration
  }, [hydrated]);

  // Signed in: preset changes (any menu, this tab) go to the account, debounced.
  useEffect(() => {
    if (!synced) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => { clearTimeout(timer); timer = setTimeout(() => put({ presets: sanitizeStore(readLocalPresets()) }), 800); };
    window.addEventListener(PRESET_EVENT, onChange);
    return () => { window.removeEventListener(PRESET_EVENT, onChange); clearTimeout(timer); };
  }, [synced]);

  // Signed in: settings changes go to the account, debounced; unchanged payloads are not re-sent.
  useEffect(() => {
    if (!synced) return;
    const text = JSON.stringify(settingsState);
    if (text === lastSettings.current) return;
    const timer = setTimeout(() => { lastSettings.current = text; put({ settings: settingsState }); }, 1200);
    return () => clearTimeout(timer);
  }, [synced, settingsState]);

  const signInWithGoogle = useCallback(() => { void signIn("google", { redirectTo: window.location.href }); }, []);
  const signOutNow = useCallback(async () => {
    await signOut({ redirect: false });
    setUser(null); setSynced(false); setStatus("signed-out");
  }, []);
  const deleteAccount = useCallback(async () => {
    const res = await fetch("/api/account", { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return false;
    try { localStorage.removeItem(ACCOUNT_MARKER_KEY); } catch { /* ignore */ }
    await signOut({ redirect: false });
    setUser(null); setSynced(false); setStatus("signed-out");
    return true;
  }, []);
  const suggestSignIn = useCallback(() => {
    if (status !== "signed-out") return;
    try { if (sessionStorage.getItem(SIGNIN_TOAST_KEY)) return; sessionStorage.setItem(SIGNIN_TOAST_KEY, "1"); } catch { /* ignore */ }
    setToast(true);
  }, [status]);

  const value = useMemo(() => ({ status, user, signInWithGoogle, signOutNow, deleteAccount, suggestSignIn }), [status, user, signInWithGoogle, signOutNow, deleteAccount, suggestSignIn]);

  return <Ctx.Provider value={value}>
    {children}
    {toast && <SignInToast onClose={() => setToast(false)} onSignIn={signInWithGoogle} />}
  </Ctx.Provider>;
}

export const useAccount = () => useContext(Ctx);

/** CR-5.3: never blocks the action that triggered it; dismissible; hides itself after a while. */
function SignInToast({ onClose, onSignIn }: { onClose: () => void; onSignIn: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 15_000);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(timer); document.removeEventListener("keydown", onKey); };
  }, [onClose]);
  return <div role="status" aria-live="polite" data-bh-signin-toast className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-md items-start gap-3 rounded-xl border border-line bg-panel p-3 text-sm shadow-xl">
    <div className="min-w-0 flex-1">
      <p className="font-semibold">Saved in this browser only</p>
      <p className="bh-muted mt-0.5 text-xs">Sign in with Google so your presets are not lost and follow you to other browsers.</p>
      <button type="button" className="bh-button mt-2 !min-h-9 !py-1.5 text-sm" onClick={() => { onClose(); onSignIn(); }}>Sign in with Google</button>
    </div>
    <button type="button" aria-label="Dismiss" className="bh-preset-icon shrink-0" onClick={onClose}>×</button>
  </div>;
}
