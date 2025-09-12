#!/bin/bash
# Script de construcción para Render

# Instalar dependencias del backend
pip install -r requirements.txt

# Instalar dependencias del frontend
cd frontend
npm install
npm run build
cd ..

# Ejecutar migraciones
flask db upgrade
