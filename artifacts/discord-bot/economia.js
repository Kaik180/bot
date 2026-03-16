import { readFileSync, writeFileSync, existsSync } from 'fs';

const ARCHIVO = './puntos.json';

function cargarDatos() {
  if (!existsSync(ARCHIVO)) return {};
  try {
    return JSON.parse(readFileSync(ARCHIVO, 'utf-8'));
  } catch {
    return {};
  }
}

function guardarDatos(datos) {
  writeFileSync(ARCHIVO, JSON.stringify(datos, null, 2), 'utf-8');
}

export function obtenerPuntos(userId) {
  const datos = cargarDatos();
  return datos[userId] ?? 0;
}

export function darPuntos(userId, cantidad) {
  const datos = cargarDatos();
  datos[userId] = (datos[userId] ?? 0) + cantidad;
  guardarDatos(datos);
  return datos[userId];
}

// Quita puntos sin verificar saldo mínimo (para admins). Nunca baja de 0.
export function quitarPuntos(userId, cantidad) {
  const datos = cargarDatos();
  const actual = datos[userId] ?? 0;
  datos[userId] = Math.max(0, actual - cantidad);
  guardarDatos(datos);
  return datos[userId];
}

// Descuenta puntos solo si hay saldo suficiente.
// Devuelve { ok: true, saldo } o { ok: false, saldo }.
export function gastarPuntos(userId, coste) {
  const datos = cargarDatos();
  const actual = datos[userId] ?? 0;
  if (actual < coste) return { ok: false, saldo: actual };
  datos[userId] = actual - coste;
  guardarDatos(datos);
  return { ok: true, saldo: datos[userId] };
}
