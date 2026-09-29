"""Deterministic route generation from a trusted Git base, never evaluator source files."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import re
import subprocess


def render(repo, base, plans, artifacts, target):
    target.mkdir(parents=True, exist_ok=True)
    output = dict(artifacts)
    generated = {}
    def read(path):
        if path in generated:
            return generated[path]
        return subprocess.check_output(['git', '-C', str(repo), 'show', f'{base}:{path}'], text=True)
    def write(path, text):
        generated[path] = text
    for benchmark, plan in plans.items():
        version, prior = plan['version'], plan['previous_version']
        artifact = plan['artifact_path']
        sha = hashlib.sha256(artifacts[artifact].read_bytes()).hexdigest()
        if benchmark == 'jevbench':
            old_fn = 'readJevbenchV' + prior[1:].replace('.', '') + 'Release'
            new_fn = 'readJevbenchV' + version[1:].replace('.', '') + 'Release'
            reader = 'lib/jevbench-v15-release.mjs'
            # Freeze the candidate bytes and run the entire existing v1.5 method/schema gate.
            # Only the revision label is projected to its already-supported parent revision.
            addition = f'''
export async function {new_fn}(root = process.cwd()) {{
  const bytes = await readFile(`${{root}}/{artifact}`);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== {json.dumps(sha)}) throw new Error('Fast-lane artifact changed');
  const artifact = JSON.parse(bytes.toString('utf8'));
  if (artifact.revision !== {json.dumps(version)} || artifact.status !== 'released') throw new Error('Fast-lane revision mismatch');
  validateJevbenchV15Preview({{ ...artifact, revision: 'v1.5.2' }});
  return {{ artifact, bytes, sha256 }};
}}
'''
            write(reader, read(reader) + addition)
            declarations = 'lib/jevbench-v15-release.d.mts'
            write(declarations, read(declarations) + f'\nexport const {new_fn}: typeof readJevbenchV152Release;\n')
            for old, new in ((f'app/jev-models/{prior}/page.tsx', f'app/jev-models/{version}/page.tsx'),
                             (f'app/api/jevbench/{prior}/route.ts', f'app/api/jevbench/{version}/route.ts'),
                             ('app/jev-models/page.tsx', 'app/jev-models/page.tsx')):
                source = read(old)
                if old_fn not in source:
                    raise ValueError('unsupported trusted release page template')
                write(new, source.replace(old_fn, new_fn).replace(prior, version))
            sitemap = read('app/sitemap.ts')
            needle = json.dumps('/jev-models/' + prior)
            if needle not in sitemap:
                raise ValueError('trusted sitemap lacks previous version')
            write('app/sitemap.ts', sitemap.replace(needle, needle + ', ' + json.dumps('/jev-models/' + version), 1))
            component_path = 'components/JevBenchV15ReleasePage.tsx'
            component = read(component_path)
            # Retain every wrapper/chart and add the new parent branch to existing comparisons.
            component = component.replace("const previousKeys = artifact.revision", f"const previousKeys = artifact.revision === '{version}'\n    ? (await {old_fn}()).artifact.systems.map((row: {{ key: string }}) => row.key)\n    : artifact.revision", 1)
            if not re.search(r'import \{[^}]*\b' + old_fn + r'\b', component):
                component = "import { " + old_fn + " } from '../lib/jevbench-v15-release.mjs';\n" + component
            component = component.replace("href={artifact.revision", f"href={{artifact.revision === '{version}' ? '/jev-models/{prior}' : artifact.revision", 1)
            component = component.replace("}>{artifact.revision", f"}}>{{artifact.revision === '{version}' ? 'JevBench {prior}' : artifact.revision", 1)
            write(component_path, component)
        else:
            # Existing page and formatters remain byte-for-byte, except fixed version metadata.
            # An exact hash seals the fully host-validated artifact; old version validators remain.
            reader = 'lib/jevbench-multimodal-preview.mjs'
            source = read(reader)
            name = 'readFastlaneImage' + version[1:].replace('.', '_')
            addition = f'''
export async function {name}() {{
  const bytes = await readFile(path.join(process.cwd(), {json.dumps(artifact)}));
  if (createHash('sha256').update(bytes).digest('hex') !== {json.dumps(sha)}) throw new Error('Fast-lane ImageJevBench artifact changed');
  const a = JSON.parse(bytes.toString('utf8'));
  if (a.revision !== {json.dumps(version)}) throw new Error('Fast-lane image revision mismatch');
  assertFastlaneAggregateOnly(a);
  for (const row of a.ranking) validateAggregateTracks(row.tracks, row.key);
  a.release_version = a.revision;
  return a;
}}
'''
            if 'function assertFastlaneAggregateOnly(' not in source:
                start = source.index('  const forbidden = new Set([')
                end = source.index('  return a;', start)
                source += '\nfunction assertFastlaneAggregateOnly(a) {\n' + source[start:end] + '}\n'
            write(reader, source + addition)
            page = 'app/jev-models/multimodal-preview/page.tsx'
            source = read(page)
            # Only replace the data reader (including prior generated readers on later runs).
            source = re.sub(r'\bread(?:MultimodalPreview|FastlaneImage\d+_\d+_\d+)\b', name, source)
            source = source.replace(f"title: 'Image JevBench {prior}'", f"title: 'Image JevBench {version}'")
            source = source.replace(f"Image JevBench {prior} results", f"Image JevBench {version} results")
            write(page, source)
            page = 'app/image-jev-bench/page.tsx'
            write(page, read(page).replace('Image JevBench ' + prior, 'Image JevBench ' + version))
    for path, text in generated.items():
        dest = target / path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text)
        output[path] = dest
    return output
