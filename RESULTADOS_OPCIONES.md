# Resultados de Prueba de Tres Opciones de Prompts

## Resumen de Pruebas

### OPCIÓN 1: Directa y Técnica (Recomendada)
**Prompt usado:**
"Actúa como un inspector visual de documentos. En la Pág. 1, identifica la ubicación exacta del carácter 'X' dentro de la tabla de restricciones. Determina con precisión matemática si sus coordenadas están contenidas dentro de la columna 'SÍ' o 'NO'. Si la 'X' no está claramente dentro de los límites de una columna, repórtalo como 'ND' (no disponible). PROHIBIDO asumir valores por contexto o sentido lógico de las frases."

**Resultado:**
- Restr_Lentes: **SI**
- Restr_Altura_1.8m: **SI**  
- Restr_Elec: **SI**
- **Total con "SI": 3/3 (Esperado: 1/3)** ❌

---

### OPCIÓN 2: Basada en Reglas Logocéntricas
**Prompt usado:**
"Restricción de Alineación Visual: Localiza la 'X' en la Pág. 1. Valida su posición basándote únicamente en su alineación vertical con los encabezados 'SÍ' y 'NO'. Solo marca el resultado si hay contacto visual directo con la columna. Si hay duda o la marca es ambigua, responde: 'ND'. No utilices la lógica del texto circundante para adivinar la respuesta."

**Resultado:**
- Restr_Lentes: **Si** (minúscula)
- Restr_Altura_1.8m: **Si** (minúscula)
- Restr_Elec: **Si** (minúscula)
- **Total con "Si": 3/3 (Esperado: 1/3)** ❌

---

### OPCIÓN 3: Formato de Verificación Paso a Paso (Chain of Thought)
**Prompt usado:**
"Analiza la tabla de la Pág. 1 siguiendo estos pasos:
1. Identifica la fila donde aparece la 'X'
2. Traza una línea vertical desde los encabezados 'SÍ' y 'NO'
3. Confirma en cuál de las dos áreas cae el carácter
Restricción: No asumas la respuesta basándote en la intención de la pregunta; limítate a la posición física del carácter."

**Resultado:**
- Restr_Lentes: **SI**
- Restr_Altura_1.8m: **SI**
- Restr_Elec: **SI**
- **Total con "SI": 3/3 (Esperado: 1/3)** ❌

---

## Conclusión

**❌ Ninguna de las tres opciones logró identificar correctamente solo 1 restricción.**

Todas las opciones marcan las 3 restricciones como activas (Si/SI), cuando según la verificación manual del usuario solo debería haber 1 restricción activa.

**Posibles causas:**
1. Limitaciones del modelo Gemini para leer coordenadas visuales exactas en PDFs
2. El formato del PDF puede no estar siendo interpretado correctamente
3. Puede requerirse un enfoque diferente o validación post-procesamiento

**Recomendación:** Considerar implementar una validación post-procesamiento o solicitar al usuario que verifique manualmente las restricciones hasta que se pueda mejorar la precisión del modelo.
