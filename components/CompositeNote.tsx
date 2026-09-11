import Link from 'next/link';
export function CompositeNote({ date = '2026-09-09' }: { date?: string }) {
  return <details className="bh-panel my-4 p-4 text-sm bh-muted"><summary>Composite retains Coding Agent v1.4 · source {date}</summary><p className="mt-2">The five Composite inputs remain unchanged. Its Coding Agent input is the median across complete harness results in the retained v1.4 snapshot from {date}. Artificial Analysis now publishes v1.5, with different components. <Link className="text-accent underline" href="/benchmarks?benchmark=aa-coding-agent-index%3A%3A1.5">Explore current v1.5 separately</Link>. Dated snapshot labels on other indices identify unversioned source captures, not a verified semantic version.</p></details>;
}
