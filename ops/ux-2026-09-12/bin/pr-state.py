#!/usr/bin/env python3
"""Read a Benchmark Heaven pull request through the scoped Git credential helper."""
import json
import subprocess
import sys
import urllib.error
import urllib.request

REPO = "fstandhartinger/model-market-comparison"


def main():
    if len(sys.argv) != 2 or not sys.argv[1].isdigit():
        raise SystemExit("usage: pr-state.py <pull-request-number>")
    env = {
        "PATH": "/home/flori/.local/bin:/usr/bin:/bin",
        "HOME": "/home/flori",
        "LANG": "C.UTF-8",
        "GIT_TERMINAL_PROMPT": "0",
    }
    credential = subprocess.run(
        ["git", "credential", "fill"],
        input=f"protocol=https\nhost=github.com\npath={REPO}.git\n\n",
        text=True,
        capture_output=True,
        timeout=30,
        env=env,
        check=True,
    )
    fields = dict(
        line.split("=", 1)
        for line in credential.stdout.splitlines()
        if "=" in line
    )
    token = fields.get("password")
    if not token:
        raise SystemExit("scoped GitHub API credential unavailable")
    request = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/pulls/{sys.argv[1]}",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "bh-ux-workstream",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            row = json.load(response)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError):
        raise SystemExit("GitHub pull request read failed") from None
    print(json.dumps({"state": row.get("state"), "merged_at": row.get("merged_at")}))


if __name__ == "__main__":
    main()
