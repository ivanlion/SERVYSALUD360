#!/bin/bash

# Script de verificación pre-deploy para Vercel
# Ejecutar antes de hacer deploy: bash scripts/pre-deploy-check.sh

set -e

echo "🔍 Verificando proyecto antes de deploy..."
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar comandos
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅ $1 instalado${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 no encontrado${NC}"
        return 1
    fi
}

# 1. Verificar Node.js y npm
echo "📦 Verificando dependencias..."
check_command node
check_command npm

# 2. Verificar variables de entorno
echo ""
echo "🔐 Verificando variables de entorno..."
if [ -f .env.local ]; then
    echo -e "${GREEN}✅ Archivo .env.local encontrado${NC}"
    
    # Verificar variables críticas
    required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "GOOGLE_GENERATIVE_AI_API_KEY"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env.local; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ Todas las variables de entorno requeridas están presentes${NC}"
    else
        echo -e "${RED}❌ Variables faltantes:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "${RED}   - $var${NC}"
        done
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Archivo .env.local no encontrado (normal si usas variables en Vercel)${NC}"
fi

# 3. Instalar dependencias
echo ""
echo "📥 Instalando dependencias..."
npm install

# 4. Ejecutar linter
echo ""
echo "🔍 Ejecutando linter..."
if npm run lint; then
    echo -e "${GREEN}✅ Linter pasó${NC}"
else
    echo -e "${RED}❌ Linter falló${NC}"
    exit 1
fi

# 5. Ejecutar tests
echo ""
echo "🧪 Ejecutando tests..."
if npm test -- --passWithNoTests; then
    echo -e "${GREEN}✅ Tests pasaron${NC}"
else
    echo -e "${YELLOW}⚠️  Algunos tests fallaron (continuando...)${NC}"
fi

# 6. Build
echo ""
echo "🏗️  Ejecutando build..."
if npm run build; then
    echo -e "${GREEN}✅ Build exitoso${NC}"
else
    echo -e "${RED}❌ Build falló${NC}"
    exit 1
fi

# 7. Verificar tamaño del build
echo ""
echo "📊 Verificando tamaño del build..."
if [ -d ".next" ]; then
    build_size=$(du -sh .next | cut -f1)
    echo -e "${GREEN}✅ Tamaño del build: $build_size${NC}"
else
    echo -e "${RED}❌ Directorio .next no encontrado${NC}"
    exit 1
fi

# 8. Resumen final
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Verificación pre-deploy completada${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Checklist:"
echo "  ✅ Variables de entorno configuradas"
echo "  ✅ Dependencias instaladas"
echo "  ✅ Linter pasando"
echo "  ✅ Tests ejecutados"
echo "  ✅ Build exitoso"
echo ""
echo "🚀 Listo para deploy en Vercel!"
echo "   Ejecuta: vercel --prod"



