import { readFileSync, writeFileSync, existsSync } from 'fs';

// ─── Helper genérico de persistencia ─────────────────────────────────────────

function cargar(archivo, defecto = {}) {
  if (!existsSync(archivo)) return defecto;
  try { return JSON.parse(readFileSync(archivo, 'utf-8')); } catch { return defecto; }
}

function guardar(archivo, datos) {
  writeFileSync(archivo, JSON.stringify(datos, null, 2), 'utf-8');
}

// ─── Escudo (inmunidad temporal, persiste en disco) ───────────────────────────

const F_ESCUDOS = './escudos.json';

export function activarEscudo(userId, duracionMs) {
  const datos = cargar(F_ESCUDOS);
  datos[userId] = Date.now() + duracionMs;
  guardar(F_ESCUDOS, datos);
}

export function tieneEscudo(userId) {
  const datos = cargar(F_ESCUDOS);
  const exp = datos[userId];
  if (!exp) return false;
  if (Date.now() > exp) {
    delete datos[userId];
    guardar(F_ESCUDOS, datos);
    return false;
  }
  return true;
}

export function msEscudoRestante(userId) {
  const datos = cargar(F_ESCUDOS);
  const exp = datos[userId];
  if (!exp || Date.now() > exp) return 0;
  return exp - Date.now();
}

// ─── Seguro de Desempleo (pasivo permanente) ──────────────────────────────────

const F_SEGUROS = './seguros.json';

export function activarSeguro(userId) {
  const datos = cargar(F_SEGUROS);
  datos[userId] = true;
  guardar(F_SEGUROS, datos);
}

export function tieneSeguro(userId) {
  return !!(cargar(F_SEGUROS)[userId]);
}

export function cancelarSeguro(userId) {
  const datos = cargar(F_SEGUROS);
  delete datos[userId];
  guardar(F_SEGUROS, datos);
}

// ─── Historial de ataques recibidos (para espionaje) ─────────────────────────

const F_HISTORIAL = './historial_ataques.json';

export function registrarAtaque(victimId, atacanteTag, accion) {
  const datos = cargar(F_HISTORIAL);
  if (!datos[victimId]) datos[victimId] = [];
  datos[victimId].unshift({
    atacanteTag,
    accion,
    fecha: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }),
  });
  datos[victimId] = datos[victimId].slice(0, 3); // guardar solo los 3 últimos
  guardar(F_HISTORIAL, datos);
}

export function obtenerHistorialAtaques(victimId) {
  return cargar(F_HISTORIAL)[victimId] ?? [];
}

// ─── Lotería progresiva ───────────────────────────────────────────────────────

const F_LOTERIA = './loteria.json';

function cargarLoteria() {
  return cargar(F_LOTERIA, { pozo: 0, tickets: [], proximoSorteo: null });
}

function guardarLoteria(datos) {
  guardar(F_LOTERIA, datos);
}

export function comprarTicket(userId) {
  const datos = cargarLoteria();
  datos.tickets.push(userId);
  datos.pozo += 100;
  guardarLoteria(datos);
  return {
    pozo: datos.pozo,
    misTickets: datos.tickets.filter((id) => id === userId).length,
  };
}

export function obtenerPozo() {
  return cargarLoteria().pozo;
}

export function obtenerTicketsUsuario(userId) {
  return cargarLoteria().tickets.filter((id) => id === userId).length;
}

// Realiza el sorteo. Devuelve { ganadorId, pozo } o null si no hay tickets.
export function realizarSorteo() {
  const datos = cargarLoteria();
  if (datos.tickets.length === 0) return null;

  const ganadorId = datos.tickets[Math.floor(Math.random() * datos.tickets.length)];
  const pozo = datos.pozo;

  guardarLoteria({ pozo: 0, tickets: [], proximoSorteo: null });
  return { ganadorId, pozo };
}
