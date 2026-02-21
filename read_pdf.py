import PyPDF2
r = PyPDF2.PdfReader(r'C:\Users\HP\Downloads\s00704-025-05535-7 (1).pdf')
print("Pages:", len(r.pages))
for i in range(min(8, len(r.pages))):
    t = r.pages[i].extract_text()
    if t:
        print(f"=== PAGE {i+1} ===")
        print(t[:3000])
