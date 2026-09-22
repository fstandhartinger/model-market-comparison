#!/usr/bin/env bash
# pre-push hook for the shared primary checkout (installed as .git/hooks/pre-push by tick.sh).
#
# A daily/catch-up/price-drift transaction publishes a gate-reviewed staging commit that descends
# from the origin/main it fetched at start; if anyone pushes to main meanwhile, its push fails
# non-fast-forward and the whole run is lost (2026-09-22 00:41 price-drift run, killed by an
# iteration push at 00:53). tick.sh already starts no iteration while state/run.lock is held, but
# an iteration that is already running, or any other writer in this checkout, could still push.
# This hook refuses pushes to main while the lock is held. Wait for the run to finish and push
# again; BH_PUSH_DURING_DAILY=1 overrides (only for an emergency fix you are willing to trade
# the run for). The daily run itself pushes from its own staging clone with gate/hooks, so it
# never passes through this hook.
DAILY_LOCK=${BH_DAILY_LOCK:-/opt/benchmarkheaven-daily/state/run.lock}
[ "${BH_PUSH_DURING_DAILY:-}" = 1 ] && exit 0
[ -e "$DAILY_LOCK" ] || exit 0
touches_main=0
while read -r _local_ref _local_sha remote_ref _remote_sha; do
  [ "$remote_ref" = refs/heads/main ] && touches_main=1
done
[ "$touches_main" = 1 ] || exit 0
if flock -n "$DAILY_LOCK" true 2>/dev/null; then exit 0; fi
echo "pre-push: a Benchmark Heaven daily transaction holds $DAILY_LOCK — pushing to main now would" >&2
echo "pre-push: make its publish fail non-fast-forward. Retry once the lock is free" >&2
echo "pre-push: (check: flock -n $DAILY_LOCK true && echo free). Override: BH_PUSH_DURING_DAILY=1." >&2
exit 1
