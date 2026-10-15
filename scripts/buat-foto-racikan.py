#!/usr/bin/env python3
"""
Buat berkas foto per resep untuk katalog UMPAN MAS.

Latar: katalog dulu memutar tiga berkas yang sama untuk 200 resep. Sekarang
20 resep inti punya foto adonannya sendiri (lihat `CORE_RECIPE_PHOTOS` di
`src/data/recipe-photos.ts`), sedangkan resep turunan katalog memakai berkas
tersendiri per slug di `public/images/recipes/<slug>.jpg`.

Skrip ini membuat berkas turunan tersebut dari foto adonan keluarga bahannya
(dipilih dengan prioritas kata kunci yang sama seperti `PHOTO_FAMILIES` di
`src/data/recipe-photos.ts`), lalu dipotong, dibalik, dan di-grading berbeda
per slug berdasarkan hash slug-nya — jadi tidak ada dua resep yang berbagi
berkas atau bingkai yang persis sama. Foto inti yang belum tersedia sebagai
foto tersendiri juga dibuat sebagai varian keluarga bahannya; berkasnya bisa
diganti foto adonan asli kapan pun cukup dengan menimpa berkas bernama slug
yang sama, tanpa mengubah kode.

Butuh ImageMagick (`convert`). Jalankan dari root repo:
    python3 scripts/buat-foto-racikan.py [--force]
"""

import hashlib
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "images" / "recipes"
SRC = ROOT / "src" / "data" / "recipes.ts"
FORCE = "--force" in sys.argv

# Foto dasar per keluarga bahan (berkas harus sudah ada di public/images).
BASES = {
    "ungu": ("recipes/ubi-madu-kukus.jpg", 230),  # digeser hue-nya jadi ungu ubi
    "cokelat": ("recipes/pelet-tuna-kroto.jpg", 100),
    "pandan": ("recipes/kelapa-pandan-hijau.jpg", 100),
    "jagung": ("recipe-jagung.jpg", 100),
    "kroto": ("recipes/pelet-tuna-kroto.jpg", 100),
    "amis": ("recipes/amis-udang-bawang.jpg", 100),
    "buah": ("recipes/ubi-madu-kukus.jpg", 96),
    "ubi": ("recipes/ubi-madu-kukus.jpg", 100),
    "putih": ("recipes/sagu-telur-madu.jpg", 100),
    "singkong": ("recipes/sagu-telur-madu.jpg", 100),
    "tempe": ("recipes/kacang-santan-gurih.jpg", 100),
    "kacang": ("recipes/kacang-santan-gurih.jpg", 100),
    "biskuit": ("recipes/roti-keju-ekonomis.jpg", 100),
    "roti": ("recipes/roti-keju-ekonomis.jpg", 100),
    "kelapa": ("recipes/kelapa-pandan-hijau.jpg", 100),
    "keju": ("recipes/keju-susu-kukus.jpg", 100),
    "susu": ("recipes/susu-kedelai-kroto.jpg", 100),
    "madu": ("recipes/ubi-madu-kukus.jpg", 100),
    "vanila": ("recipes/vanila-telur-bebek.jpg", 100),
    "telur": ("recipes/vanila-telur-bebek.jpg", 100),
    "pelet": ("recipes/pelet-tuna-kroto.jpg", 100),
    "bawaan": ("recipe-putih.jpg", 100),
}

# Prioritas kata kunci sama seperti PHOTO_FAMILIES di recipe-photos.ts.
FAMILY_RULES = [
    (["ungu"], "ungu"),
    (["cokelat"], "cokelat"),
    (["pandan"], "pandan"),
    (["jagung"], "jagung"),
    (["kroto"], "kroto"),
    (["sarden", "udang", "belut", "amis", "tuna"], "amis"),
    (["pisang", "nanas", "mangga", "nangka", "durian", "belimbing"], "buah"),
    (["ubi", "talas"], "ubi"),
    (["tahu", "sagu"], "putih"),
    (["singkong"], "singkong"),
    (["tempe"], "tempe"),
    (["kacang"], "kacang"),
    (["biskuit"], "biskuit"),
    (["roti"], "roti"),
    (["kelapa", "santan"], "kelapa"),
    (["keju"], "keju"),
    (["susu"], "susu"),
    (["madu"], "madu"),
    (["vanila", "vanilla"], "vanila"),
    (["telur"], "telur"),
    (["pelet", "tepung"], "pelet"),
]

