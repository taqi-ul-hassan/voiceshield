"""
TASK-03 — Iconography format conversion script.

Produces for each source PNG in voiceshield/promotions/:
  - PNG variants: 16×16, 32×32, 48×48, 64×64, 128×128, 256×256, 512×512, 1024×1024
  - .ico: multi-frame ICO containing 16, 32, 48, 64, 128, 256
  - .svg: vector adaptation matching the brand palette

Run from the voiceshield/ directory:
    python scripts/convert_icons.py
"""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install Pillow")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
HERE = Path(__file__).parent
PROMOTIONS = HERE.parent / "promotions"

SOURCES = [
    PROMOTIONS / "X_VOICE_X.png",
    PROMOTIONS / "X_VOICE_X_ALT.png",
]

PNG_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024]
ICO_SIZES = [16, 32, 48, 64, 128, 256]


def export_png_sizes(src: Path) -> None:
    stem = src.stem
    img = Image.open(src).convert("RGBA")
    for size in PNG_SIZES:
        out = PROMOTIONS / f"{stem}_{size}x{size}.png"
        resized = img.resize((size, size), Image.LANCZOS)
        resized.save(out, "PNG", optimize=True)
        print(f"  PNG {size}x{size}  →  {out.name}")


def export_ico(src: Path) -> None:
    stem = src.stem
    img = Image.open(src).convert("RGBA")
    frames = [img.resize((s, s), Image.LANCZOS) for s in ICO_SIZES]
    out = PROMOTIONS / f"{stem}.ico"
    frames[0].save(
        out,
        format="ICO",
        sizes=[(s, s) for s in ICO_SIZES],
        append_images=frames[1:],
    )
    print(f"  ICO  ({', '.join(str(s) for s in ICO_SIZES)})  →  {out.name}")


# ---------------------------------------------------------------------------
# SVG generation — vector re-creation of the brand mark
# ---------------------------------------------------------------------------

_SVG_ROSE = """\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img"
     aria-label="X Voice X — Rose variant">
  <title>X Voice X</title>
  <rect width="800" height="450" fill="#ffaec9"/>
  <rect x="4" y="4" width="792" height="442" fill="none" stroke="#b76e79" stroke-width="8" rx="4"/>

  <!-- Left X -->
  <line x1="60"  y1="60"  x2="290" y2="390" stroke="#000" stroke-width="52" stroke-linecap="square"/>
  <line x1="290" y1="60"  x2="60"  y2="390" stroke="#000" stroke-width="52" stroke-linecap="square"/>
  <!-- Left X diamond accent -->
  <polygon points="175,195 195,225 175,255 155,225" fill="#b76e79"/>

  <!-- Voice waveform (centre) -->
  <polyline points="320,225 360,225 380,120 410,340 440,160 460,290 490,225 510,225 540,225"
            fill="none" stroke="#000" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Right X -->
  <line x1="510" y1="60"  x2="740" y2="390" stroke="#000" stroke-width="52" stroke-linecap="square"/>
  <line x1="740" y1="60"  x2="510" y2="390" stroke="#000" stroke-width="52" stroke-linecap="square"/>
  <!-- Right X diamond accent -->
  <polygon points="625,195 645,225 625,255 605,225" fill="#b76e79"/>
</svg>
"""

_SVG_NOIR = """\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img"
     aria-label="X Voice X — Noir variant">
  <title>X Voice X (Noir)</title>
  <rect width="800" height="450" fill="#000000"/>
  <rect x="4" y="4" width="792" height="442" fill="none" stroke="#b76e79" stroke-width="8" rx="4"/>

  <!-- Left X -->
  <line x1="60"  y1="60"  x2="290" y2="390" stroke="#ffaec9" stroke-width="52" stroke-linecap="square"/>
  <line x1="290" y1="60"  x2="60"  y2="390" stroke="#ffaec9" stroke-width="52" stroke-linecap="square"/>
  <!-- Left X diamond accent -->
  <polygon points="175,195 195,225 175,255 155,225" fill="#b76e79"/>

  <!-- Voice waveform (centre) -->
  <polyline points="320,225 360,225 380,120 410,340 440,160 460,290 490,225 510,225 540,225"
            fill="none" stroke="#ffaec9" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Right X -->
  <line x1="510" y1="60"  x2="740" y2="390" stroke="#ffaec9" stroke-width="52" stroke-linecap="square"/>
  <line x1="740" y1="60"  x2="510" y2="390" stroke="#ffaec9" stroke-width="52" stroke-linecap="square"/>
  <!-- Right X diamond accent -->
  <polygon points="625,195 645,225 625,255 605,225" fill="#b76e79"/>
</svg>
"""

