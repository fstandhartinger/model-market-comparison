"""v1.7.14 text correction of one carried row (text fields only; every number, rank and cell unchanged): DOPEST 1.0 31B's notes said its
serving-code repository became private on 25 Oct 2026. It never was: GitHub reports DOPEST-studio/dopest-model public (private=false),
created 2026-10-24T18:04:56Z; the 25 Oct HTTP 401 came from probing a Hugging Face path that never existed. Each replacement must match
exactly once in the v1.7.13 text; nothing else in the row changes."""
KEY = 'dopest-1.0-31b'
FIELDS = ['code_revision', 'disclosure', 'licence']
REPLACE = {
    'code_revision': [("The upstream DOPEST-studio/dopest-model repository became private (HTTP 401) on 25 Oct 2026 after review;",
                       "The author's serving code is public on GitHub (DOPEST-studio/dopest-model, created 24 Oct 2026); an earlier version of this note said "
                       "the repository had become private, which was our error;")],
    # The follow-on clause ("this limits public reproducibility of the exact serving code") only described the claimed private state.
    'disclosure': [("the base is public and ungated; the upstream server repository went private on 25 Oct 2026, after our code review (see code_revision); "
                    "this limits public reproducibility of the exact serving code, not the measurement, and only a score and disclosures are published.",
                    "the base is public and ungated; only a score and disclosures are published.")],
    'licence': [("author serving code public at the pin until 25 Oct 2026, repository private since then (no serving code redistributed here)",
                 "author serving code public on GitHub at the pin (no serving code redistributed here)")],
}
EXCEPT = [KEY + ': code_revision, disclosure, licence (text correction; numbers, ranks and cells unchanged)']
HIST_ADD = 'Corrected the DOPEST 1.0 31B notes: its serving-code repository has been public throughout.'
# No "private" claim about this repository may survive in any v1.7.14 text.
STALE = r'became private|went private|private since|repository private|private \(HTTP 401\)|HTTP 401'


def apply(row):
    """Return a corrected copy of the v1.7.13 row; asserts each anchor occurs exactly once."""
    import copy
    out = copy.deepcopy(row)
    for f, reps in REPLACE.items():
        t = out[f]
        for a, b in reps:
            assert t.count(a) == 1, (KEY, f, a[:60], t.count(a))
            t = t.replace(a, b)
        out[f] = t
    return out


def masked(row):
    """The row without the corrected text fields (for equality against the predecessor)."""
    return {k: v for k, v in row.items() if k not in FIELDS}
