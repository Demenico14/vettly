"""Renders a sample CV as a fake scan (slight tilt, grey paper, noise, blur) for testing OCR.
Usage: python3 scripts/models/make-scan.py <out.png>"""
import random
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

LINES = [
    ("Tatenda Moyo", 44, True),
    ("Senior Accountant", 28, False),
    ("tatenda.moyo@example.com  |  +263 77 123 4567  |  Harare, Zimbabwe", 22, False),
    ("", 20, False),
    ("WORK EXPERIENCE", 26, True),
    ("Senior Accountant, Delta Beverages", 24, False),
    ("March 2020 - Present", 22, False),
    ("Led month-end close for three business units and cut the reporting", 22, False),
    ("cycle from ten days to six.", 22, False),
    ("Audit Senior, Ernst & Young Zimbabwe", 24, False),
    ("January 2016 - February 2020", 22, False),
    ("", 20, False),
    ("EDUCATION", 26, True),
    ("Bachelor of Accountancy (Honours), University of Zimbabwe, 2015", 22, False),
    ("", 20, False),
    ("CERTIFICATIONS", 26, True),
    ("ACCA, Association of Chartered Certified Accountants, 2018", 22, False),
    ("", 20, False),
    ("SKILLS", 26, True),
    ("IFRS, Sage Evolution, Excel, Power BI, team leadership", 22, False),
]

random.seed(7)
W, H = 1240, 1754  # A4 at 150 dpi
page = Image.new("L", (W, H), 238)
d = ImageDraw.Draw(page)
y = 110
for text, size, bold in LINES:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Times New Roman.ttf", size)
    if text:
        d.text((110, y), text, fill=30, font=font, stroke_width=1 if bold else 0, stroke_fill=30)
    y += int(size * 1.55)
# Scanner noise, a slight tilt and blur.
px = page.load()
for _ in range(25000):
    x, yy = random.randrange(W), random.randrange(H)
    px[x, yy] = random.choice([90, 160, 200])
page = page.rotate(1.2, fillcolor=228, resample=Image.BICUBIC).filter(ImageFilter.GaussianBlur(0.8))
page.convert("RGB").save(sys.argv[1], quality=70)
print("wrote", sys.argv[1], page.size)
