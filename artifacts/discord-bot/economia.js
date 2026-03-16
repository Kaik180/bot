import { readFileSync, writeFileSync, existsSync } from 'fs';

const ARCHIVO = './puntos.json';

// Carga los datos desde el archivo o inicia vacío
function cargarDatos() {
  if (!existsSync(ARCHIVO)) return {};
  try {
    return JSON.parse(readFileSync(ARCHIVO, 'utf-8'));
  } catch {
    return {};
  }
}

// Persiste los datos en disco
function guardarDatos(datos) {
  writeFileSync(ARCHIVO, JSON.stringify(datos, null, 2), 'utf-8');
}

// Devuelve los puntos actuales de un usuario (0 si no existe)
export function obtenerPuntos(userId) {
  const datos = cargarDatos();
  return datos[userId] ?? 0;
}

// Suma puntos a un usuario y devuelve el nuevo total
export function darPuntos(userId, cantidad) {
  const datos = cargarDatos();
  datos[userId] = (datos[userId] ?? 0) + cantidad;
  guardarDatos(datos);
  return datos[userId];
}

// Descuenta puntos si hay saldo suficiente.
// Devuelve { ok: true, saldo } si tuvo éxito, o { ok: false, saldo } si no alcanza.
export function gastarPuntos(userId, coste) {
  const datos = cargarDatos();
  const actual = datos[userId] ?? 0;
  if (actual < coste) return { ok: false, saldo: actual };
  datos[userId] = actual - coste;
  guardarDatos(datos);
  return { ok: true, saldo: datos[userId] };
}
