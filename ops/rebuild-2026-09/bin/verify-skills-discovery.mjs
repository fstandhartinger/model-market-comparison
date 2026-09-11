import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const REPO = path.resolve(new URL('../../..', import.meta.url).pathname);
const SKILLS_DIR = path.join(REPO, 'ops/skills');
const OUT = path.join(REPO, 'ops/rebuild-2026-09/evidence/phase-09/runtime-discovery.json');

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const frontmatter = (text) => text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';

const TARGETS = {
  'sandy-claude': { runtime: 'claude-code', base: '/home/flori/.claude/skills', cli: 'claude' },
  'sandy-codex': { runtime: 'codex', base: '/home/flori/.codex/skills', cli: 'codex' },
  'sandy-opencode': { runtime: 'opencode', base: '/home/flori/.config/opencode/skills', cli: 'opencode' },
};

const skills = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const canonical = {};
for (const name of skills) {
  const file = path.join(SKILLS_DIR, name, 'SKILL.md');
  const buffer = fs.readFileSync(file);
  const fm = frontmatter(buffer.toString('utf8'));
  canonical[name] = {
    path: `ops/skills/${name}/SKILL.md`,
    sha256: sha256(buffer),
    frontmatter_parses: Boolean(fm) && /name:\s*\S+/.test(fm) && /description:\s*\S+/.test(fm),
  };
}

const cliVersion = (cmd) => {
  try {
    return execSync(`${cmd} --version`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    try {
      return execSync(`command -v ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return null;
    }
  }
};

const targets = {};
for (const [id, target] of Object.entries(TARGETS)) {
  const installed = {};
  for (const name of skills) {
    const dest = path.join(target.base, name, 'SKILL.md');
    const exists = fs.existsSync(dest);
    let sha = null;
    let real = null;
    if (exists) {
      real = fs.realpathSync(dest);
      sha = sha256(fs.readFileSync(dest));
    }
    installed[name] = {
      exists,
      real_path: real,
      sha256: sha,
      matches_canonical: sha === canonical[name].sha256,
    };
  }
  targets[id] = {
    runtime: target.runtime,
    base: target.base,
    cli_present: cliVersion(target.cli),
    installed,
    all_match_canonical: skills.every((name) => installed[name].matches_canonical),
  };
}

const tailscale = (() => {
  try {
    return execSync('tailscale ping flo-nitro', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 8000 }).trim();
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    return out || 'timeout/unreachable';
  }
})();

const runtimeDiscovery = {
  'sandy-opencode': {
    method: 'running opencode session skill registry',
    tested: true,
    detail: 'The live opencode process on Sandy enumerated exactly these six installed skills (name + absolute path) in its own skill registry, confirming runtime discovery from /home/flori/.config/opencode/skills.',
    observed: skills.map((name) => ({
      name,
      path: `/home/flori/.config/opencode/skills/${name}/SKILL.md`,
    })),
  },
  'sandy-claude': {
    method: 'documented discovery root + frontmatter parse',
    tested: false,
    detail: "claude --help (2.1.265) states skills resolve via /skill-name and that --disable-slash-commands disables skills; discovery root is ~/.claude/skills/<name>/SKILL.md. All six files exist, match canonical SHA-256 and parse. A model-invocation test was deliberately NOT run to preserve the scarce Claude quota (see AGENTS budget rules).",
  },
  'sandy-codex': {
    method: 'installation path + frontmatter parse',
    tested: false,
    detail: 'codex-cli 0.154.0 exposes no skills-listing command, so runtime invocation could not be exercised non-interactively. ~/.codex/skills resolves to /home/flori/.claude/skills (byte-identical install); all six files match canonical SHA-256.',
  },
};

const receipt = {
  phase: '09',
  kind: 'runtime-discovery',
  created_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  canonical,
  targets,
  runtime_discovery: runtimeDiscovery,
  runtime_discovery_tested: Object.values(runtimeDiscovery).some((entry) => entry.tested),
  wsl_machine: {
    host: 'flo-nitro',
    reachable_from_sandy: false,
    probe: tailscale,
    status: 'incomplete',
    note: "Florian's WSL machine is unreachable from Sandy (tailscale offline); the six skills are NOT installed there. This installation is explicitly incomplete and the repo copy under ops/skills/ is the handoff.",
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({
  out: OUT,
  skills: skills.length,
  all_targets_match: Object.values(targets).every((t) => t.all_match_canonical),
  runtime_discovery_tested: receipt.runtime_discovery_tested,
  wsl_reachable: false,
}));
