import sys
import os

# Install PyPDF2 if needed
try:
    import PyPDF2
    print("PyPDF2 imported successfully")
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyPDF2"])
    import PyPDF2
    print("PyPDF2 installed and imported")

pdf_path = r"C:\Users\HP\Downloads\irc.gov.in.022.2014.pdf"
output_path = r"C:\Users\HP\OneDrive\Desktop\NICMAR PROJECT\irc22_text.txt"

if not os.path.exists(pdf_path):
    print(f"ERROR: PDF file not found at {pdf_path}")
    sys.exit(1)

print(f"Opening PDF: {pdf_path}")

with open(pdf_path, "rb") as f:
    reader = PyPDF2.PdfReader(f)
    total_pages = len(reader.pages)
    print(f"Total pages: {total_pages}")
    
    all_text = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            all_text.append(f"--- PAGE {i+1} ---\n{text}\n")
        else:
            all_text.append(f"--- PAGE {i+1} ---\n[No text extracted - possibly scanned/image]\n")
    
    full_text = "\n".join(all_text)

with open(output_path, "w", encoding="utf-8") as f:
    f.write(full_text)

print(f"Text written to: {output_path}")
print(f"Total characters extracted: {len(full_text)}")

# Quick check: how many pages had extractable text
pages_with_text = sum(1 for t in all_text if "[No text extracted" not in t)
print(f"Pages with extractable text: {pages_with_text}/{total_pages}")
