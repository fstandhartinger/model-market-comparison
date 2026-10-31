import copy
import re
import unittest
from public_text_exception import CLAUSE, SENTENCE, check

FORBIDDEN = re.compile(r'worker|lead|custody|custodian|release.owner|measurement review|deputy|board|#\d+|Florian|\bCoS\b|order.id|jevbench-add-requests|PREREG|\{REF\}', re.I)

class NarrowException(unittest.TestCase):
    def setUp(self):
        self.rows = {'allec-oavg': {'disclosure': SENTENCE + ' ' + CLAUSE},
                     'piccolo-27b': {'disclosure': 'Public description.'}}

    def test_exact_authorised_hit(self):
        self.assertEqual(check(self.rows, FORBIDDEN)['exception_count'], 1)

    def test_all_mutations_fail(self):
        cases = []
        def case(mutate):
            value = copy.deepcopy(self.rows)
            mutate(value)
            cases.append(value)
        case(lambda r: r['allec-oavg'].update(disclosure=SENTENCE + ' ' + CLAUSE.replace('this board', 'the board')))
        case(lambda r: r['allec-oavg'].update(disclosure=SENTENCE.upper() + ' ' + CLAUSE))
        case(lambda r: r['allec-oavg'].update(disclosure=CLAUSE + ' ' + SENTENCE))
        case(lambda r: r['allec-oavg'].update(disclosure=SENTENCE + ' ' + CLAUSE + ' ' + CLAUSE))
        case(lambda r: r['allec-oavg'].update(endpoint_condition=CLAUSE))
        case(lambda r: r['piccolo-27b'].update(disclosure=CLAUSE))
        case(lambda r: r['allec-oavg'].update(extra={'nested': ['board']}))
        for word in ['board', 'BOARD', 'leaderboard', 'worker', 'lead', 'custody', 'custodian', 'release owner',
                     'measurement review', 'deputy', '#123', 'Florian', 'CoS', 'order id',
                     'jevbench-add-requests', 'PREREG', '{REF}']:
            case(lambda r, word=word: r['allec-oavg'].update(disclosure=SENTENCE + ' ' + CLAUSE + ' ' + word))
        for index, rows in enumerate(cases):
            with self.subTest(index=index):
                with self.assertRaises(AssertionError):
                    check(rows, FORBIDDEN)

if __name__ == '__main__':
    unittest.main()
