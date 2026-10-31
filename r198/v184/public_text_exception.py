"""Narrow release-owner exception; import into the v1.8.4 public-text gate.

Pass a mapping of new row keys to their final public row objects. Apply all other
public-text checks normally. This helper exempts only the single word 'board'
in the authorised clause in allec-oavg.disclosure.
"""
import hashlib
import re

CLAUSE = '(The allec weights are plantwaterer/allec@e54027aa; no separate allec row is published on this board.)'
SENTENCE = 'same weights as the earlier allec entry; short requests are read in several option orders and averaged.'
CLAUSE_SHA256 = hashlib.sha256(CLAUSE.encode('utf-8')).hexdigest()


def check(rows, forbidden):
    disclosure = rows['allec-oavg']['disclosure']
    assert disclosure.count(CLAUSE) == 1, 'authorised clause must appear exactly once'
    assert disclosure.count(SENTENCE) == 1, 'mandatory sentence must appear exactly once'
    assert 'Serving description: ' + SENTENCE + ' ' + CLAUSE in disclosure, 'mandatory sentence and clause must remain verbatim and adjacent'
    allowed = []

    def walk(value, path):
        if isinstance(value, dict):
            for key, child in value.items():
                walk(child, path + (key,))
        elif isinstance(value, list):
            for index, child in enumerate(value):
                walk(child, path + (index,))
        elif isinstance(value, str):
            clause_start = value.find(CLAUSE) if path == ('allec-oavg', 'disclosure') else -1
            board_start = clause_start + CLAUSE.index('board') if clause_start >= 0 else -1
            for match in forbidden.finditer(value):
                if (path == ('allec-oavg', 'disclosure')
                        and match.group() == 'board'
                        and match.span() == (board_start, board_start + len('board'))):
                    allowed.append({'row': path[0], 'field': path[1], 'clause_sha256': CLAUSE_SHA256,
                                    'match': 'board', 'span': list(match.span())})
                else:
                    raise AssertionError(f'forbidden public text at {path}: {match.group()}')

    walk(rows, ())
    assert len(allowed) == 1, 'gate must observe exactly one authorised board hit'
    return {'status': 'PASS', 'exception_count': len(allowed), 'exceptions': allowed,
            'other_forbidden_hits': 0, 'mandatory_sentence_verbatim': True,
            'resolving_clause_verbatim': True}
