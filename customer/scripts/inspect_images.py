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
        print(f"{name}: size={img.size}, mode={img.mode}")
