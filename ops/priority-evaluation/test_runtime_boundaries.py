import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import uuid
from unittest import mock

import autopickup as ap
import measurement_dispatch as dispatch
import measurement_driver as driver
import host_github
import static_agent


class BoundaryTests(unittest.TestCase):
    def test_api_metadata_forbids_overrides_and_mismatched_or_undefined_prices(self):
        import copy
        runtime={'backend':'openrouter','credential':'openrouter','model':'fixture/model','price_input_per_m':1.,'price_output_per_m':1.}
        meta={'system_key':'fixture','system':{'support':dict.fromkeys(('choice','noul','score'),'native'),
                                              'endpoint_kind':'api','price_in_per_m':1.,'price_out_per_m':1.}}
        dispatch.validate_api_meta('jevbench',meta,runtime)
        for changes in ({'usd_per_1000_override':.000001},{'price_in_per_m':.0001},{'price_out_per_m':True},
                        {'endpoint_kind':'local'},{'price_in_per_m':float('nan')},
                        {'support':dict.fromkeys(('choice','noul','score'),'verbalized')}):
            bad=copy.deepcopy(meta);bad['system'].update(changes)
            with self.subTest(changes=list(changes)),self.assertRaises(ValueError):
                dispatch.validate_api_meta('jevbench',bad,runtime)
        with self.assertRaises(ValueError):
            dispatch.validate_api_meta('imagejevbench',{'system_key':'fixture','system':{'kind':'api','gpu_usd_h':0}},runtime)

    def test_static_packet_contains_policy_method_and_price_contract_without_gold_content(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);job=root/'runner-prepare';job.mkdir()
            (root/'source').mkdir();(root/'source/source.py').write_text('# owned static fixture')
            packet=static_agent.packet(job,True)
            self.assertIn('MEASUREMENT-CONTRACT.md',packet)
            self.assertIn('price_in_per_m',packet)
            self.assertIn('headline.py',packet)
            self.assertIn('AGENTS.md',packet)
            self.assertNotIn('gold.jsonl":',packet)
            self.assertIn('shell_tool',static_agent.codex_flags())
            # The static (Codex) route must see the same fixed measurement code and frozen price rules as the
            # mounted route, keyed by the mount paths the prompts name; never the profile inputs.
            context=json.loads(packet.split('contract:\n',1)[1].split('\n',1)[0])
            for key in ('/home/flori/official/measurement/run_v15.py', '/home/flori/official/measurement/jevbench/adapters/typesafe.py',
                        '/home/flori/official/measurement/measurement_driver.py',
                        '/home/flori/official/method/METHOD-v1.5-ADDENDUM-PRICING-INTERPRETATION-1.md'):
                self.assertIn(key, context)
            self.assertIn('launch list price', context['/home/flori/official/method/METHOD-v1.5-ADDENDUM-PRICING-INTERPRETATION-1.md'])
            for pin in ap.measurement_dispatch.pins()['profile']['inputs'].values():
                for item in (pin.values() if isinstance(pin, dict) else []):
                    if isinstance(item, dict) and 'path' in item:
                        self.assertNotIn(item['path'] + '"', ''.join(context))

    def test_real_driver_text_image_parsers_raw_receipts_and_no_duplicate_api_dispatch(self):
        from measurement_fixtures import create, inert_transport_command
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            manifest=create(root/'fixtures',dispatch.MANIFEST,[{'task_id':'fixture-choice','probs_as_returned':{'0':.01,'1':.99}}])
            runtime={'backend':'openrouter','credential':'openrouter','model':'fixture/model','price_input_per_m':1.,'price_output_per_m':1.}
            original=dispatch.command
            with mock.patch.object(dispatch,'MANIFEST',manifest), mock.patch.object(dispatch,'command',side_effect=inert_transport_command(original)) as command:
                pins=dispatch.pins()
                for benchmark,count in [('jevbench',1),('imagejevbench',2)]:
                    record=dispatch.run(benchmark,runtime,'invented-request-only',root/benchmark,pins,5.)
                    self.assertEqual(record['rows'],count)
                    self.assertEqual(record['raw_sha256'],dispatch.sha(root/benchmark/'raw.jsonl'))
                    calls=command.call_count
                    self.assertEqual(dispatch.run(benchmark,runtime,'invented-request-only',root/benchmark,pins,5.),record)
                    self.assertEqual(command.call_count,calls)

    def test_actual_agent_mounts_allow_only_own_writes_and_hide_host_secrets_and_raw(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            rid = str(uuid.uuid4())
            job = root / 'orders' / rid
            job.mkdir(parents=True)
            for name in ('review', 'source', 'trusted-runner', 'results/raw'):
                (job / name).mkdir(parents=True)
                (job / name / 'fixture').write_text('owned fixture')
            stage = root / 'home'; stage.mkdir()
            with mock.patch.object(ap, 'JOB_ROOT', root / 'orders'):
                command, fds = ap.sandbox_agent_command(job, rid, 'codex', stage)
            probe = '''import os,pathlib,json
p=pathlib.Path.cwd()
hidden=['/home/flori/.ssh','/home/flori/.config/stripe','/home/flori/.config/dev-secrets.env',
'/home/flori/jevbench-sealed','/home/flori/.local/state/fastlane-autopickup','/home/flori/jobs/allout-fastlane-finish-20260929']
assert all(not pathlib.Path(x).exists() for x in hidden)
assert os.environ.get('HOST_SECRET_CANARY') is None and os.environ['OPENAI_API_KEY']==''
assert not list((p/'results/raw').iterdir())
for relative in ['source/fixture','trusted-runner/fixture','review/fixture']:
 try: (p/relative).write_text('changed')
 except OSError: pass
 else: raise AssertionError('reviewed input writable')
(p/'own-write.txt').write_text('ok')
print(json.dumps({'host_secrets_absent':True,'raw_absent':True,'reviewed_readonly':True,'own_write':True}))
'''
            try:
                proc = subprocess.run(command + ['--', '/usr/bin/python3', '-I', '-c', probe],
                                      pass_fds=tuple(fds), capture_output=True, text=True, timeout=30,
                                      env={'PATH': '/usr/bin:/bin', 'HOST_SECRET_CANARY': 'invented-test-only'})
            finally:
                for fd in fds: os.close(fd)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertTrue(json.loads(proc.stdout)['host_secrets_absent'])
            self.assertEqual((job / 'own-write.txt').read_text(), 'ok')

    def test_customer_mail_and_access_records_hidden_in_every_sandbox_mode(self):
        for stage_name in (None, 'review', 'runner-prepare'):
            with self.subTest(stage=stage_name), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                rid = str(uuid.uuid4())
                job = root / 'orders' / rid
                (job / 'customer-mail').mkdir(parents=True)
                (job / 'customer-mail' / '1.txt').write_text('api_key: "sk-SYNTHETIC-test-only-0123456789"')
                (job / 'private-intake').mkdir()
                (job / 'private-intake' / 'k').write_text('sk-SYNTHETIC-test-only-0123456789')
                (job / 'CUSTOMER-ACCESS-REQUEST-20261001.json').write_text('{"to":"ann@example.com"}')
                (job / 'notes.txt').write_text('visible control')
                stage_dir = job / stage_name if stage_name else job
                stage_dir.mkdir(exist_ok=True)
                stage = root / 'home'; stage.mkdir()
                with mock.patch.object(ap, 'JOB_ROOT', root / 'orders'):
                    command, fds = ap.sandbox_agent_command(stage_dir, rid, 'claude', stage)
                probe = f'''import pathlib
p=pathlib.Path('/home/flori/jobs/fastlane-evaluations/{rid}')
assert not list((p/'customer-mail').iterdir()) and not list((p/'private-intake').iterdir())
try: masked=(p/'CUSTOMER-ACCESS-REQUEST-20261001.json').read_text()
except PermissionError: masked=''
assert 'ann@example.com' not in masked and masked==''
assert (p/'notes.txt').read_text()=='visible control'
import os
def target(n):
 try: return os.readlink(f'/proc/self/fd/{{n}}')
 except OSError: return '/proc/'
extra=[n for n in os.listdir('/proc/self/fd') if n not in ('0','1','2') and not target(n).startswith('/proc/')]
assert not extra, 'inherited descriptors: '+repr([target(n) for n in extra])
for n in os.listdir('/proc/self/fd'):
 try: entries=os.listdir(f'/proc/self/fd/{{n}}/')
 except OSError: continue
 assert 'customer-mail' not in entries and 'private-intake' not in entries, 'inherited host directory handle'
 for sub in ('customer-mail','private-intake'):
  assert not os.path.exists(f'/proc/self/fd/{{n}}/{{sub}}')
print('ok')
'''
                try:
                    proc = subprocess.run(command + ['--', '/usr/bin/python3', '-I', '-c', probe],
                                          pass_fds=tuple(fds), capture_output=True, text=True, timeout=30,
                                          env={'PATH': '/usr/bin:/bin'})
                finally:
                    for fd in fds: os.close(fd)
                self.assertEqual(proc.returncode, 0, proc.stderr)
                self.assertEqual(proc.stdout.strip(), 'ok')
                self.assertTrue((job / 'customer-mail' / '1.txt').read_text().startswith('api_key'))  # host copy kept

    def test_review_and_preparation_see_pinned_measurement_code_but_not_its_inputs(self):
        for stage_name in ('review', 'runner-prepare', None):
            with self.subTest(stage=stage_name), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                code = root / 'harness'; (code / 'vendor/jevbench/adapters').mkdir(parents=True)
                (code / 'run_v15.py').write_text('# fixed driver fixture')
                (code / 'vendor/jevbench/adapters/typesafe.py').write_text('# adapter fixture')
                sealed = root / 'sealed-inputs.jsonl'; sealed.write_text('{"item":"sealed fixture"}')
                def pin(path):
                    return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
                profile = {'schema_version': 1, 'code': {'run_v15.py': pin(code / 'run_v15.py'),
                           'jevbench/adapters/typesafe.py': pin(code / 'vendor/jevbench/adapters/typesafe.py')},
                           'inputs': {'jevbench': {'items': pin(sealed)}}}
                rid = str(uuid.uuid4())
                job = root / 'orders' / rid
                job.mkdir(parents=True)
                stage_dir = job / stage_name if stage_name else job
                stage_dir.mkdir(exist_ok=True)
                stage = root / 'home'; stage.mkdir()
                with mock.patch.object(ap, 'JOB_ROOT', root / 'orders'), \
                        mock.patch.object(ap.measurement_dispatch, 'pins', return_value={'profile': profile}):
                    command, fds = ap.sandbox_agent_command(stage_dir, rid, 'claude', stage)
                expect = 'True' if stage_name else 'False'
                probe = f'''import pathlib
m=pathlib.Path('/home/flori/official/measurement')
seen=(m/'run_v15.py').is_file() and (m/'jevbench/adapters/typesafe.py').read_text()=='# adapter fixture' \\
 and (m/'measurement_driver.py').is_file() and (m/'MEASUREMENT-CONTRACT.md').is_file() \\
 and 'launch list price' in pathlib.Path('/home/flori/official/method/METHOD-v1.5-ADDENDUM-PRICING-INTERPRETATION-1.md').read_text()
assert str(seen)=='{expect}', seen
assert not pathlib.Path('{sealed}').exists()
for f in (m.rglob('*') if m.exists() else []):
 assert 'sealed fixture' not in (f.read_text() if f.is_file() else '')
if seen:
 try: (m/'run_v15.py').write_text('x')
 except OSError: pass
 else: raise AssertionError('measurement code writable')
print('ok')
'''
                try:
                    proc = subprocess.run(command + ['--', '/usr/bin/python3', '-I', '-c', probe],
                                          pass_fds=tuple(fds), capture_output=True, text=True, timeout=30,
                                          env={'PATH': '/usr/bin:/bin'})
                finally:
                    for fd in fds: os.close(fd)
                self.assertEqual(proc.returncode, 0, proc.stderr)

    def test_changed_measurement_code_refuses_review_sandbox(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'run_v15.py').write_text('changed')
            profile = {'schema_version': 1, 'code': {'run_v15.py': {'path': str(root / 'run_v15.py'), 'sha256': '0' * 64}}}
            rid = str(uuid.uuid4())
            job = root / 'orders' / rid
            (job / 'review').mkdir(parents=True)
            stage = root / 'home'; stage.mkdir()
            with mock.patch.object(ap, 'JOB_ROOT', root / 'orders'), \
                    mock.patch.object(ap.measurement_dispatch, 'pins', return_value={'profile': profile}):
                with self.assertRaises(ap.PickupError):
                    ap.sandbox_agent_command(job / 'review', rid, 'claude', stage)

    def test_codex_sandbox_has_writable_codex_home_readonly_login_and_resolver(self):
        # Codex 0.160 writes tmp/, state_5.sqlite and installation_id under CODEX_HOME at start-up
        # and exits 1 on a read-only home; the model host must also stay resolvable.
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            rid = str(uuid.uuid4())
            job = root / 'orders' / rid / 'runner-prepare'
            job.mkdir(parents=True)
            stage = root / 'home'; stage.mkdir()
            with mock.patch.object(ap, 'JOB_ROOT', root / 'orders'):
                command, fds = ap.sandbox_agent_command(job, rid, 'codex', stage)
            resolver = Path('/etc/resolv.conf')
            expected = resolver.read_text() if resolver.is_file() else None
            probe = '''import pathlib,sys
home=pathlib.Path('/home/flori/.codex')
(home/'tmp').mkdir()
(home/'installation_id').write_text('probe')
try: (home/'auth.json').write_text('changed')
except OSError: pass
else: raise AssertionError('login writable')
expected=sys.argv[1]
if expected!='-': assert pathlib.Path('/etc/resolv.conf').read_text()==expected
print('ok')
'''
            try:
                proc = subprocess.run(command + ['--', '/usr/bin/python3', '-I', '-c', probe,
                                                 '-' if expected is None else expected],
                                      pass_fds=tuple(fds), capture_output=True, text=True, timeout=30,
                                      env={'PATH': '/usr/bin:/bin'})
            finally:
                for fd in fds: os.close(fd)
            self.assertEqual(proc.returncode, 0, proc.stderr)
            scratch = root / 'orders' / rid / '.agent-scratch' / '.codex_home'
            self.assertEqual((scratch / 'installation_id').read_text(), 'probe')
            self.assertTrue((scratch / 'tmp').is_dir())

    def test_api_namespace_has_only_request_credential_and_gold_free_fixture(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            code, output, inputs = root/'code', root/'output', root/'inputs'
            for p in (code,output,inputs): p.mkdir()
            (inputs/'items.jsonl').write_text('{"fixture":"gold-free"}\n')
            config = root/'runtime.json';config.write_text('{}')
            (code/'measurement_driver.py').write_text('''import os,pathlib,json
assert pathlib.Path('/input/credential').read_text()=='invented-request-only'
assert pathlib.Path('/inputs/items.jsonl').is_file()
assert not pathlib.Path('/home').exists() and not pathlib.Path('/refs').exists()
assert os.environ['OPENAI_API_KEY']=='' and 'HOST_SECRET_CANARY' not in os.environ
assert not pathlib.Path('/var/run/postgresql').exists()
pathlib.Path('/output/probe.json').write_text(json.dumps({'request_credential_only':True,'no_gold_or_host_home':True}))
''')
            fd = os.memfd_create('owned-fixture', os.MFD_CLOEXEC)
            try:
                os.write(fd,b'invented-request-only')
                os.lseek(fd,0,0)
                proc = subprocess.run(dispatch.command(code,config,fd,output,[(inputs,'/inputs')]),
                                      pass_fds=(fd,), capture_output=True, timeout=30,
                                      env={'PATH':'/usr/bin:/bin','HOST_SECRET_CANARY':'invented'})
            finally: os.close(fd)
            self.assertEqual(proc.returncode,0,proc.stderr)
            self.assertTrue(json.loads((output/'probe.json').read_text())['no_gold_or_host_home'])

    def test_fixed_egress_rejects_redirect_destination_and_private_dns_without_connecting(self):
        import urllib.request
        call = driver.restricted_urlopen('https://public.example/v1/systemone')
        with self.assertRaisesRegex(ValueError,'destination'):
            call(urllib.request.Request('https://other.example/v1/systemone'))
        with mock.patch.object(driver.socket,'getaddrinfo',return_value=[(2,1,6,'',('127.0.0.1',443))]), \
                mock.patch.object(driver.http.client,'HTTPSConnection') as connection:
            with self.assertRaisesRegex(ValueError,'public address'):
                call(urllib.request.Request('https://public.example/v1/systemone'))
            connection.assert_not_called()

    def test_github_credential_only_added_to_trusted_gh_subprocess(self):
        with mock.patch.object(host_github,'token',return_value='invented-fixture-token'), \
                mock.patch.object(ap.subprocess,'run',return_value=subprocess.CompletedProcess([],0,'{}','')) as run:
            ap.site_command(['/usr/bin/gh','api','user'])
            self.assertEqual(run.call_args.kwargs['env']['GH_TOKEN'],'invented-fixture-token')
            ap.site_command(['git','status'])
            self.assertNotIn('GH_TOKEN',run.call_args.kwargs['env'])

    def test_measurement_pin_or_unsupported_backend_never_runs(self):
        with self.assertRaises(dispatch.OperationalHold):
            dispatch.runtime_spec({'backend':'arbitrary-python'},'jevbench')
        with self.assertRaises(dispatch.OperationalHold):
            dispatch.runtime_spec({'backend':'typesafe','model':'fixture','credential':'none','endpoint':'http://localhost'},'imagejevbench')


if __name__ == '__main__': unittest.main()
