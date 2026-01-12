import base64
import cv2
import numpy as np
import pytesseract
from PIL import Image
import io
import os
import shutil
import sys

# CRITICAL: Point to your Tesseract EXE (Update path if different)
# Common path on Windows:
# We will use the default path provided or try to find it. 
# Best practice: Check if it's in PATH, otherwise fallback to common location.
common_paths = [
    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
    os.path.join(os.getenv('LOCALAPPDATA', ''), r'Tesseract-OCR\tesseract.exe')
]

tesseract_cmd = shutil.which("tesseract")
if not tesseract_cmd:
    for path in common_paths:
        if os.path.exists(path):
            tesseract_cmd = path
            break

if tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    print(f"Tesseract found and configured at: {tesseract_cmd}", file=sys.stderr)
else:
    print("WARNING: Tesseract not found. OCR will fail.", file=sys.stderr)

def scan_id_card(base64_image: str) -> str:
    """
    Decodes a base64 image, preprocesses it for high contrast,
    and runs OCR to extract text.
    """
    try:
        # 1. Decode Base64 to Image
        if "," in base64_image:
            base64_image = base64_image.split(",")[1]
            
        image_data = base64.b64decode(base64_image)
        image = Image.open(io.BytesIO(image_data))
        
        # 2. Convert to CV2 format for processing
        img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        # 3. Pre-processing (Grayscale + Thresholding for sharp text)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        # Apply simple thresholding to make text black and background white
        _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)

        # 4. Run OCR
        text = pytesseract.image_to_string(thresh)
        
        clean_text = " ".join(text.split())
        return clean_text

    except Exception as e:
        return f"Error scanning ID: {str(e)}"
