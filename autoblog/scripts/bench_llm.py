"""
bench_llm.py — One-shot smoke test for the new claude -p backend.

Run from the autoblog package root with PYTHONPATH set:
    PYTHONPATH=/opt/autoblog/repo/autoblog python /opt/autoblog/repo/autoblog/scripts/bench_llm.py

Deletable after end-to-end verification.
"""
from __future__ import annotations

import sys
import time

from autoblog.llm import chat, parse_json


def bench(model: str, prompt: str, expect_json: bool = False) -> None:
    print(f"--- {model} ---")
    print(f"prompt: {prompt!r}")
    t0 = time.perf_counter()
    out = chat(model, prompt)
    dt = time.perf_counter() - t0
    print(f"raw output ({dt:.2f}s):\n{out}\n")
    if expect_json:
        parsed = parse_json(out)
        print(f"parsed JSON: {parsed!r}")
    print()


def main() -> int:
    bench("sonnet", "Reply with the single word OK and nothing else.")
    bench(
        "sonnet",
        'Return exactly this JSON and nothing else: {"ok": true, "n": 1}',
        expect_json=True,
    )
    bench("opus", "Reply with the single word OK and nothing else.")
    print("All three calls succeeded.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
