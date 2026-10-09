"""Operator-owned, stdlib metadata-only preflight. Never imports customer/ML packages.
Run upstream-only BEFORE any weights, customer source or benchmark input is staged.
Container/image identity must be established separately by trusted pod engine receipts.
"""
import importlib.metadata as metadata
import json
import os
from pathlib import Path
import re
import shutil
import sys
import sysconfig

IMAGE = 'vllm/vllm-openai:v0.30.0@sha256:8a69ffad015f138d7170c4ddc429e230a3bc1c1719f67e14324749df200a4b90'
MINIMUM = {'torch': (2, 8), 'transformers': (5, 17),
           'flash-linear-attention': (0, 3), 'triton': (3, 3)}
REQUIRED = ['torch', 'transformers', 'flash-linear-attention', 'fla-core',
            'triton', 'einops', 'safetensors', 'huggingface-hub', 'numpy', 'accelerate']

def version_pair(value):
    match = re.match(r'^(\d+)\.(\d+)(?:\.|$)', value or '')
    return tuple(map(int, match.groups())) if match else None

def inspect():
    packages = {}
    failures = []
    for name in REQUIRED:
        try:
            distro = metadata.distribution(name)
            version = distro.version
            packages[name] = {'version': version, 'requires_dist': distro.requires or []}
        except metadata.PackageNotFoundError:
            packages[name] = {'version': None}
            failures.append('missing metadata: ' + name)
            continue
        pair = version_pair(version)
        if name in MINIMUM and (pair is None or pair < MINIMUM[name]):
            failures.append('below documented minimum: ' + name)
    fla = packages['flash-linear-attention']['version']
    core = packages['fla-core']['version']
    if fla and core and fla != core:
        failures.append('FLA and fla-core versions differ; exact dependency join review required')
    gcc = shutil.which('gcc')
    headers = [str(p) for p in [Path('/usr/include/stdio.h'),
                              Path('/usr/local/include/stdio.h')] if p.is_file()]
    if not gcc:
        failures.append('gcc executable absent')
    if not headers:
        failures.append('standard C header absent')
    if sys.version_info[:2] != (3, 12):
        failures.append('candidate known base expects Python 3.12')
    python_header = Path(sysconfig.get_path('include')) / 'Python.h'
    if not python_header.is_file():
        failures.append('Python C header absent')
    unexpected = [key for key in ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'HF_TOKEN',
                                  'HUGGING_FACE_HUB_TOKEN', 'AWS_ACCESS_KEY_ID',
                                  'AWS_SECRET_ACCESS_KEY'] if os.environ.get(key)]
    if unexpected:
        failures.append('credential variables present (values never reported)')
    return {'schema_version': 1, 'kind': 'upstream_metadata_only',
            'expected_image_identity': IMAGE, 'image_identity_proven': False,
            'python': sys.version.split()[0], 'packages': packages,
            'gcc_path': gcc, 'standard_c_headers': headers,
            'python_headers': python_header.is_file(), 'credential_variable_names_present': unexpected,
            'metadata_requirements_satisfied': not failures, 'failures': failures,
            'customer_source_imported': False, 'model_loaded': False,
            'native_kernels_proven': False, 'runtime_admitted': False,
            'next_gate': 'Root independently joins pinned image/provider receipt, package dependency review and approved native offline proof; this preflight grants no dispatch.'}

if __name__ == '__main__':
    result = inspect()
    print(json.dumps(result, indent=2))
    sys.exit(0 if result['metadata_requirements_satisfied'] else 2)
