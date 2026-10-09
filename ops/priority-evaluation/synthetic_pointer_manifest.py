import json, os, tempfile

SIZES = {'audio_attach.safetensors': 94402904, 'audio_encoder/model.safetensors': 1295918896,
         'audio_notes/ced-base/model.safetensors': 342863548, 'audio_notes/whisper-large-v3-turbo/model.safetensors': 1617824864,
         'model.safetensors-00001-of-00002.safetensors': 6601452576, 'model.safetensors-00002-of-00002.safetensors': 3990429440,
         'tokenizer.json': 20037157}


def make(path=None):
    """Synthetic manifest with the same shape/sizes as the reviewed pointer manifest but fake hashes."""
    d = {'commit': 'a' * 40, 'tree': 'b' * 40, 'lfs_pointers': [
        {'path': p, 'lfs_sha256': ('%064x' % (i + 1)), 'size_bytes': s, 'blob_oid': '0' * 40, 'pointer_sha256': '0' * 64}
        for i, (p, s) in enumerate(SIZES.items())]}
    path = path or os.path.join(tempfile.mkdtemp(), 'synthetic-pointer-manifest.json')
    with open(path, 'w') as f:
        json.dump(d, f)
    return path
