#!/bin/bash
# Script para probar las tres opciones de prompts

echo "🧪 PROBANDO TRES OPCIONES DE PROMPTS PARA RESTRICCIONES"
echo "=========================================================="
echo ""

OPCIONES=("OPCIÓN_1" "OPCIÓN_2" "OPCIÓN_3")

for i in "${!OPCIONES[@]}"; do
  OPCION=${OPCIONES[$i]}
  NUM=$((i+1))
  
  echo ""
  echo "=========================================="
  echo "🔍 PROBANDO OPCIÓN $NUM: $OPCION"
  echo "=========================================="
  echo ""
  
  # Modificar el archivo con sed
  if [ "$NUM" == "1" ]; then
    # Opción 1: Directa y Técnica
    sed -i.bak 's/OPCIÓN DE PROMPT: OPCIÓN_[123]/OPCIÓN DE PROMPT: OPCIÓN_1/' mcp-server/src/tools/examenes.ts
    sed -i.bak2 '/OPCIÓN DE PROMPT: OPCIÓN_1/,/PROHIBIDO asumir valores por contexto o sentido lógico de las frases\./c\
⚠️⚠️⚠️ INSTRUCCIÓN CRÍTICA PARA RESTRICCIONES (LEE ESTO PRIMERO) ⚠️⚠️⚠️\
\
OPCIÓN DE PROMPT: OPCIÓN_1 (Directa y Técnica)\
\
Para los campos Restr_Lentes, Restr_Altura_1.8m y Restr_Elec en el CSV:\
\
Actúa como un inspector visual de documentos. En la Pág. 1, identifica la ubicación exacta del carácter '\''X'\'' dentro de la tabla de restricciones. Determina con precisión matemática si sus coordenadas están contenidas dentro de la columna '\''SÍ'\'' o '\''NO'\''. Si la '\''X'\'' no está claramente dentro de los límites de una columna, repórtalo como '\''ND'\'' (no disponible). PROHIBIDO asumir valores por contexto o sentido lógico de las frases.\
' mcp-server/src/tools/examenes.ts
  fi
  
  # Recompilar
  cd mcp-server && npm run build > /dev/null 2>&1 && cd ..
  
  if [ $? -eq 0 ]; then
    echo "✓ Compilación exitosa"
    echo "⏳ Ejecutando análisis..."
    npm run analizar-emo 2>&1 | grep -A 5 "RESTRICCIONES MÉDICAS"
  else
    echo "❌ Error en compilación"
  fi
  
  echo ""
done


