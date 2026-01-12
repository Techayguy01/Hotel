import shutil
import os

tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
print(f"Checking explicit path: {tesseract_path}")
if os.path.exists(tesseract_path):
    print("FOUND at explicit path.")
else:
    print("NOT FOUND at explicit path.")

in_path = shutil.which("tesseract")
print(f"Checking PATH: {in_path}")
if in_path:
    print(f"FOUND in PATH at: {in_path}")
else:
    print("NOT FOUND in PATH.")
