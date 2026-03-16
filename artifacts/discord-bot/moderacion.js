// ─── Utilidades de moderación ─────────────────────────────────────────────────

// Verifica si el bot puede moderar al miembro objetivo
// Devuelve { ok: true } o { ok: false, razon: string }
export function puedeModerar(botMember, objetivo) {
  if (!objetivo) return { ok: false, razon: 'No se encontró al miembro.' };
  if (objetivo.id === botMember.id) return { ok: false, razon: 'No puedo moderarme a mí mismo.' };
  if (objetivo.user?.bot) return { ok: false, razon: 'No puedo moderar a otros bots.' };

  const rolMaxBot = botMember.roles.highest;
  const rolMaxObjetivo = objetivo.roles.highest;

  if (rolMaxObjetivo.position >= rolMaxBot.position) {
    return {
      ok: false,
      razon: `El rol de ${objetivo} (${rolMaxObjetivo.name}) es igual o superior al mío. No puedo moderarlo.`,
    };
  }
  return { ok: true };
}

// Verifica si un miembro tiene el rol "Inmune"
export function esInmune(miembro) {
  return miembro.roles.cache.some((r) => r.name === 'Inmune');
}

// Busca o crea un rol por nombre en el servidor
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

// Busca o crea el canal #logs-tienda
export async function obtenerCanalLogs(guild) {
  let canal = guild.channels.cache.find(
    (c) => c.name === 'logs-tienda' && c.isTextBased(),
  );

  if (!canal) {
    try {
      canal = await guild.channels.create({
        name: 'logs-tienda',
        reason: 'Canal de registros de la tienda del servidor',
      });
    } catch {
      return null; // Sin permisos para crear canales
    }
  }
  return canal;
}

// Envía un log al canal #logs-tienda
export async function registrarCompra(guild, usuario, accion, coste) {
  const canal = await obtenerCanalLogs(guild);
  if (!canal) return;
  const ahora = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  await canal
    .send(`🧾 **${usuario.tag}** compró **${accion}** por **${coste} puntos** — ${ahora}`)
    .catch(() => {});
}
