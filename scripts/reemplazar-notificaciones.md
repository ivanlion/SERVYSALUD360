# Script para Reemplazar Notificaciones en AccessManagement.tsx

Debido al tamaño del archivo, estos son los patrones a reemplazar:

## Patrones a Reemplazar:

1. **setNotification con type: 'success'**:
```typescript
// ANTES:
setNotification({
  type: 'success',
  message: '...'
});
setTimeout(() => setNotification(null), 3000);

// DESPUÉS:
showSuccess('...');
```

2. **setNotification con type: 'error'**:
```typescript
// ANTES:
setNotification({
  type: 'error',
  message: '...'
});
setTimeout(() => setNotification(null), 3000);

// DESPUÉS:
showError('...');
```

3. **setNotification(null)** - Eliminar (ya no necesario con el nuevo sistema)

4. **console.error**:
```typescript
// ANTES:
console.error('mensaje', error);

// DESPUÉS:
logger.error(error instanceof Error ? error : new Error('mensaje'), { context: 'nombreFuncion' });
```

5. **console.log (debug)**:
```typescript
// ANTES:
console.log('mensaje', data);

// DESPUÉS:
logger.debug('mensaje', data);
```

6. **console.warn**:
```typescript
// ANTES:
console.warn('mensaje');

// DESPUÉS:
logger.warn('mensaje');
```


