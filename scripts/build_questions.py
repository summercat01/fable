"""질문 원본(data/raw)을 합쳐서 중복 검사 → data/questions.json, supabase/seed_questions.sql 생성

사용: python3 scripts/build_questions.py
- 밸런스 원본: data/raw/balance_*.txt  (한 줄에 "A|B")
- 만약에 원본: data/raw/whatif_*.txt   (한 줄에 질문 하나)
- 19금 원본(나중에): data/raw/adult_balance_*.txt, data/raw/adult_whatif_*.txt
- 이미 DB에 들어간 질문의 id·순서는 절대 바꾸지 않음 (questions.json에 있는 건 그대로 두고 새 것만 뒤에 붙임)
"""

import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT_JSON = ROOT / "data" / "questions.json"
OUT_SQL = ROOT / "supabase" / "seed_questions.sql"


def norm(s: str) -> str:
    return re.sub(r"[\s\.,!?~·'\"]", "", s).lower()


def key(q: dict) -> str:
    if q["type"] == "balance":
        return "b:" + "|".join(sorted([norm(q["a"]), norm(q["b"])]))
    return "w:" + norm(q["text"])


def read_raw():
    items = []
    for adult in (False, True):
        prefix = "adult_" if adult else ""
        for f in sorted(RAW.glob(f"{prefix}balance_*.txt")):
            if not adult and f.name.startswith("adult_"):
                continue
            for line in f.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                a, b = [x.strip() for x in line.split("|")]
                items.append({"type": "balance", "a": a, "b": b, "adult": adult})
        for f in sorted(RAW.glob(f"{prefix}whatif_*.txt")):
            if not adult and f.name.startswith("adult_"):
                continue
            for line in f.read_text(encoding="utf-8").splitlines():
                line = re.sub(r"^(만약에|만약)\s*,?\s*", "", line.strip())
                if line:
                    items.append({"type": "whatif", "text": line, "adult": adult})
    return items


def main():
    existing = json.loads(OUT_JSON.read_text(encoding="utf-8"))["items"] if OUT_JSON.exists() else []
    seen = {key(q) for q in existing}
    dups, new = [], []
    for q in read_raw():
        k = key(q)
        if k in seen:
            dups.append(q)
            continue
        seen.add(k)
        new.append(q)

    # 새 질문은 섞어서 기존 순서 뒤에 붙임 (같은 입력이면 항상 같은 순서)
    random.Random(len(existing) + 2026).shuffle(new)
    next_id = max((q["id"] for q in existing), default=0) + 1
    next_order = max((q["sort_order"] for q in existing), default=0) + 1
    for i, q in enumerate(new):
        q["id"] = next_id + i
        q["sort_order"] = next_order + i

    items = existing + new
    OUT_JSON.write_text(
        json.dumps({"count": len(items), "items": items}, ensure_ascii=False, indent=1),
        encoding="utf-8",
    )

    def lit(v):
        if v is None:
            return "null"
        if isinstance(v, bool):
            return "true" if v else "false"
        if isinstance(v, int):
            return str(v)
        return "'" + str(v).replace("'", "''") + "'"

    rows = [
        f"({lit(q['id'])}, {lit(q['type'])}, {lit(q.get('text'))}, {lit(q.get('a'))}, "
        f"{lit(q.get('b'))}, {lit(q['adult'])}, {lit(q['sort_order'])})"
        for q in items
    ]
    OUT_SQL.write_text(
        "-- 자동 생성: scripts/build_questions.py. 직접 고치지 말고 data/raw 를 고친 뒤 다시 실행\n"
        "insert into public.questions (id, type, text, a, b, adult, sort_order) values\n"
        + ",\n".join(rows)
        + "\non conflict (id) do nothing;\n",
        encoding="utf-8",
    )

    b = sum(1 for q in items if q["type"] == "balance" and not q["adult"])
    w = sum(1 for q in items if q["type"] == "whatif" and not q["adult"])
    ad = sum(1 for q in items if q["adult"])
    print(f"전체 {len(items)} (새로 추가 {len(new)}) | 밸런스 {b} · 만약에 {w} · 19금 {ad} | 중복으로 뺀 것 {len(dups)}")
    for q in dups:
        print("  중복:", q.get("text") or f"{q['a']} | {q['b']}", file=sys.stderr)


if __name__ == "__main__":
    main()
