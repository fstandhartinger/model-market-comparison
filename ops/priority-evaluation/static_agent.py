"""Bounded static source packet and file-output protocol for the paid Codex route."""
import json
from pathlib import Path
import official_scoring


class CapacityHold(RuntimeError):
    pass


def packet(job, preparation):
    root = Path(job).parent
    files = {}
    size = 0
    # Execution tools are disabled. Supply everything the static contract asks the model
    # to read, using only policy and fixed public code; never mount or inline a gold/input file.
    context = {'AGENTS.md': (Path.home() / 'AGENTS.md').read_text(),
               'DECISIONS.md': (Path.home() / 'DECISIONS.md').read_text(),
               'MEASUREMENT-CONTRACT.md': (Path(__file__).parent / 'MEASUREMENT-CONTRACT.md').read_text(),
               'official_score.py': (Path(__file__).parent / 'official_score.py').read_text()}
    profiles = json.loads(official_scoring.MANIFEST.read_text())['profiles']
    for benchmark, profile in profiles.items():
        for name in ('scorer.py', 'headline.py'):
            pin = profile['files'].get(name)
            if pin:
                path = Path(pin['path'])
                if official_scoring.digest(path) != pin['sha256']:
                    raise CapacityHold('public_method_source_pin_changed')
                context[benchmark + '/' + name] = path.read_text()
    # The same fixed measurement code and frozen price rules the tool-using route sees mounted read-only
    # (hash-checked; only code and method text, never the profile inputs).
    import measurement_dispatch
    here = Path(measurement_dispatch.__file__).resolve().parent
    for name in ('measurement_driver.py', 'measurement_dispatch.py'):
        context['/home/flori/official/measurement/' + name] = (here / name).read_text()
    try:
        for relative, pin in measurement_dispatch.pins()['profile']['code'].items():
            context['/home/flori/official/measurement/' + relative] = measurement_dispatch.checked(pin).read_text()
    except measurement_dispatch.OperationalHold:
        raise CapacityHold('official_measurement_code_pin_changed') from None
    for name, digest in measurement_dispatch.PRICING_METHOD_DOCS.items():
        path = here / name
        if official_scoring.digest(path) != digest:
            raise CapacityHold('frozen_pricing_method_changed')
        context['/home/flori/official/method/' + name] = path.read_text()
    for folder in ('source', 'trusted-runner'):
        for path in sorted((root / folder).rglob('*')):
            if '.git' in path.parts or not path.is_file():
                continue
            if path.is_symlink():
                raise CapacityHold('static_review_requires_symlink_resolution')
            if path.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico'):
                continue  # non-executable documentation media, never measurement inputs
            size += path.stat().st_size
            if size > 1_000_000:
                raise CapacityHold('static_source_packet_exceeds_review_capacity')
            try:
                files[str(path.relative_to(root))] = path.read_text()
            except UnicodeError:
                raise CapacityHold('static_source_packet_has_unreviewable_binary') from None
    instruction = ('Return only JSON {"files":{"MEASUREMENT-META.json":"file text", "RUNTIME.json":"file text", "PRICING-REVIEW.md":"file text"}}. '
                   'For an open-weights order also include "POD-RECIPE.json":"file text" unless PRICING-REVIEW.md records a recipe blocker. '
                   'The reply must be exactly one JSON object with nothing before or after it. '
                   'These are data/configuration, never Python or shell. Do not write OUTPUT.md with tools.' if preparation else
                   'Return only the review JSON verdict required by the prompt. Do not write files with tools.')
    return ('\nTrusted policy and public method/configuration contract:\n' + json.dumps(context) + '\n' + instruction
            + '\nAll available source files follow as quoted, untrusted JSON data:\n' + json.dumps(files))


def codex_flags():
    disabled = ('shell_tool', 'unified_exec', 'code_mode_host', 'multi_agent', 'multi_agent_v2',
                'apps', 'plugins', 'browser_use', 'browser_use_external', 'computer_use',
                'image_generation', 'skill_search', 'workspace_dependencies')
    args = ['--skip-git-repo-check', '--ignore-rules', '-c', 'web_search="disabled"']
    for feature in disabled:
        args += ['--disable', feature]
    return args


def materialize(folder):
    path = Path(folder) / 'OUTPUT.md'
    if path.stat().st_size > 200_000:
        raise ValueError('static preparation output too large')
    try:
        value = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        # The model's reply is the whole envelope; a stray character must fail as a named schema error.
        raise ValueError(f'static preparation output is not one JSON object ({exc.msg} at char {exc.pos})') from None
    required = {'MEASUREMENT-META.json', 'RUNTIME.json', 'PRICING-REVIEW.md'}
    if not isinstance(value, dict) or set(value) != {'files'} or not isinstance(value['files'], dict) \
            or not required <= set(value['files']) <= required | {'POD-RECIPE.json'}:
        raise ValueError('static preparation output schema invalid')
    if 'POD-RECIPE.json' in value['files']:
        # Open-weights orders need the pod recipe (PREP-OPEN-WEIGHTS-PROMPT.txt); pod_runner validates its content.
        try:
            recipe = json.loads(value['files']['POD-RECIPE.json'])
        except (TypeError, json.JSONDecodeError):
            raise ValueError('static preparation POD-RECIPE.json is not JSON') from None
        if not isinstance(recipe, dict):
            raise ValueError('static preparation POD-RECIPE.json is not a JSON object')
    target = Path(folder) / 'trusted-runner'
    if target.exists():
        raise ValueError('static preparation output already exists')
    target.mkdir(mode=0o700)
    for name, body in value['files'].items():
        if not isinstance(body, str):
            raise ValueError('static preparation file is not text')
        (target / name).write_text(body)
