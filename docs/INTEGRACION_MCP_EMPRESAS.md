# 🔗 Integración MCP con Sistema de Empresas

## ✅ Implementación Completada

### 1. Herramientas MCP para Empresas
Se han creado nuevas herramientas MCP en `mcp-server/src/tools/empresas.ts`:

- **`empresas_listar`** - Lista empresas del usuario
- **`empresas_obtener`** - Obtiene una empresa por ID
- **`empresas_buscar`** - Busca empresas por nombre o RUC
- **`empresas_crear`** - Crea una nueva empresa y la asocia al usuario

### 2. Multi-Tenancy en Herramientas Existentes
Todas las herramientas MCP existentes ahora soportan filtrado por empresa:

#### Casos
- `casos_listar` - Agregado parámetro `empresa_id` (opcional)
- Filtra casos por empresa cuando se proporciona `empresa_id`

#### Trabajadores
- `trabajadores_listar` - Agregado parámetro `empresa_id` (opcional)
- Filtra trabajadores por empresa cuando se proporciona `empresa_id`

#### Exámenes
- `examenes_listar` - Agregado parámetro `empresa_id` (opcional)
- Filtra exámenes por empresa cuando se proporciona `empresa_id`

### 3. Arquitectura

```
┌─────────────────────────────────────────┐
│         Frontend (Next.js)              │
│  ┌──────────────────────────────────┐  │
│  │  CompanyContext                   │  │
│  │  - empresaActiva                  │  │
│  │  - empresas                        │  │
│  └──────────────────────────────────┘  │
│              │                          │
│              ▼                          │
│  ┌──────────────────────────────────┐  │
│  │  Componentes UI                  │  │
│  │  - CompanySelector                │  │
│  │  - GestionEmpresas                │  │
│  │  - AnalizarEMOs                   │  │
│  │  - GlobalChat                     │  │
│  └──────────────────────────────────┘  │
└──────────────┬─────────────────────────┘
               │
               │ POST /api/mcp
               ▼
┌─────────────────────────────────────────┐
│      API Route (app/api/mcp/route.ts)   │
│  ┌──────────────────────────────────┐  │
│  │  handleRequest()                  │  │
│  │  - Recibe empresa_id en args      │  │
│  └──────────────────────────────────┘  │
└──────────────┬─────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      MCP Server (mcp-server/src)        │
│  ┌──────────────────────────────────┐  │
│  │  Tools                            │  │
│  │  - empresas_*                     │  │
│  │  - casos_* (con empresa_id)       │  │
│  │  - trabajadores_* (con empresa_id)│  │
│  │  - examenes_* (con empresa_id)    │  │
│  └──────────────────────────────────┘  │
└──────────────┬─────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Supabase                        │
│  ┌──────────────────────────────────┐  │
│  │  Tablas                           │  │
│  │  - empresas                       │  │
│  │  - user_empresas                  │  │
│  │  - casos (con empresa_id)         │  │
│  │  - registros_trabajadores         │  │
│  │  - examenes_medicos               │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 🔧 Uso desde Frontend

### Ejemplo: Listar casos de la empresa activa

```typescript
import { useCompany } from '../contexts/CompanyContext';

function MiComponente() {
  const { empresaActiva } = useCompany();
  
  const listarCasos = async () => {
    const response = await fetch('/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'casos_listar',
          arguments: {
            empresa_id: empresaActiva?.id, // Filtrar por empresa activa
            limit: 50
          }
        }
      })
    });
    
    const data = await response.json();
    // Procesar resultados
  };
}
```

### Ejemplo: Crear empresa desde MCP

```typescript
const crearEmpresa = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const response = await fetch('/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'empresas_crear',
        arguments: {
          nombre: 'Nueva Empresa S.A.',
          ruc: '20100070970',
          user_id: user?.id
        }
      }
    })
  });
};
```

## 📋 Checklist de Verificación

### ✅ Completado
- [x] Herramientas MCP para empresas creadas
- [x] Parámetro `empresa_id` agregado a herramientas existentes
- [x] Integración con CompanyContext
- [x] Documentación creada

### ⏳ Pendiente (Recomendado)
- [ ] Agregar campo `empresa_id` a tablas en Supabase:
  - `casos` → `empresa_id UUID REFERENCES empresas(id)`
  - `registros_trabajadores` → `empresa_id UUID REFERENCES empresas(id)`
  - `examenes_medicos` → `empresa_id UUID REFERENCES empresas(id)`
- [ ] Actualizar componentes UI para pasar `empresa_id` automáticamente
- [ ] Agregar validaciones RLS en Supabase para multi-tenancy
- [ ] Probar todas las herramientas MCP con multi-tenancy

## 🚀 Próximos Pasos

1. **Ejecutar migraciones SQL** para agregar `empresa_id` a tablas
2. **Actualizar componentes** para usar `empresaActiva?.id` automáticamente
3. **Probar integración** completa con datos reales
4. **Agregar RLS policies** en Supabase para seguridad

