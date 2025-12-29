# 📊 Características de Análisis Predictivo y Tendencias

## ✅ Implementaciones Completadas

### 1. ✓ Predicción de Deterioro de Salud Visual

**Ubicación**: `mcp-server/src/services/health-predictor.ts`

**Características**:
- ✅ Análisis de historial de exámenes médicos
- ✅ Cálculo de probabilidad de deterioro (0-100%)
- ✅ Identificación de factores de riesgo
- ✅ Determinación de tendencia (MEJORANDO/ESTABLE/EMPEORANDO)
- ✅ Recomendaciones personalizadas
- ✅ Sugerencia de próximo control

**Factores considerados**:
- Agudeza visual actual vs. anterior
- Uso de lentes correctores
- Velocidad de deterioro
- Edad del trabajador
- Tipo de puesto (exposición visual)

**Niveles de riesgo**:
- **BAJO**: < 20% probabilidad
- **MEDIO**: 20-40% probabilidad
- **ALTO**: 40-60% probabilidad
- **CRÍTICO**: > 60% probabilidad

### 2. ✓ Análisis de Tendencias por Empresa

**Ubicación**: `mcp-server/src/services/trend-analyzer.ts`

**Tendencias analizadas**:
- ✅ Salud visual (promedio de agudeza visual)
- ✅ Restricciones médicas (tasa de trabajadores con restricciones)
- ✅ Aptitud laboral (tasa de aptos/no aptos)
- ✅ Patologías comunes (tasa de trabajadores con patologías)

**Indicadores calculados**:
- Tasa de aptos (%)
- Tasa de restricciones (%)
- Tasa de no aptos (%)
- Promedio de edad

**Alertas generadas**:
- Deterioro significativo de salud visual
- Aumento de restricciones médicas
- Disminución en tasa de aptitud
- Alta tasa de no aptos (>10%)
- Más del 50% con restricciones
- Población laboral envejecida (>50 años promedio)

### 3. ✓ Sistema de Alertas de Riesgos Emergentes

**Ubicación**: `mcp-server/src/services/risk-alerts.ts`

**Categorías de alertas**:
- ✅ **VISUAL**: Deterioro acelerado de salud visual
- ✅ **AUDITIVO**: Problemas auditivos detectados
- ✅ **MUSCULOESQUELÉTICO**: Problemas musculoesqueléticos
- ✅ **CARDIOVASCULAR**: Indicadores cardiovasculares anormales
- ✅ **GENERAL**: Patrones por empresa

**Niveles de alerta**:
- **CRÍTICO**: Requiere acción inmediata
- **ALTO**: Requiere atención prioritaria
- **MEDIO**: Requiere monitoreo
- **BAJO**: Informativo

**Detección automática**:
- Deterioro visual > 15% entre exámenes
- Problemas auditivos (hipoacusia, trauma acústico)
- Problemas musculoesqueléticos (dolor, lumbalgia)
- Presión arterial o frecuencia cardíaca anormales
- Alta tasa de no aptitud por empresa (>15%)

### 4. ✓ Generación de Recomendaciones Preventivas

**Ubicación**: `mcp-server/src/services/preventive-recommendations.ts`

**Características**:
- ✅ Generación con Gemini AI
- ✅ Recomendaciones específicas y accionables
- ✅ Priorización automática (ALTA/MEDIA/BAJA)
- ✅ Estimación de impacto esperado
- ✅ Plazos de implementación sugeridos
- ✅ Recursos necesarios identificados

**Tipos de recomendaciones**:
- **EMPRESA**: Basadas en tendencias y alertas de la empresa
- **TRABAJADOR**: Personalizadas para un trabajador específico
- **GENERAL**: Basadas en análisis global

**Categorías**:
- Salud Visual
- Ergonomía
- Protección Auditiva
- Estilos de Vida Saludables
- Condiciones de Trabajo
- Programas Preventivos

## 🛠️ Herramientas MCP Disponibles

### `analytics_predecir_salud_visual`
Predice deterioro de salud visual para un trabajador.

**Parámetros**:
- `trabajador_id` (string, opcional)
- `dni` (string, opcional)

**Retorna**:
```json
{
  "trabajador_id": "...",
  "dni": "...",
  "nombre": "...",
  "empresa": "...",
  "riesgo": "ALTO",
  "probabilidad_deterioro": 45,
  "factores_riesgo": ["Agudeza visual baja", "Deterioro rápido"],
  "tendencia": "EMPEORANDO",
  "recomendaciones": ["Control oftalmológico inmediato"],
  "proximo_control_sugerido": "2025-03-28"
}
```

