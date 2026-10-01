import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '../../../auth';
import { isAdminEmail } from '../../../lib/admin-access.mjs';
import { listSubmissions, setSubmissionStatus, SUBMISSION_STATUSES } from '../../../lib/model-submission-db';
import { submissionReference } from '../../../lib/model-submission.mjs';
import { BENCHMARK_LABELS } from '../../../lib/submission-shared.mjs';

export const metadata: Metadata = { title: 'Submissions (admin)', robots: { index: false, follow: false, googleBot: { index: false, follow: false } } };
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await auth().catch(() => null);
  if (!isAdminEmail(session?.user?.email)) notFound();
}

async function mark(formData: FormData) {
  'use server';
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (/^[0-9a-f-]{36}$/i.test(id) && (status === 'spam' || status === 'rejected')) await setSubmissionStatus(id, status);
  revalidatePath('/admin/submissions');
}

const date = (d: Date | null) => d ? new Date(d).toISOString().replace('T', ' ').slice(0, 16) : '—';
const host = (u: string | null) => { try { return u ? new URL(u).host + new URL(u).pathname : ''; } catch { return u ?? ''; } };

export default async function AdminSubmissionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = SUBMISSION_STATUSES.find((s) => s === status) ?? null;
  const rows = await listSubmissions(filter);
  const tabs: [string, string | null][] = [['queued', 'queued'], ['awaiting_payment', 'awaiting_payment'], ['in_evaluation', 'in_evaluation'], ['evaluated', 'evaluated'], ['rejected', 'rejected'], ['spam', 'spam'], ['all', null]];
  const cell = 'p-2 align-top text-left';
  return <div className="max-w-[1400px] text-sm">
    <h1 className="text-2xl font-bold">Model submissions</h1>
    <nav className="mt-4 flex flex-wrap gap-2" aria-label="Status filter">
      {tabs.map(([label, value]) => <Link key={label} href={value ? `/admin/submissions?status=${value}` : '/admin/submissions'}
        className={`rounded-md border border-line px-3 py-1.5 ${value === filter ? 'bg-accent/10 text-accent' : 'hover:bg-accent/5'}`} aria-current={value === filter ? 'page' : undefined}>{label}</Link>)}
    </nav>
    <p className="bh-muted mt-3 text-xs">{rows.length} shown (newest first, max 200). API keys are never displayed. Status changes beyond spam/rejected happen via the Sandy CLI.</p>
    <div className="mt-3 overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[1200px]">
        <thead><tr className="bg-[rgb(var(--line)/.25)]">
          {['Created', 'Ref', 'Model', 'Links', 'Benchmarks', 'Follow-up', 'Fast lane', 'Contact', 'Key', 'Queue #', 'Intake sync', 'Confirm', 'Status', ''].map((h) => <th key={h} className={`${cell} font-semibold`}>{h}</th>)}
        </tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-line">
          <td className={`${cell} whitespace-nowrap`}>{date(r.created_at)}</td>
          <td className={`${cell} font-mono`}>{submissionReference(r.submission_id)}</td>
          <td className={cell}>{r.model_name}</td>
          <td className={`${cell} break-all`}>{[r.github_url, r.huggingface_url, r.api_url].filter(Boolean).map((u) => <div key={u}>{host(u)}</div>)}</td>
          <td className={cell}>{r.benchmarks.map((b) => BENCHMARK_LABELS[b as keyof typeof BENCHMARK_LABELS] ?? b).join(', ')}</td>
          <td className={cell}>{r.followup_name ? `${r.followup_name} (#${r.followup_rank}, ${BENCHMARK_LABELS[r.followup_benchmark as keyof typeof BENCHMARK_LABELS] ?? r.followup_benchmark})` : '—'}</td>
          <td className={cell}>{r.fast_lane ? `yes · ${r.priority_status ?? 'no request'}${r.priority_paid_at ? ` · paid ${date(r.priority_paid_at)}` : ''}` : 'no'}</td>
          <td className={`${cell} break-all`}>{r.contact_email}{r.contact_x ? <div>@{r.contact_x}</div> : null}</td>
          <td className={cell}>{r.api_key_present ? 'stored (encrypted)' : 'no'}</td>
          <td className={cell}>{r.queue_position ?? '—'}</td>
          <td className={`${cell} whitespace-nowrap`}>{date(r.intake_synced_at)}</td>
          <td className={cell}>{r.confirmation_status}</td>
          <td className={cell}>{r.status}</td>
          <td className={cell}>{(r.status === 'queued' || r.status === 'awaiting_payment') && <form action={mark} className="flex gap-1">
            <input type="hidden" name="id" value={r.id} />
            <button className="bh-button" name="status" value="spam" type="submit">Spam</button>
            <button className="bh-button" name="status" value="rejected" type="submit">Reject</button>
          </form>}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