# Foto inti yang dibuat sebagai varian keluarga bahannya (basis, crop %, flip).
CORE_VARIANTS = {
    "kuning-santan-pisang": ("recipe-jagung.jpg", 68, True, 108),
    "essen-mangga-pelet": ("recipes/ubi-madu-kukus.jpg", 72, False, 114),
    "roti-tawar-kroto-lomba": ("recipes/susu-kedelai-kroto.jpg", 66, True, 100),
    "pelet-ikan-bawang-putih": ("recipes/amis-udang-bawang.jpg", 70, True, 96),
    "sarden-susu-premium": ("recipes/kacang-santan-gurih.jpg", 74, False, 106),
    "jagung-keju-kolam": ("recipes/keju-susu-kukus.jpg", 64, True, 112),
    "amis-kuning-telur": ("recipes/vanila-telur-bebek.jpg", 70, False, 108),
}

GRAVITIES = ["center", "west", "east", "north", "south"]


def family_of(name: str) -> str:
    low = name.lower()
    for keywords, family in FAMILY_RULES:
        if any(k in low for k in keywords):
            return family
    return "bawaan"


def slug_for(name: str, index: int) -> str:
    normalized = unicodedata.normalize("NFD", name.lower())
    normalized = "".join(c for c in normalized if not unicodedata.combining(c))
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return f"{normalized}-{index + 21:02d}"


def generated_names() -> list[str]:
    text = SRC.read_text(encoding="utf-8")
    block = re.search(r"curatedAdditionalRecipeNames = \[(.*?)\] as const", text, re.S)
    curated = re.findall(r'"([^"]+)"', block.group(1))
    bases = ["Pelet", "Jagung", "Roti", "Ubi", "Tahu", "Singkong", "Kacang", "Tempe", "Kelapa", "Biskuit", "Sarden", "Pisang", "Tepung"]
    profiles = ["Pandan Wangi", "Susu Gurih", "Keju Lembut", "Kroto Segar", "Madu Manis", "Santan Kental", "Vanila Putih", "Kelapa Gurih"]
    expansion = [f"Racikan {b} {p}" for b in bases for p in profiles][:101]
    return curated + expansion


def convert(src: Path, dst: Path, crop_pct: int, flip: bool, brightness: int, saturation: int, hue: int) -> None:
    cmd = ["convert", str(src)]
    if flip:
        cmd.append("-flop")
    cmd += [
        "-resize", f"{crop_pct * 16}x{crop_pct * 10}^",
        "-gravity", "center",
        "-extent", "900x600",
        "-modulate", f"{brightness},{saturation},{hue}",
        "-quality", "68",
        str(dst),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    made = skipped = 0

    for slug, (base, crop_pct, flip, saturation) in CORE_VARIANTS.items():
        dst = OUT_DIR / f"{slug}.jpg"
        if dst.exists() and not FORCE:
            skipped += 1
            continue
        convert(ROOT / "public" / "images" / base, dst, crop_pct, flip, 100, saturation, 100)
        made += 1

    used_variants: set[tuple] = set()
    for index, name in enumerate(generated_names()):
        slug = slug_for(name, index)
        dst = OUT_DIR / f"{slug}.jpg"
        if dst.exists() and not FORCE:
            skipped += 1
            continue
        seed = int(hashlib.md5(slug.encode()).hexdigest()[:8], 16)
        base_rel, hue = BASES[family_of(name)]
        if family_of(name) == "ungu":
            # Pergeseran hue keluarga ungu dibuat lebih lembut agar tidak neon.
            saturation_override = 78
        else:
            saturation_override = None
        crop_pct = 62 + seed % 24
        flip = bool(seed & 1)
        brightness = 96 + seed % 9
        saturation = saturation_override if saturation_override is not None else 94 + (seed >> 4) % 15
        # Jamin kombinasi varian tidak berulang antarresep (dua resep pernah
        # menghasilkan berkas identik byte-per-byte sebelum penjagaan ini).
        variant = (base_rel, crop_pct, flip, brightness, saturation, hue)
        while variant in used_variants:
            crop_pct = 62 + (crop_pct - 61) % 24
            variant = (base_rel, crop_pct, flip, brightness, saturation, hue)
        used_variants.add(variant)
        convert(ROOT / "public" / "images" / base_rel, dst, crop_pct, flip, brightness, saturation, hue)
        made += 1

    print(f"foto racikan: {made} dibuat, {skipped} sudah ada dilewati")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
