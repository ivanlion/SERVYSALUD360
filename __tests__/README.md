# Testing en SERVYSALUD360

Este documento describe la configuración y uso del sistema de testing automatizado con Jest y React Testing Library.

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Dependencias instaladas: `npm install`

## 🚀 Ejecutar Tests

### Comandos Disponibles

```bash
# Ejecutar todos los tests una vez
npm test

# Ejecutar tests en modo watch (recomendado durante desarrollo)
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage

# Tests para CI/CD (con límites de workers)
npm run test:ci
```

### Modo Watch

El modo watch es ideal durante el desarrollo. Ejecuta los tests automáticamente cuando detecta cambios:

```bash
npm run test:watch
```

### Cobertura de Código

Para ver el reporte de cobertura completo:

```bash
npm run test:coverage
```

Esto generará un reporte HTML en `coverage/lcov-report/index.html` que puedes abrir en tu navegador.

## 📁 Estructura de Tests

Los tests están organizados siguiendo la estructura del proyecto:

```
servysalud-pro/
├── components/
│   └── __tests__/
│       ├── UploadEMO.test.tsx      # Tests de validación de archivos
│       └── CaseForm.test.tsx      # Tests de formularios
├── hooks/
│   └── __tests__/
│       └── useLocalStorage.test.ts # Tests de hooks personalizados
├── lib/
│   └── __tests__/                 # Tests de utilidades (futuro)
├── contexts/
│   └── __tests__/                 # Tests de contextos (futuro)
└── utils/
    └── __tests__/                 # Tests de utilidades (futuro)
```

## 🎯 Cobertura Objetivo

El proyecto tiene umbrales mínimos de cobertura configurados:

- **Líneas**: 50%+
- **Funciones**: 50%+
- **Branches**: 50%+
- **Statements**: 50%+

Estos umbrales se pueden ajustar en `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
}
```

## 📝 Escribir Tests

### Estructura de un Test

```typescript
import { render, screen } from '@testing-library/react';
import Component from '../Component';

describe('Component', () => {
  test('debería renderizar correctamente', () => {
    render(<Component />);
    expect(screen.getByText('Texto esperado')).toBeInTheDocument();
  });
});
```

### Mejores Prácticas

1. **Nombres descriptivos**: Usa nombres que describan claramente qué está probando el test
2. **Un test, una cosa**: Cada test debe verificar una funcionalidad específica
3. **Arrange-Act-Assert**: Organiza tus tests en estas tres secciones
4. **Mocking**: Usa mocks para dependencias externas (Supabase, APIs, etc.)
5. **Cleanup**: Limpia el estado entre tests usando `beforeEach` y `afterEach`

### Ejemplo Completo

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup antes de cada test
    jest.clearAllMocks();
  });

  test('muestra el mensaje correcto', () => {
    render(<MyComponent message="Hola" />);
    expect(screen.getByText('Hola')).toBeInTheDocument();
  });

  test('maneja el clic del botón', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    
    render(<MyComponent onClick={handleClick} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## 🔧 Configuración

### jest.config.js

La configuración de Jest está en `jest.config.js` y usa `next/jest` para integración con Next.js 15.

### jest.setup.js

El archivo `jest.setup.js` contiene:
- Configuración de `@testing-library/jest-dom`
- Mocks de Next.js (router, Image, etc.)
- Mocks de Supabase
- Mocks de Google Generative AI
- Mocks de TanStack Query

## 🧪 Tests Existentes

### UploadEMO.test.tsx

Tests para validación de archivos:
- Rechazo de archivos mayores a 10MB
- Rechazo de tipos no permitidos
- Aceptación de archivos válidos (PDF, PNG, JPEG)
- Validación de nombres de archivo

### CaseForm.test.tsx

Tests básicos para el formulario:
- Renderizado correcto
- Navegación entre pasos
- Manejo de props (initialData, onSave, onCancel)

### useLocalStorage.test.ts

Tests para el hook personalizado:
- Valor inicial
- Guardado y lectura
- Sincronización entre pestañas
- Manejo de errores

## 🐛 Troubleshooting

### Error: "Cannot find module"

Asegúrate de que todas las dependencias estén instaladas:

```bash
npm install
```

### Error: "localStorage is not defined"

El entorno de testing (`jest-environment-jsdom`) ya está configurado. Si persiste, verifica `jest.config.js`.

### Tests lentos

- Usa `test.only()` o `describe.only()` para ejecutar solo tests específicos durante desarrollo
- Revisa que los mocks estén configurados correctamente
- Evita operaciones asíncronas innecesarias

### Cobertura baja

1. Identifica qué archivos tienen baja cobertura: `npm run test:coverage`
2. Revisa el reporte HTML para ver líneas no cubiertas
3. Agrega tests para las funcionalidades críticas primero

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)

## ✅ Checklist para Nuevos Tests

- [ ] Test cubre el caso de uso principal
- [ ] Test cubre casos de error
- [ ] Test usa mocks apropiados
- [ ] Test es independiente (no depende de otros tests)
- [ ] Test tiene nombre descriptivo
- [ ] Test pasa en CI/CD

## 🎓 Próximos Pasos

1. Agregar tests para más componentes críticos
2. Aumentar cobertura gradualmente
3. Configurar tests E2E con Playwright o Cypress (opcional)
4. Integrar tests en CI/CD pipeline

---

**Nota**: Los tests son una herramienta de desarrollo. Escribe tests que te den confianza para refactorizar y agregar nuevas funcionalidades.

