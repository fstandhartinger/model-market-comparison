"""PROPOSAL: pod-only stdlib metadata gate. Never imports ML/customer packages.
Run against the derived image before mounting customer code or weights.
"""
import importlib.metadata as md
import json
import sys
EXPECTED={'fla-core':'0.5.2','flash-linear-attention':'0.5.2',
          'torch':'2.13.0+cu130','transformers':'5.17.0','triton':'3.7.1',
          'einops':'0.8.2','safetensors':'0.8.0','huggingface-hub':'1.32.0','numpy':'2.2.6','accelerate':'1.15.0'}

def inspect():
    packages={}
    failures=[]
    for name,expected in EXPECTED.items():
        try:
            d=md.distribution(name)
            packages[name]={'version':d.version,'requires_dist':d.requires or []}
            if d.version!=expected:failures.append('changed package: '+name)
        except md.PackageNotFoundError:
            failures.append('missing package: '+name)
    if sys.version_info[:2]!=(3,12):failures.append('Python version differs')
    return {'kind':'supplement_metadata_only','packages':packages,'failures':failures,
            'customer_source_imported':False,'model_loaded':False,'native_kernels_proven':False,
            'runtime_admitted':False}
if __name__=='__main__':
    result=inspect()
    print(json.dumps(result,indent=2))
    sys.exit(2 if result['failures'] else 0)
