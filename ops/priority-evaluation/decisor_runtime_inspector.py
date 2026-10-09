"""First-party metadata and exact reviewed patch bytes only; no ML/customer imports."""
import hashlib
import importlib.metadata as metadata
from importlib.machinery import PathFinder
import json
from pathlib import Path
import sys

IMAGE = 'docker.io/underlabsai/decisor-sglang@sha256:60aee212ef25b0d303213b1c144b32f01403191b923d93d09a610770f8a6ad60'
ROOT = '/sgl-workspace/sglang/python/sglang'
PATCHES = {'srt/models/qwen3_5_text.py': 'f4af2297b1c65a48ab331792f99a72169b5b9c32d5b6c6444b5814502daac830',
           'srt/managers/scheduler_components/batch_result_processor.py': 'f225919698d1926543974864ccfb31c5b809b0fab7f82717a09d8b576470919b'}
REQUIRED = ('sglang', 'torch', 'transformers', 'compressed-tensors', 'safetensors', 'sgl-kernel', 'flashinfer-python')

def inspect():
    failures = []
    packages = {}
    for name in REQUIRED:
        try: packages[name] = metadata.version(name)
        except metadata.PackageNotFoundError:
            packages[name] = None
            failures.append('missing package: ' + name)
    if packages['sglang'] != '0.5.20': failures.append('SGLang release differs')
    spec = PathFinder.find_spec('sglang', sys.path)  # resolves root without executing it
    origin = spec.origin if spec else None
    if origin != ROOT + '/__init__.py': failures.append('SGLang import root differs')
    observed = {}
    for relative, expected in PATCHES.items():
        path = Path(ROOT) / relative
        try:
            if path.is_symlink() or not path.is_file(): raise ValueError('unsafe patch')
            observed[relative] = hashlib.sha256(path.read_bytes()).hexdigest()
        except (OSError, ValueError): observed[relative] = None
        if observed[relative] != expected: failures.append('reviewed patch differs: ' + relative)
    return {'schema_version': 1, 'kind': 'decisor_metadata_and_patch_bytes_only',
            'expected_image': IMAGE, 'packages': packages, 'package_origin': origin,
            'patches': observed, 'failures': failures, 'matching': not failures,
            'customer_source_imported': False, 'inputs_or_weights_read': False,
            'native_kernels_proven': False, 'runtime_admitted': False}

if __name__ == '__main__':
    report = inspect()
    print(json.dumps(report, indent=2))
    sys.exit(0 if report['matching'] else 2)
