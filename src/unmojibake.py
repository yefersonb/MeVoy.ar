import os

# your replacement map
fixes = {
    "Ã¡": "á",
    "Ã©": "é",
    "Ã­": "í",
    "Ã³": "ó",
    "Ãº": "ú",
    "Ã±": "ñ",
    "Â¡": "¡",
    "Â¿": "¿"
}

# which file types to touch
EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".html", ".css"}

for root, _, files in os.walk("."):
    for file in files:
        if any(file.endswith(ext) for ext in EXTENSIONS):
            path = os.path.join(root, file)

            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            new_content = content
            for bad, good in fixes.items():
                new_content = new_content.replace(bad, good)

            if new_content != content:
                print(f"Fixed: {path}")
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)