_SVG_SQUARE_ROSE = """\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img"
     aria-label="X Voice X — Square icon (Rose)">
  <title>X Voice X Icon</title>
  <rect width="512" height="512" rx="96" fill="#ffaec9"/>

  <!-- X Voice X monogram: compact square layout -->
  <!-- Left mini-X -->
  <line x1="32"  y1="80"  x2="198" y2="432" stroke="#000" stroke-width="52" stroke-linecap="round"/>
  <line x1="198" y1="80"  x2="32"  y2="432" stroke="#000" stroke-width="52" stroke-linecap="round"/>
  <polygon points="115,235 135,256 115,277 95,256" fill="#b76e79"/>

  <!-- Waveform -->
  <polyline points="210,256 240,256 260,140 285,372 310,170 330,310 354,256 384,256"
            fill="none" stroke="#000" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Right mini-X -->
  <line x1="314" y1="80"  x2="480" y2="432" stroke="#000" stroke-width="52" stroke-linecap="round"/>
  <line x1="480" y1="80"  x2="314" y2="432" stroke="#000" stroke-width="52" stroke-linecap="round"/>
  <polygon points="397,235 417,256 397,277 377,256" fill="#b76e79"/>
</svg>
"""

_SVG_SQUARE_NOIR = """\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img"
     aria-label="X Voice X — Square icon (Noir)">
  <title>X Voice X Icon (Noir)</title>
  <rect width="512" height="512" rx="96" fill="#000000"/>

  <!-- Left mini-X -->
  <line x1="32"  y1="80"  x2="198" y2="432" stroke="#ffaec9" stroke-width="52" stroke-linecap="round"/>
  <line x1="198" y1="80"  x2="32"  y2="432" stroke="#ffaec9" stroke-width="52" stroke-linecap="round"/>
  <polygon points="115,235 135,256 115,277 95,256" fill="#b76e79"/>

  <!-- Waveform -->
  <polyline points="210,256 240,256 260,140 285,372 310,170 330,310 354,256 384,256"
            fill="none" stroke="#ffaec9" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Right mini-X -->
  <line x1="314" y1="80"  x2="480" y2="432" stroke="#ffaec9" stroke-width="52" stroke-linecap="round"/>
  <line x1="480" y1="80"  x2="314" y2="432" stroke="#ffaec9" stroke-width="52" stroke-linecap="round"/>
  <polygon points="397,235 417,256 397,277 377,256" fill="#b76e79"/>
</svg>
"""

SVG_MAP = {
    "X_VOICE_X": (_SVG_ROSE, _SVG_SQUARE_ROSE),
    "X_VOICE_X_ALT": (_SVG_NOIR, _SVG_SQUARE_NOIR),
}


def export_svg(src: Path) -> None:
    stem = src.stem
    banner_svg, square_svg = SVG_MAP[stem]
    banner_out = PROMOTIONS / f"{stem}.svg"
    banner_out.write_text(banner_svg, encoding="utf-8")
    print(f"  SVG (banner)  →  {banner_out.name}")
    square_out = PROMOTIONS / f"{stem}_square.svg"
    square_out.write_text(square_svg, encoding="utf-8")
    print(f"  SVG (square)  →  {square_out.name}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    for src in SOURCES:
        if not src.exists():
            print(f"[SKIP] {src} not found")
            continue
        print(f"\n{src.name}:")
        export_png_sizes(src)
        export_ico(src)
        export_svg(src)
    print("\nDone.")


if __name__ == "__main__":
    main()
