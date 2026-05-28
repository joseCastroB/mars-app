// Reemplaza con la IP de tu VPS o tu dominio
const ODOO_URL = 'https://mars.tic-odoo.com'; 
const ODOO_DB = 'mars';

let sessionId = null;

// 1. FUNCIÓN DE LOGIN
export const loginOdoo = async (username, password) => {
  const url = `${ODOO_URL}/web/session/authenticate`;
  const body = {
    jsonrpc: '2.0',
    method: 'call',
    params: {
      db: ODOO_DB,
      login: username,
      password: password,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // ¡NUEVO!: Capturamos el session_id oculto en las cabeceras (Cookies)
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const match = setCookie.match(/session_id=([^;]+)/);
      if (match) {
        sessionId = match[1]; // Guardamos el token real extraído
      }
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.data.message || 'Error en la autenticación');
    }

    if (data.result && data.result.uid) {
      // Por si alguna versión modificada de Odoo sí lo envía en el body
      if (data.result.session_id) {
        sessionId = data.result.session_id; 
      }

      // Validación final: Si no pudimos capturar el token de ningún lado, avisamos
      if (!sessionId) {
        throw new Error('Login exitoso, pero el servidor no devolvió el token de sesión en las cookies.');
      }

      return data.result;
    } else {
      throw new Error('Credenciales inválidas');
    }
  } catch (error) {
    console.error('Odoo Login Error:', error);
    throw error;
  }
};

// 2. FUNCIÓN GENÉRICA PARA LLAMADAS AL ORM (call_kw)
const callOdoo = async (model, method, args = [], kwargs = {}) => {
  if (!sessionId) {
    throw new Error('No hay sesión activa. Por favor, inicia sesión primero.');
  }

  const url = `${ODOO_URL}/web/dataset/call_kw/${model}/${method}`;
  const body = {
    jsonrpc: '2.0',
    method: 'call',
    params: { model, method, args, kwargs },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `session_id=${sessionId}`, 
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.data.message || 'Error en la petición a Odoo');
    }
    
    return data.result;
  } catch (error) {
    console.error(`Odoo API Error en ${model}/${method}:`, error);
    throw error;
  }
};

// ==========================================
// MÓDULO: EQUIPOS
// ==========================================

export const fetchEquipos = async () => {
  return await callOdoo('maintenance.equipment', 'search_read', [[]], {
    fields: ['name', 'serial_no', 'mars_marca', 'mars_capacidad', 'mars_ramales', 'mars_voltaje_fuerza', 'mars_tipo_alimentacion', 'mars_tipo_control'],
  });
};

export const createEquipo = async (data) => {
  return await callOdoo('maintenance.equipment', 'create', [data]);
};

export const updateEquipo = async (id, data) => {
  return await callOdoo('maintenance.equipment', 'write', [[id], data]);
};

export const fetchEquipoImagen = async (id) => {
  const result = await callOdoo('maintenance.equipment', 'search_read', [[['id', '=', id]]], {
    fields: ['mars_placa_imagen'],
  });
  return result.length > 0 ? result[0].mars_placa_imagen : null;
};

// ==========================================
// MÓDULO: SOLICITUDES DE MANTENIMIENTO
// ==========================================

// ¡AQUÍ ESTÁ LA FUNCIÓN QUE FALTABA!
export const fetchSolicitudes = async () => {
  return await callOdoo('maintenance.request', 'search_read', [[]], {
    fields: [
      'name', 
      'request_date', 
      'priority', 
      'stage_id',
      // --- TUS NUEVOS CAMPOS ---
      'mars_title', 
      'maintenance_type', 
      'mars_client_id',
      'mars_oc', 
      'mars_item', 
      'mars_emission_date', 
      'mars_inspector',
      'mars_applicable_norm', 
      'mars_diagnosis', 
      'mars_conclusions',
      'mars_equipment_ids',
      // ¡NUEVO! Le pedimos los arrays con los IDs de las fotos
      'mars_photo_ids', 'mars_acta_ids', 'mars_gancho_ids'
    ],
  });
};

export const createSolicitud = async (data) => {
  return await callOdoo('maintenance.request', 'create', [data]);
};

export const updateSolicitud = async (id, data) => {
  return await callOdoo('maintenance.request', 'write', [[id], data]);
};

// OBTENER CLIENTES
export const fetchClientes = async () => {
  return await callOdoo('res.partner', 'search_read', [[['is_company', '=', true]]], {
    fields: ['name', 'id'],
  });
};

// OBTENER EMPLEADOS
export const fetchEmpleados = async () => {
  return await callOdoo('hr.employee', 'search_read', [[]], {
    fields: ['name', 'job_title', 'id'],
  });
};

// NUEVA FUNCIÓN: Descarga las fotos en Base64 a partir de sus IDs
export const fetchFotos = async (photoIds) => {
  if (!photoIds || photoIds.length === 0) return [];
  return await callOdoo('maintenance.request.photo', 'search_read', [[['id', 'in', photoIds]]], {
    fields: ['image', 'photo_type', 'equipment_id', 'subtitle'],
  });
};

// NUEVA FUNCIÓN: Trae todos los detalles de una sola solicitud
export const fetchSolicitudDetalle = async (id) => {
  return await callOdoo('maintenance.request', 'search_read', [[['id', '=', id]]], {
    fields: [
      'name', 'mars_title', 'maintenance_type', 'mars_client_id',
      'mars_oc', 'mars_item', 'mars_emission_date', 'mars_inspector',
      'mars_applicable_norm', 'mars_diagnosis', 'mars_conclusions',
      'mars_equipment_ids', 'mars_worker_ids', 'mars_electrical_ids',
      'mars_photo_ids', 'mars_acta_ids', 'mars_gancho_ids'
    ],
  });
};