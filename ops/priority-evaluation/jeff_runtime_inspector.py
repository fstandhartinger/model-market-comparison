"""Read metadata of upstream packages only; no Jeff imports, model weights or inputs."""
import importlib.metadata as m
import json
import shutil
import sys
from pathlib import Path
expected = {"torch":"2.13.0+cu130","transformers":"5.17.0","accelerate":"1.15.0",
            "safetensors":"0.8.0","huggingface_hub":"1.32.0"}
observed = {}
for name in expected:
    try:
        observed[name] = m.version(name)
    except m.PackageNotFoundError:
        observed[name] = None
report = {"scope":"upstream_runtime_metadata_only", "python":sys.version,
          "python_3_12":sys.version_info[:2] == (3,12),"expected":expected,"observed":observed,
          "gcc":shutil.which("gcc"),"libc_headers":Path("/usr/include/stdio.h").is_file(),"customer_source_imported":False,"inputs_or_weights_read":False}
report["matching"] = report["python_3_12"] and observed == expected and report["gcc"] is not None and report["libc_headers"]
print(json.dumps(report,indent=2))
sys.exit(0 if report["matching"] else 2)
