import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';

// necesitaObjetivo: true  → muestra UserSelectMenu para elegir víctima
// necesitaObjetivo: false → se aplica al propio comprador
export const ARTICULOS = {
  // ── Fila 1: acciones ofensivas ──────────────────────────────────────────────
  comprar_muteo: {
    label: 'Muteo 5 min',
    emoji: '🔇',
    coste: 500,
    descripcion: 'Mutea chat y voz a la víctima durante 5 minutos',
    style: ButtonStyle.Danger,
    necesitaObjetivo: true,
  },
  comprar_timeout10: {
    label: 'Muteo Chat 10 min',
    emoji: '⏱️',
    coste: 600,
    descripcion: 'Timeout de 10 minutos en el chat a la víctima',
    style: ButtonStyle.Danger,
    necesitaObjetivo: true,
  },
  comprar_voz: {
    label: 'Muteo de Voz',
    emoji: '🔕',
    coste: 500,
    descripcion: 'Ensordece en voz a la víctima durante 5 minutos',
    style: ButtonStyle.Danger,
    necesitaObjetivo: true,
  },
  comprar_unwarn: {
    label: 'Quitar Aviso',
    emoji: '🧹',
    coste: 800,
    descripcion: 'Resta 1 aviso registrado a otro usuario',
    style: ButtonStyle.Secondary,
    necesitaObjetivo: true,
  },
  cambio_nick: {
    label: 'Cambio de Nickname',
    emoji: '✏️',
    coste: 700,
    descripcion: 'Cambia el apodo de la víctima a algo gracioso por 1 hora',
    style: ButtonStyle.Primary,
    necesitaObjetivo: true,
  },
  // ── Fila 2: defensas y utilidades ───────────────────────────────────────────
  comprar_vip: {
    label: 'Rol VIP 1h',
    emoji: '👑',
    coste: 1000,
    descripcion: 'Obtén el rol VIP durante 1 hora',
    style: ButtonStyle.Success,
    necesitaObjetivo: false,
  },
  comprar_inmunidad: {
    label: 'Inmunidad 24h',
    emoji: '🛡️',
    coste: 2000,
    descripcion: 'Rol Inmune que bloquea ataques del bot durante 24 horas',
    style: ButtonStyle.Success,
    necesitaObjetivo: false,
  },
  escudo_personal: {
    label: 'El Escudo 2h',
    emoji: '🔰',
    coste: 1500,
    descripcion: 'Escudo persistente: bloquea ataques de la tienda durante 2 horas',
    style: ButtonStyle.Success,
    necesitaObjetivo: false,
  },
  seguro_desempleo: {
    label: 'Seguro de Desempleo',
    emoji: '🪂',
    coste: 400,
    descripcion: 'Si te atacan, recibes de vuelta el 50% del coste del ataque',
    style: ButtonStyle.Secondary,
    necesitaObjetivo: false,
  },
  espionaje: {
    label: 'Espionaje',
    emoji: '🕵️',
    coste: 1000,
    descripcion: 'Recibe por DM los últimos 3 usuarios que te atacaron',
    style: ButtonStyle.Secondary,
    necesitaObjetivo: false,
  },
};

export function buildEmbedTienda() {
  const campos = Object.entries(ARTICULOS).map(([, art]) => ({
    name: `${art.emoji} ${art.label}`,
    value: `${art.descripcion}\nCoste: **${art.coste} pts**`,
    inline: true,
  }));

  return new EmbedBuilder()
    .setTitle('🛒 Tienda del Servidor')
    .setDescription('Usa tus **Puntos del Servidor** para desbloquear acciones exclusivas.')
    .setColor(0x5865f2)
    .addFields(campos)
    .setFooter({ text: '/puntos • /duelo • /loteria-comprar • /loteria-pozo' });
}

export function buildBotonesTienda() {
  const fila1 = new ActionRowBuilder().addComponents(
    btn('comprar_muteo'),
    btn('comprar_timeout10'),
    btn('comprar_voz'),
    btn('comprar_unwarn'),
    btn('cambio_nick'),
  );
  const fila2 = new ActionRowBuilder().addComponents(
    btn('comprar_vip'),
    btn('comprar_inmunidad'),
    btn('escudo_personal'),
    btn('seguro_desempleo'),
    btn('espionaje'),
  );
  return [fila1, fila2];
}

export function buildSelectorVictima(accion, compradorId) {
  const art = ARTICULOS[accion];
  const selectMenu = new UserSelectMenuBuilder()
    .setCustomId(`victima:${accion}:${compradorId}`)
    .setPlaceholder('Selecciona a la víctima de tu compra...')
    .setMinValues(1)
    .setMaxValues(1);

  return {
    content: `${art.emoji} **${art.label}** — Selecciona a la víctima de tu compra:`,
    components: [new ActionRowBuilder().addComponents(selectMenu)],
    ephemeral: true,
  };
}

function btn(id) {
  const art = ARTICULOS[id];
  return new ButtonBuilder()
    .setCustomId(id)
    .setLabel(`${art.label} (${art.coste})`)
    .setEmoji(art.emoji)
    .setStyle(art.style);
}

// Nicknames graciosos para cambio_nick
export const NICKNAMES_GRACIOSOS = [
  'Patata Viviente', 'El Elegido', 'Señor Queso', 'Cactus Parlante',
  'Helado de Ajo', 'Lord Salchicha', 'Maestro del Caos', 'Panadero Espacial',
  'Turista del Más Allá', 'El Gran Fracasado', 'Dragón de Cartón',
  'Ninja del Supermercado', 'Guardián del Frigorífico', 'El Inmortal Invisible',
  'Profesional del Desastre', 'CEO de las Patatas', 'Leyenda Viviente del Sofá',
];

export function nicknameAleatorio() {
  return NICKNAMES_GRACIOSOS[Math.floor(Math.random() * NICKNAMES_GRACIOSOS.length)];
}
