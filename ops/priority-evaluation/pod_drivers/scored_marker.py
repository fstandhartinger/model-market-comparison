"""Dependency-free durable pre-dispatch marker for every paid pod route."""
import os


class ScoredDispatchMarker:
    """Durably mark scoring before dispatch; never overwrite a prior attempt.

    /output is the container mount for the pod's /work/out. A marker, including
    an interrupted marker write, means the host must reconcile rather than retry.
    One instance serves both benchmark loops within this single driver process.
    """
    def __init__(self, output_root):
        self.path = output_root / 'scored-loop-started.json'
        self.started = False
        if self.path.exists() or self.path.is_symlink():
            raise ValueError('prior scored attempt requires reconciliation')

    def __call__(self):
        if self.started:
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open('x') as stream:
            stream.write('{"scored_loop_started":true}\n')
            stream.flush()
            os.fsync(stream.fileno())
        directory = os.open(self.path.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
        self.started = True

