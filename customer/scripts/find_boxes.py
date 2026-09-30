from PIL import Image
import os

base_dir = r"C:\Users\pranu\.gemini\antigravity\brain\88aca2ca-9ce6-4124-ad6b-92cc92232c25\.user_uploaded"
images = [
    ("princely3", "media_1790768174160.png"),
    ("princely2", "media_1790768201327.png"),
    ("princely1", "media_1790768227179.png"),
    ("crane_fdc", "media_1790768268917.png"),
    ("birds_sheet", "media_1790768297147.png")
]

for name, fname in images:
    path = os.path.join(base_dir, fname)
    with Image.open(path) as img:
        rgb = img.convert("RGB")
        w, h = rgb.size
        # Dark PDF viewer background is typically rgb < 40
        # Let's find top y, bottom y, left x, right x where pixels are not dark grey/black
        # The PDF content area is roughly in y in [105, 545], x in [100, 950]
        
        # Scan y from 105 downwards for the first row with substantial non-dark pixels
        top = None
        for y in range(100, 200):
            row_bright = sum(1 for x in range(200, 800) if sum(rgb.getpixel((x, y))) > 200)
            if row_bright > 300:
                top = y
                break
                
        bottom = None
        for y in range(545, 400, -1):
            row_bright = sum(1 for x in range(200, 800) if sum(rgb.getpixel((x, y))) > 200)
            if row_bright > 300:
                bottom = y
                break
                
        left = None
        for x in range(100, 400):
            col_bright = sum(1 for y in range(top, bottom) if sum(rgb.getpixel((x, y))) > 200)
            if col_bright > (bottom - top) * 0.7:
                left = x
                break
                
        right = None
        for x in range(950, 600, -1):
            col_bright = sum(1 for y in range(top, bottom) if sum(rgb.getpixel((x, y))) > 200)
            if col_bright > (bottom - top) * 0.7:
                right = x
                break
                
        print(f"{name}: bbox = ({left}, {top}, {right}, {bottom}), size=({right-left}, {bottom-top})")

