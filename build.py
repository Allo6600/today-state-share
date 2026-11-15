"""配布版の拡張機能を組み立てる。

  py build.py

1. ../today-state/today-state.html の <script id="core">(周期の計算・知識ベース)を extension/core.js に取り込む
   (あなたの today-state は読むだけ。書き換えない)
2. texts/kb-plain.json(公開前に読んで直す文面)を検証して extension/texts.json に置く
3. texts/REVIEW.md(元の文と書き直しの読み比べ)を作る

文面を直したら、もう一度 py build.py を実行する。
"""
import json
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC_HTML = HERE.parent / "today-state" / "today-state.html"
EXT = HERE / "extension"
TEXTS = HERE / "texts"

WINDOWS = {"W_M1", "W_M2", "W_F", "W_O", "W_L1", "W_L2"}
CATS = {"symptom", "task", "sleep", "exercise", "mood", "caution"}
WHENS = {"always", "heavy"}
WIN_NAME = {"W_M1": "月経1〜2日目", "W_M2": "月経3〜5日目", "W_F": "月経後〜排卵前",
            "W_O": "排卵期前後", "W_L1": "黄体期前半", "W_L2": "月経前(7日前〜前日)"}
CAT_NAME = {"symptom": "症状", "task": "タスク", "sleep": "睡眠", "exercise": "運動",
            "mood": "気分・ストレス", "caution": "注意"}


def extract_core() -> str:
    html = SRC_HTML.read_text(encoding="utf8")
    m = re.search(r'<script id="core">([\s\S]*?)</script>', html)
    if not m:
        sys.exit("core が見つかりません: " + str(SRC_HTML))
    return m.group(1)


def validate(t: dict) -> None:
    errs = []
    src = t["src"]
    for e in t["kb"]:
        if e["window"] not in WINDOWS or e["category"] not in CATS or e["when"] not in WHENS:
            errs.append("構造が不正: " + e["id"])
        if e["grade"] not in t["grade"]:
            errs.append("grade が不正: " + e["id"])
        if not e["text"].strip():
            errs.append("本文が空: " + e["id"])
        for r in e["refs"]:
            if r not in src:
                errs.append(f"{e['id']}: 論文 {r} が src にありません")
    for k, v in src.items():
        if not v["x"].strip() or not v["u"].startswith(("https://", "http://")):
            errs.append("論文の要点かURLが不正: " + k)
        elif v["u"].startswith("http://"):
            print("注意: http のリンク(https に直せるか確認): " + k + " " + v["u"])
    if errs:
        sys.exit("文面の検証に失敗:\n  " + "\n  ".join(errs))


def review(t: dict, orig: dict) -> str:
    L = ["# 公開前の文面チェック(内部用・公開しない)", "",
         "直すのは `texts/kb-plain.json` の `text`(提案文)と `x`(論文の要点)です。直したら `py build.py` を実行します。",
         "元の文は `texts/original.json`(あなたの today-state にある文そのまま)です。", "",
         "## 提案文(時期 × 項目)", ""]
    ob = {i: e for i, e in enumerate(orig["KB"])}
    for i, e in enumerate(t["kb"]):
        L.append(f"**{e['id']}** ({WIN_NAME[e['window']]} / {CAT_NAME[e['category']]} / 根拠: {t['grade'][e['grade']]}"
                 f"{' / 体感が重いとき' if e['when']=='heavy' else ''}) 論文: {', '.join(e['refs']) or 'なし'}")
        L.append(f"- 元: {ob[i]['text']}")
        L.append(f"- 案: {e['text']}")
        L.append("")
    L += ["## 根拠の強さの表示", ""]
    for k, v in t["grade"].items():
        L.append(f"- **{v}**: {t['gradeLimit'][k]}  (元: {orig['GRADE'][k]} / {orig['GRADE_LIMIT'][k]})")
    L += ["", "## 論文の要点", ""]
    for k, v in t["src"].items():
        L.append(f"**{k}** {v['n']}  <{v['u']}>")
        L.append(f"- 元: {orig['SRC'][k]['x']}")
        L.append(f"- 案: {v['x']}")
        L.append("")
    return "\n".join(L)


def main() -> None:
    EXT.mkdir(exist_ok=True)
    core = extract_core() if SRC_HTML.exists() else None  # 元の today-state がない環境では、core.js をそのまま使う
    if core is None:
        core = (EXT / "core.js").read_text(encoding="utf8").split(chr(10), 1)[1]
    (EXT / "core.js").write_text(
        "/* 自動生成(build.py)。直接は編集しない。 */\n" + core,
        encoding="utf8")
    t = json.loads((TEXTS / "kb-plain.json").read_text(encoding="utf8"))
    validate(t)
    (EXT / "texts.json").write_text(json.dumps(t, ensure_ascii=False), encoding="utf8")
    if (TEXTS / "original.json").exists():  # 元の文との読み比べ(内部用)。なければ作らない
        orig = json.loads((TEXTS / "original.json").read_text(encoding="utf8"))
        (TEXTS / "REVIEW.md").write_text(review(t, orig), encoding="utf8")
    MOB = HERE / "mobile"
    MOB.mkdir(exist_ok=True)
    for f in ("core.js", "texts.json", "panel.js", "panel.css"):
        shutil.copy(EXT / f, MOB / f)
    for f in ("index.html", "tasks.js", "mobile.css"):
        shutil.copy(HERE / "mobile-src" / f, MOB / f)
    shutil.copy(HERE / "mobile-src" / "icon.png", MOB / "icon.png")
    print(f"OK: core {len(core)}字, 提案文 {len(t['kb'])}件, 論文 {len(t['src'])}件 → extension/ と texts/REVIEW.md")


if __name__ == "__main__":
    main()
