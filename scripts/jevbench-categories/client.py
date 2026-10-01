import json, sys, time, urllib.request, concurrent.futures as cf
KEY = open('/workspace/lab/key').read().strip()
rows = [json.loads(l) for l in open('/workspace/lab/input.jsonl')]
def call(r):
    body = json.dumps({'model': 'Winnow-12B', 'state': r['state'], 'questions': {'decision': r['question']}}).encode()
    for a in range(5):
        try:
            req = urllib.request.Request('http://127.0.0.1:20011/v1/systemone', data=body, method='POST',
                                         headers={'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'})
            j = json.loads(urllib.request.urlopen(req, timeout=180).read())
            d = j['answers']['decision']
            return {'id': r['task_id'], 'choice': d.get('choice'), 'probs': d.get('probabilities')}
        except Exception as e:
            err = str(e)[:200]; time.sleep(2 * (a + 1))
    return {'id': r['task_id'], 'error': err}
t = time.time(); n = 0
with open('/workspace/lab/out.jsonl', 'w') as f, cf.ThreadPoolExecutor(4) as ex:
    for res in ex.map(call, rows):
        f.write(json.dumps(res) + '\n'); n += 1
        if n % 500 == 0: print(n, round(time.time() - t), flush=True)
print('DONE', n, round(time.time() - t))
