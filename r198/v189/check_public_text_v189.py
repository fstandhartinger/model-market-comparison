import pathlib,subprocess
J=pathlib.Path(__file__).resolve().parent;W=J.parents[1]
r=subprocess.run(['node','--test','test/jevbench-v189-public-scope.test.mjs'],cwd=W,capture_output=True,text=True)
assert r.returncode==0,r.stdout+r.stderr
(J/'receipts/PUBLIC-TEXT.json').write_text('{"status":"PASS","changed_artifacts_scanned":true,"withheld_fields_absent":true}\n')
print(r.stdout)
