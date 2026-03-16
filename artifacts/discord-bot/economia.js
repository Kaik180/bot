import { readFileSync, writeFileSync, existsSync } from 'fs';

const ARCHIVO_PUNTOS  = './puntos.json';
const ARCHIVO_AVISOS  = './avisos.json';

// ─── Helpers de persistencia ──────────────────────────────────────────────────

function cargar(archivo) {
  if (!existsSync(archivo)) return {};
  try { return JSON.parse(readFileSync(archivo, 'utf-8')); } catch { return {}; }
}

function guardar(archivo, datos) {
  writeFileSync(archivo, JSON.stringify(datos, null, 2), 'utf-8');
}

// ─── Puntos ───────────────────────────────────────────────────────────────────

export function obtenerPuntos(userId) {
  return cargar(ARCHIVO_PUNTOS)[userId] ?? 0;
}

export function darPuntos(userId, cantidad) {
  const datos = cargar(ARCHIVO_PUNTOS);
  datos[userId] = (datos[userId] ?? 0) + cantidad;
  guardar(ARCHIVO_PUNTOS, datos);
  return datos[userId];
}

export function quitarPuntos(userId, cantidad) {
  const datos = cargar(ARCHIVO_PUNTOS);
  datos[userId] = Math.max(0, (datos[userId] ?? 0) - cantidad);
  guardar(ARCHIVO_PUNTOS, datos);
  return datos[userId];
}

// Descuenta solo si hay saldo suficiente. Devuelve { ok, saldo }.
export function gastarPuntos(userId, coste) {
  const datos = cargar(ARCHIVO_PUNTOS);
  const actual = datos[userId] ?? 0;
  if (actual < coste) return { ok: false, saldo: actual };
  datos[userId] = actual - coste;
  guardar(ARCHIVO_PUNTOS, datos);
  return { ok: true, saldo: datos[userId] };
}

// Devuelve true si el usuario tiene al menos `coste` puntos (sin descontar).
export function tienePuntos(userId, coste) {
  return (cargar(ARCHIVO_PUNTOS)[userId] ?? 0) >= coste;
}

// ─── Avisos (warns) ───────────────────────────────────────────────────────────

export function obtenerAvisos(userId) {
  return cargar(ARCHIVO_AVISOS)[userId] ?? 0;
}

export function darAviso(userId) {
  const datos = cargar(ARCHIVO_AVISOS);
  datos[userId] = (datos[userId] ?? 0) + 1;
  guardar(ARCHIVO_AVISOS, datos);
  return datos[userId];
}

// Resta 1 aviso (mínimo 0). Devuelve el nuevo total.
export function quitarAviso(userId) {
  const datos = cargar(ARCHIVO_AVISOS);
  const actual = datos[userId] ?? 0;
  datos[userId] = Math.max(0, actual - 1);
  guardar(ARCHIVO_AVISOS, datos);
  return datos[userId];
}
