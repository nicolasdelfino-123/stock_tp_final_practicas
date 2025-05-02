# 📚 Librería API - Flask

Este proyecto es una API RESTful construida con **Flask**, pensada para administrar libros de una librería (alta, baja, modificación, consulta por título, autor o ISBN). Usa **SQLAlchemy** como ORM, soporta **CORS** para conexión con frontends y cuenta con un **panel de administración** básico con Flask-Admin.

---

## ⚙️ Tecnologías usadas

- Python 3.11+
- Flask 3
- SQLAlchemy 2
- Flask-Admin
- Flask-CORS
- Unidecode
- SQLite (por defecto)

---

## 🧾 Instalación

### 1. Cloná el proyecto

```bash
git clone https://github.com/tu-usuario/tu-repo.git
cd tu-repo

2. Creá y activá un entorno virtual

python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

3. Instalá las dependencias

pip install -r requirements.txt

4. Configurá variables de entorno en un archivo .env (si no existe)

DATABASE_URL=sqlite:///db.sqlite3
FLASK_ENV=development

5. Ejecutá la app
python app.py

🧪 Endpoints disponibles

| Método | Ruta                | Descripción                                      |
| ------ | ------------------- | ------------------------------------------------ |
| GET    | `/`                 | Mensaje de bienvenida                            |
| GET    | `/libros`           | Lista todos los libros o busca por `q` o `isbn`  |
| POST   | `/libros`           | Crea un libro o actualiza uno existente por ISBN |
| PUT    | `/libros/<id>`      | Actualiza un libro por su ID                     |
| PUT    | `/bajar-libro/<id>` | Resta stock de un libro (simula una venta)       |
| DELETE | `/libros/<id>`      | Elimina un libro por su ID                       |


📁 Estructura del proyecto
.
├── app.py                # Código principal de la aplicación Flask
├── models/
│   └── libro.py          # Modelo SQLAlchemy del libro
├── config.py             # Configuraciones del entorno
├── requirements.txt      # Dependencias del proyecto
└── README.md             # Este archivo

🧠 Consideraciones
Las búsquedas por título o autor no distinguen mayúsculas ni acentos.

Si un ISBN ya existe, el POST lo actualiza en lugar de duplicar el libro.

El precio puede ser null.

El stock nunca se vuelve negativo.

A futuro podés conectar esta API con un frontend en React o similar.

💡 A mejorar en versiones futuras
Autenticación (login/token)

Paginación en la ruta /libros

Validaciones más estrictas

Tests automatizados

Conexión con base de datos remota (PostgreSQL/MySQL)

👨‍💻 Autor
Hecho con ❤️ por [Nicolás - @nicolasdelfino-123]
```
