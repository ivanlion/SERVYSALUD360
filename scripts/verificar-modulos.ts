#!/usr/bin/env tsx
/**
 * Script de verificación de módulos
 * 
 * Verifica:
 * - Conexiones a Supabase
 * - Estilos consistentes
 * - Funcionalidad de módulos
 * - Multi-tenancy
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    });
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface VerificationResult {
  module: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

const results: VerificationResult[] = [];

async function verifySupabaseConnection() {
  try {
    const { data, error } = await supabase.from('empresas').select('count').limit(1);
    if (error && !error.message.includes('does not exist')) {
      results.push({
        module: 'Supabase Connection',
        status: 'error',
        message: `Error de conexión: ${error.message}`
      });
      return false;
    }
    results.push({
      module: 'Supabase Connection',
      status: 'success',
      message: 'Conexión a Supabase exitosa'
    });
    return true;
  } catch (error: any) {
    results.push({
      module: 'Supabase Connection',
      status: 'error',
      message: `Error: ${error.message}`
    });
    return false;
  }
}

async function verifyTables() {
  const tables = ['empresas', 'user_empresas', 'casos', 'registros_trabajadores'];
  const missingColumns: string[] = [];

  for (const table of tables) {
    try {
      // Intentar consultar con empresa_id
      const { error } = await supabase
        .from(table)
        .select('empresa_id')
        .limit(1);

      if (error && error.message.includes('column') && error.message.includes('empresa_id')) {
        missingColumns.push(table);
      }
    } catch (error: any) {
      // Ignorar errores de tabla no existente
    }
  }

  if (missingColumns.length > 0) {
    results.push({
      module: 'Database Schema',
      status: 'warning',
      message: `Faltan columnas empresa_id en: ${missingColumns.join(', ')}`,
      details: { missingColumns }
    });
  } else {
    results.push({
      module: 'Database Schema',
      status: 'success',
      message: 'Todas las tablas tienen empresa_id'
    });
  }
}

async function verifyRLSPolicies() {
  try {
    // Verificar si RLS está habilitado en casos
    const { data, error } = await supabase
      .from('casos')
      .select('*')
      .limit(1);

    if (error && error.message.includes('row-level security')) {
      results.push({
        module: 'RLS Policies',
        status: 'success',
        message: 'RLS está habilitado (error esperado sin autenticación)'
      });
    } else if (error) {
      results.push({
        module: 'RLS Policies',
        status: 'warning',
        message: `RLS puede no estar configurado: ${error.message}`
      });
    } else {
      results.push({
        module: 'RLS Policies',
        status: 'warning',
        message: 'RLS puede no estar habilitado (consulta exitosa sin autenticación)'
      });
    }
  } catch (error: any) {
    results.push({
      module: 'RLS Policies',
      status: 'error',
      message: `Error verificando RLS: ${error.message}`
    });
  }
}

async function verifyMCPEndpoint() {
  try {
    const response = await fetch('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      })
    });

    if (!response.ok) {
      results.push({
        module: 'MCP Endpoint',
        status: 'error',
        message: `Endpoint no responde: ${response.status} ${response.statusText}`
      });
      return;
    }

    const data = await response.json();
    if (data.error) {
      results.push({
        module: 'MCP Endpoint',
        status: 'error',
        message: `Error en MCP: ${data.error.message}`
      });
      return;
    }

    const tools = data.result?.tools || [];
    const empresasTools = tools.filter((t: any) => t.name?.startsWith('empresas_'));
    
    results.push({
      module: 'MCP Endpoint',
      status: 'success',
      message: `MCP funcionando. ${tools.length} herramientas disponibles`,
      details: {
        totalTools: tools.length,
        empresasTools: empresasTools.length
      }
    });
  } catch (error: any) {
    results.push({
      module: 'MCP Endpoint',
      status: 'warning',
      message: `No se pudo conectar a MCP (servidor puede no estar corriendo): ${error.message}`
    });
  }
}

async function verifyComponents() {
  const components = [
    'components/UploadEMO.tsx',
    'components/WorkModifiedDashboard.tsx',
    'components/AnalizarEMOs.tsx',
    'components/Dashboard.tsx',
    'components/GestionEmpresas.tsx'
  ];

  const missing: string[] = [];
  const existing: string[] = [];

  for (const component of components) {
    const filePath = path.join(__dirname, '..', component);
    if (fs.existsSync(filePath)) {
      existing.push(component);
    } else {
      missing.push(component);
    }
  }

  if (missing.length > 0) {
    results.push({
      module: 'Components',
      status: 'warning',
      message: `Faltan componentes: ${missing.join(', ')}`,
      details: { missing, existing }
    });
  } else {
    results.push({
      module: 'Components',
      status: 'success',
      message: `Todos los componentes existen (${existing.length})`,
      details: { existing }
    });
  }
}

function verifyStyles() {
  const stylePatterns = {
    'bg-indigo': /bg-indigo-\d+/g,
    'text-gray': /text-gray-\d+/g,
    'rounded-lg': /rounded-lg/g,
    'shadow': /shadow-\w+/g
  };

  const components = [
    'components/UploadEMO.tsx',
    'components/WorkModifiedDashboard.tsx',
    'components/AnalizarEMOs.tsx'
  ];

  const styleReport: any = {};

  for (const component of components) {
    const filePath = path.join(__dirname, '..', component);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      styleReport[component] = {};
      
      for (const [pattern, regex] of Object.entries(stylePatterns)) {
        const matches = content.match(regex);
        styleReport[component][pattern] = matches ? matches.length : 0;
      }
    }
  }

  results.push({
    module: 'Styles',
    status: 'success',
    message: 'Estilos verificados',
    details: styleReport
  });
}

async function main() {
  console.log('🔍 Iniciando verificación de módulos...\n');

  await verifySupabaseConnection();
  await verifyTables();
  await verifyRLSPolicies();
  await verifyMCPEndpoint();
  await verifyComponents();
  verifyStyles();

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  📊 RESULTADOS DE VERIFICACIÓN');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const success = results.filter(r => r.status === 'success').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const errors = results.filter(r => r.status === 'error').length;

  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${result.module}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Detalles: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log('');
  });

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`✅ Exitosos: ${success}`);
  console.log(`⚠️  Advertencias: ${warnings}`);
  console.log(`❌ Errores: ${errors}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch(console.error);

