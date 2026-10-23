"""Delete only explicitly named, regenerable directories owned by this candidate build."""
import pathlib,shutil,sys
J=pathlib.Path(__file__).resolve().parent
allowed={'before','pass','batch/out-repro','batch/out-v1643','__pycache__'}
for name in sys.argv[1:]:
 assert name in allowed,name
 p=J/name
 assert p.resolve().is_relative_to(J) and not p.is_symlink(),name
 if p.exists():shutil.rmtree(p)
 print('Removed job-local regenerable directory:',name)
