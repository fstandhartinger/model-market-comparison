import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPO = path.resolve(new URL('../../..', import.meta.url).pathname);
const SKILLS_DIR = path.join(REPO, 'ops/skills');
const RECEIPT = path.join(REPO, 'ops/rebuild-2026-09/evidence/phase-09/skills-install.json');
const TARGETS = {
  'sandy-claude': '/home/flori/.claude/skills',
  'sandy-codex': '/home/flori/.codex/skills',
  'sandy-opencode': '/home/flori/.config/opencode/skills',
};

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const frontmatter = (text) => text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';

const skills = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const canonical = {};
for (const name of skills) {
  const file = path.join(SKILLS_DIR, name, 'SKILL.md');
  const buffer = fs.readFileSync(file);
  const text = buffer.toString('utf8');
  const fm = frontmatter(text);
  canonical[name] = {
    path: `ops/skills/${name}/SKILL.md`,
    sha256: sha256(buffer),
    bytes: buffer.length,
    frontmatter_name: (fm.match(/name:\s*(\S+)/) ?? [])[1] ?? null,
    frontmatter_description: (fm.match(/description:\s*([\s\S]*)/) ?? [])[1]?.trim() ?? null,
  };
}

const targets = {};
for (const [id, base] of Object.entries(TARGETS)) {
  const installed = {};
  for (const name of skills) {
    const dest = path.join(base, name, 'SKILL.md');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), dest);
    installed[name] = { exists: true, sha256: sha256(fs.readFileSync(dest)) };
  }
  targets[id] = { base, installed };
}

const receipt = {
  phase: '09',
  kind: 'skills-install',
  created_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  canonical_repository_copy: canonical,
  targets,
  runtime_discovery_tested: false,
  changes: 'Round-1 critic E4: collect-openrouter-efficiency and collect-chutes-io-ratio frontmatter descriptions extended with an explicit auto-trigger clause. All six skills reinstalled on all three Sandy runtimes; hashes above are post-edit.',
  wsl_gap: "Florian's WSL machine (/home/flori/) unreachable from Sandy; skills not installed there.",
};

fs.writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2) + '\n');
const ok = skills.every((name) => Object.values(targets).every((t) => t.installed[name].sha256 === canonical[name].sha256));
console.log(JSON.stringify({ skills: skills.length, targets: Object.keys(targets), all_hashes_match: ok, receipt: RECEIPT }));
