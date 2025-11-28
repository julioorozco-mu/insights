#!/bin/bash

# Script de despliegue para Firebase Hosting
# Uso: ./deploy.sh [preview|production]

set -e

echo "🚀 Iniciando proceso de despliegue..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_message() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Verificar que Firebase CLI esté instalado
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI no está instalado"
    echo "Instálalo con: npm install -g firebase-tools"
    exit 1
fi

print_message "Firebase CLI encontrado"

# Verificar que estemos autenticados
if ! firebase projects:list &> /dev/null; then
    print_error "No estás autenticado en Firebase"
    echo "Ejecuta: firebase login"
    exit 1
fi

print_message "Autenticación verificada"

# Verificar que .firebaserc esté configurado
if grep -q "tu-proyecto-id" .firebaserc; then
    print_error "Debes configurar tu Project ID en .firebaserc"
    echo "Edita .firebaserc y reemplaza 'tu-proyecto-id' con tu Project ID real"
    exit 1
fi

print_message "Configuración de proyecto verificada"

# Verificar que exista .env o .env.local
if [ ! -f .env ] && [ ! -f .env.local ]; then
    print_warning "No se encontró archivo .env o .env.local"
    print_warning "Asegúrate de configurar las variables de entorno en Firebase"
fi

# Limpiar build anterior
print_message "Limpiando build anterior..."
rm -rf .next

# Instalar dependencias
print_message "Instalando dependencias..."
npm ci

# Ejecutar linter
print_message "Ejecutando linter..."
npm run lint || print_warning "Linter encontró advertencias (continuando...)"

# Construir aplicación
print_message "Construyendo aplicación Next.js..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Error en el build"
    exit 1
fi

print_message "Build completado exitosamente"

# Determinar tipo de despliegue
DEPLOY_TYPE=${1:-production}

if [ "$DEPLOY_TYPE" = "preview" ]; then
    # Despliegue preview
    CHANNEL_NAME="preview-$(date +%Y%m%d-%H%M%S)"
    print_message "Desplegando canal preview: $CHANNEL_NAME"
    firebase hosting:channel:deploy "$CHANNEL_NAME" --expires 7d
    
elif [ "$DEPLOY_TYPE" = "production" ]; then
    # Despliegue a producción
    print_warning "¿Estás seguro de desplegar a PRODUCCIÓN? (y/n)"
    read -r response
    
    if [ "$response" != "y" ]; then
        print_message "Despliegue cancelado"
        exit 0
    fi
    
    print_message "Desplegando a producción..."
    firebase deploy --only hosting
    
else
    print_error "Tipo de despliegue inválido: $DEPLOY_TYPE"
    echo "Uso: ./deploy.sh [preview|production]"
    exit 1
fi

if [ $? -eq 0 ]; then
    print_message "¡Despliegue completado exitosamente! 🎉"
    
    if [ "$DEPLOY_TYPE" = "production" ]; then
        echo ""
        print_message "Tu aplicación está disponible en:"
        firebase hosting:channel:open live 2>/dev/null || echo "https://$(grep default .firebaserc | cut -d'"' -f4).web.app"
    fi
else
    print_error "Error durante el despliegue"
    exit 1
fi
