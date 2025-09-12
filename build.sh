#!/bin/bash
# Build script para Render

# Instalar dependencias del backend
cd backend
pip install -r requirements.txt

# Instalar dependencias del frontend
cd ../frontend
npm install
npm run build

# Volver al directorio backend
cd ../backend
