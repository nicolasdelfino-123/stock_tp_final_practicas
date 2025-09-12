#!/bin/bash
set -e

echo "Starting build process..."

# Instalar dependencias del backend
echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt

# Instalar dependencias del frontend y hacer build
echo "Installing frontend dependencies and building..."
cd ../frontend
npm install
npm run build

echo "Build completed successfully!"