### `analytics_tendencias_empresa`
Analiza tendencias de salud ocupacional por empresa.

**Parámetros**:
- `empresa` (string, requerido)
- `meses_atras` (number, opcional, default: 12)

**Retorna**:
```json
{
  "empresa": "...",
  "total_trabajadores": 50,
  "total_examenes": 120,
  "periodo_analisis": {
    "desde": "2024-12-28",
    "hasta": "2025-12-28"
  },
  "tendencias": {
    "salud_visual": { "tendencia": "EMPEORANDO", "cambio_porcentual": 12.5 },
    "restricciones": { "tendencia": "ESTABLE", "cambio_porcentual": 2.1 },
    "aptitud": { "tendencia": "MEJORANDO", "cambio_porcentual": 5.3 },
    "patologias_comunes": { "tendencia": "ESTABLE", "cambio_porcentual": 0.8 }
  },
  "indicadores": {
    "tasa_aptos": 85.5,
    "tasa_restricciones": 45.2,
    "tasa_no_aptos": 5.1,
    "promedio_edad": 42.3
  },
  "alertas": ["⚠️ Deterioro significativo de salud visual detectado"]
}
```

### `analytics_riesgos_emergentes`
Detecta y alerta sobre riesgos emergentes.

**Parámetros**:
- `meses_atras` (number, opcional, default: 6)

**Retorna**:
```json
{
  "total_alertas": 5,
  "alertas_criticas": 1,
  "alertas_altas": 2,
  "alertas": [
    {
      "id": "visual-1234567890",
      "tipo": "ALTO",
      "categoria": "VISUAL",
      "titulo": "Deterioro acelerado de salud visual detectado",
      "descripcion": "8 trabajador(es) muestran deterioro visual acelerado",
      "trabajadores_afectados": 8,
      "trabajadores": [...],
      "tendencia": "CRECIENTE",
      "recomendaciones": [...],
      "fecha_deteccion": "2025-12-28"
    }
  ]
}
```

### `analytics_recomendaciones_empresa`
Genera recomendaciones preventivas para una empresa.

**Parámetros**:
- `empresa` (string, requerido)
- `meses_atras` (number, opcional, default: 12)

**Retorna**:
```json
{
  "empresa": "...",
  "periodo_analisis": {...},
  "total_recomendaciones": 8,
  "recomendaciones_altas": 3,
  "recomendaciones": [
    {
      "categoria": "Salud Visual",
      "prioridad": "ALTA",
      "titulo": "Programa de prevención de deterioro visual",
      "descripcion": "...",
      "acciones": [
        "Implementar pausas activas visuales cada 2 horas",
        "Revisar iluminación en puestos de trabajo"
      ],
      "impacto_esperado": "Estabilización de indicadores visuales",
      "plazo_implementacion": "Corto plazo (1-3 meses)",
      "recursos_necesarios": ["Capacitación", "Evaluación de iluminación"]
    }
  ]
}
```

### `analytics_recomendaciones_trabajador`
Genera recomendaciones personalizadas para un trabajador.

**Parámetros**:
- `trabajador_id` (string, opcional)
- `dni` (string, opcional)

## 📈 Flujo de Análisis Completo

```
1. Análisis de Datos Históricos
   ├─ Obtener exámenes médicos
   ├─ Calcular tendencias
   └─ Identificar patrones

2. Predicción de Riesgos
   ├─ Análisis de salud visual
   ├─ Identificación de factores de riesgo
   └─ Cálculo de probabilidades

3. Detección de Alertas
   ├─ Riesgos emergentes
   ├─ Patrones anómalos
   └─ Tendencias preocupantes

4. Generación de Recomendaciones
   ├─ Análisis con Gemini AI
   ├─ Priorización automática
   └─ Acciones específicas
```

## 🚀 Uso

### Ejemplo: Predecir salud visual
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "analytics_predecir_salud_visual",
      "arguments": {
        "dni": "41503369"
      }
    }
  }'
```

### Ejemplo: Analizar tendencias de empresa
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "analytics_tendencias_empresa",
      "arguments": {
        "empresa": "JUVENTUD JUPROG SRL",
        "meses_atras": 12
      }
    }
  }'
```

### Ejemplo: Detectar riesgos emergentes
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "analytics_riesgos_emergentes",
      "arguments": {
        "meses_atras": 6
      }
    }
  }'
```

## 📝 Notas

- Las predicciones requieren al menos 2 exámenes históricos
- Las tendencias se calculan por trimestres
- Las alertas se priorizan automáticamente
- Las recomendaciones se generan con Gemini AI y pueden tardar 10-30 segundos

