"""icon.png(元画像)から、拡張とスマホ版のアイコンを作る。Pillow が必要: python make_icons.py
その後 py build.py を実行する。"""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
im = Image.open(HERE / "icon.png").convert("RGBA")
im = im.crop(im.getchannel("A").point(lambda a: 255 if a > 24 else 0).getbbox())
w, h = im.size
n = max(w, h)
sq = Image.new("RGBA", (n, n), (0, 0, 0, 0))
sq.paste(im, ((n - w) // 2, (n - h) // 2))
for k in (16, 32, 48, 128):
    sq.resize((k, k), Image.LANCZOS).save(HERE / "extension" / "icons" / f"icon{k}.png")
sq.resize((192, 192), Image.LANCZOS).save(HERE / "mobile-src" / "icon.png")
print("OK")
