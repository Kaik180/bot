import { tieneEscudo } from './estado.js';

// ─── Comprobación unificada de protección ─────────────────────────────────────
// Cubre tanto el rol "Inmune" (comprar_inmunidad) como el escudo de disco (escudo_personal)
export function estaProtegido(miembro) {
  return (
    miembro.roles.cache.some((r) => r.name === 'Inmune') ||
    tieneEscudo(miembro.id)
  );
}

// Mantiene el nombre anterior como alias por compatibilidad
export const esInmune = estaProtegido;

// ─── Verificación de jerarquía de roles ──────────────────────────────────────

export function puedeModerar(botMember, objetivo) {
  if (!objetivo) return { ok: false, razon: 'No se encontró al miembro.' };
  if (objetivo.id === botMember.id) return { ok: false, razon: 'No puedo moderarme a mí mismo.' };
  if (objetivo.user?.bot) return { ok: false, razon: 'No puedo moderar a otros bots.' };

  const rolMaxBot = botMember.roles.highest;
  const rolMaxObjetivo = objetivo.roles.highest;

  if (rolMaxObjetivo.position >= rolMaxBot.position) {
    return {
      ok: false,
      razon: `El rol de ${objetivo} (${rolMaxObjetivo.name}) es igual o superior al mío.`,
    };
  }
  return { ok: true };
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function buscarOCrearRol(guild, nombre, opciones = {}) {
  let rol = guild.roles.cache.find((r) => r.name === nombre);
  if (!rol) {
    rol = await guild.roles.create({
      name: nombre,
      reason: `Rol '${nombre}' creado automáticamente por la tienda`,
      ...opciones,
    });
  }
  return rol;
}

// ─── Canal de logs ────────────────────────────────────────────────────────────

export async function obtenerCanalLogs(guild) {
  let canal = guild.channels.cache.find((c) => c.name === 'logs-tienda' && c.isTextBased());
  if (!canal) {
    try {
      canal = await guild.channels.create({
        name: 'logs-tienda',
        reason: 'Canal de registros de la tienda del servidor',
      });
    } catch {
      return null;
    }
  }
  return canal;
}

export async function registrarCompra(guild, usuario, accion, coste) {
  const canal = await obtenerCanalLogs(guild);
  if (!canal) return;
  const ahora = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  await canal
    .send(`🧾 **${usuario.tag}** compró **${accion}** por **${coste} puntos** — ${ahora}`)
    .catch(() => {});
}
