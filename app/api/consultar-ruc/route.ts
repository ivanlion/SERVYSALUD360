'use server';

import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route para consultar RUC en SUNAT
 * 
 * Consulta la información de una empresa por su RUC
 * usando APIs públicas disponibles
 * 
 * @route POST /api/consultar-ruc
 */

interface SunatEmpresaData {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccion?: string;
  estado?: string;
  condicion?: string;
  telefono?: string;
  email?: string;
  actividadesEconomicas?: {
    principal?: string;
    secundarias?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const { ruc } = await request.json();

    if (!ruc || !ruc.trim()) {
      return NextResponse.json(
        { success: false, message: 'RUC es requerido' },
        { status: 400 }
      );
    }

    // Limpiar RUC (solo números)
    const rucLimpio = ruc.trim().replace(/\D/g, '');

    if (rucLimpio.length !== 11) {
      return NextResponse.json(
        { success: false, message: 'El RUC debe tener 11 dígitos' },
        { status: 400 }
      );
    }

    console.log('[consultar-ruc] Consultando RUC:', rucLimpio);

    // Opción 1: Intentar con apisperu.com (API oficial con token)
    const apisPeruToken = process.env.APIS_PERU_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6Imxpb25mb25zZWNhQGdtYWlsLmNvbSJ9.dNJEC1uVdJNkhO3pahIMpl9hzm56Ufrn_utFUHpAZl4';
    
    try {
      const apiUrl = `https://dniruc.apisperu.com/api/v1/ruc/${rucLimpio}?token=${apisPeruToken}`;
      
      console.log('[consultar-ruc] Intentando con apisperu.com...');
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        console.log('[consultar-ruc] Respuesta de apisperu.com:', JSON.stringify(data, null, 2));
        
        if (data && (data.razonSocial || data.razon_social || data.nombre || data.name)) {
          // Construir actividades económicas si están disponibles
          const actividades: { principal?: string; secundarias?: string[] } = {};
          
          if (data.actividadEconomica || data.actividad_economica || data.actividades) {
            const actividad = data.actividadEconomica || data.actividad_economica || data.actividades;
            if (typeof actividad === 'string') {
              actividades.principal = actividad;
            } else if (Array.isArray(actividad) && actividad.length > 0) {
              actividades.principal = actividad[0];
              if (actividad.length > 1) {
                actividades.secundarias = actividad.slice(1);
              }
            }
          }

          const empresaData: SunatEmpresaData = {
            ruc: rucLimpio,
            razonSocial: data.razonSocial || data.razon_social || data.nombre || data.name || '',
            nombreComercial: data.nombreComercial || data.nombre_comercial || data.tradeName || data.trade_name || '',
            direccion: data.direccion || data.direccionCompleta || data.direccion_completa || data.direccionFiscal || data.address || data.domicilioFiscal || '',
            estado: data.estado || data.state || '',
            condicion: data.condicion || data.condition || '',
            telefono: data.telefono || data.phone || '',
            email: data.email || '',
            actividadesEconomicas: Object.keys(actividades).length > 0 ? actividades : undefined,
          };

          console.log('[consultar-ruc] ✅ Datos obtenidos de apisperu.com:', empresaData);
          
          return NextResponse.json({
            success: true,
            data: empresaData,
          });
        }
      } else {
        console.warn('[consultar-ruc] apisperu.com respondió con status:', response.status);
      }
    } catch (apiError: any) {
      console.warn('[consultar-ruc] Error con apisperu.com:', apiError.message);
    }

    // Opción 2: Intentar con apis.net.pe como fallback
    try {
      const apiUrl2 = `https://api.apis.net.pe/v1/ruc?numero=${rucLimpio}`;
      
      const response = await fetch(apiUrl2, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data && (data.razonSocial || data.razon_social)) {
          const empresaData: SunatEmpresaData = {
            ruc: rucLimpio,
            razonSocial: data.razonSocial || data.razon_social || '',
            nombreComercial: data.nombreComercial || data.nombre_comercial || '',
            direccion: data.direccion || data.direccionCompleta || data.direccion_completa || data.direccionFiscal || '',
            estado: data.estado || '',
            condicion: data.condicion || '',
            telefono: data.telefono || '',
            email: data.email || '',
          };

          console.log('[consultar-ruc] ✅ Datos obtenidos de apis.net.pe (fallback):', empresaData);
          
          return NextResponse.json({
            success: true,
            data: empresaData,
          });
        }
      }
    } catch (apiError2: any) {
      console.warn('[consultar-ruc] Error con apis.net.pe:', apiError2.message);
    }

    // Si no se pudo obtener de ninguna fuente
    console.log('[consultar-ruc] ⚠️ No se pudo obtener datos para RUC:', rucLimpio);
    return NextResponse.json({
      success: false,
      message: `No se encontró información para el RUC ${rucLimpio}. Por favor, complete los datos manualmente.`,
      data: {
        ruc: rucLimpio,
        razonSocial: '',
        direccion: '',
      },
    });

  } catch (error: any) {
    console.error('[consultar-ruc] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Error al consultar RUC' 
      },
      { status: 500 }
    );
  }
}
