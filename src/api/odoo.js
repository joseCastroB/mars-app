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

// 3. OBTENER LISTA DE EQUIPOS (Actualizado con tus campos)
export const fetchEquipos = async () => {
  return await callOdoo('maintenance.equipment', 'search_read', [[]], {
    // No traemos la imagen aquí para no hacer lenta la lista
    fields: ['name', 'serial_no', 'mars_marca', 'mars_capacidad', 'mars_ramales', 'mars_voltaje_fuerza', 'mars_tipo_alimentacion', 'mars_tipo_control'],
  });
};

// 4. CREAR EQUIPO
export const createEquipo = async (data) => {
  return await callOdoo('maintenance.equipment', 'create', [data]);
};

// 5. ACTUALIZAR EQUIPO
export const updateEquipo = async (id, data) => {
  return await callOdoo('maintenance.equipment', 'write', [[id], data]);
};

// 6. OBTENER IMAGEN DE UN EQUIPO (Para el modo edición)
export const fetchEquipoImagen = async (id) => {
  const result = await callOdoo('maintenance.equipment', 'search_read', [[['id', '=', id]]], {
    fields: ['mars_placa_imagen'],
  });
  return result.length > 0 ? result[0].mars_placa_imagen : null;
};