import os

folders = ["models", "routes", "controllers", "database"]
files = {
    "app.py": "",
    "config.py": "",
    "requirements.txt": "",
    "models/__init__.py": "",
    "models/libro.py": "",
    "routes/__init__.py": "",
    "routes/libros.py": "",
    "controllers/__init__.py": "",
    "controllers/libro_controller.py": "",
    "database/__init__.py": "",
}

for folder in folders:
    os.makedirs(folder, exist_ok=True)

for file, content in files.items():
    with open(file, "w") as f:
        f.write(content)

print("✅ Estructura creada correctamente 🚀")
