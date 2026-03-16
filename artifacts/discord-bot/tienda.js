import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';

// necesitaObjetivo: true  → el artículo se aplica a OTRO usuario (muestra UserSelectMenu)
// necesitaObjetivo: false → se aplica al propio comprador (ejecuta directo)
export const ARTICULOS = {
  comprar_muteo: {
    label: 'Muteo 5 min',
    emoji: '🔇',
    coste: 500,
    descripcion: 'Mutea en el chat y en el canal de voz a la víctima durante 5 minutos',
    style: ButtonStyle.Primary,
    necesitaObjetivo: true,
  },
  comprar_timeout10: {
    label: 'Muteo Chat 10 min',
    emoji: '⏱️',
    coste: 600,
    descripcion: 'Aplica un timeout de 10 min a la víctima que elijas',
    style: ButtonStyle.Primary,
    necesitaObjetivo: true,
  },
  comprar_voz: {
    label: 'Muteo de Voz',
    emoji: '🔕',
    coste: 500,
    descripcion: 'Ensordece en voz a la víctima que elijas',
    style: ButtonStyle.Secondary,
    necesitaObjetivo: true,
  },
  comprar_unwarn: {
    label: 'Quitar Aviso',
    emoji: '🧹',
    coste: 800,
    descripcion: 'Resta un aviso a otro usuario de la base de datos',
    style: ButtonStyle.Secondary,
    necesitaObjetivo: true,
  },
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
    descripcion: 'Nadie podrá mutearte con el bot durante 24 horas',
    style: ButtonStyle.Danger,
    necesitaObjetivo: false,
  },
};

// Devuelve el embed de la tienda
export function buildEmbedTienda() {
  const campos = Object.entries(ARTICULOS).map(([, art]) => ({
    name: `${art.emoji} ${art.label}`,
    value: `${art.descripcion}\nCoste: **${art.coste} puntos**`,
    inline: true,
  }));

  return new EmbedBuilder()
    .setTitle('🛒 Tienda del Servidor')
    .setDescription('Usa tus **Puntos del Servidor** para desbloquear acciones exclusivas.')
    .setColor(0x5865f2)
    .addFields(campos)
    .setFooter({ text: 'Usa /puntos para ver tu saldo • /dar-puntos para recibir puntos (admin)' });
}

// Devuelve las filas de botones de la tienda
export function buildBotonesTienda() {
  const fila1 = new ActionRowBuilder().addComponents(
    btn('comprar_muteo'),
    btn('comprar_timeout10'),
    btn('comprar_voz'),
    btn('comprar_unwarn'),
  );
  const fila2 = new ActionRowBuilder().addComponents(
    btn('comprar_vip'),
    btn('comprar_inmunidad'),
  );
  return [fila1, fila2];
}

// Devuelve el UserSelectMenu para elegir víctima
// customId: "victima:{accion}:{compradorId}"
export function buildSelectorVictima(accion, compradorId) {
  const art = ARTICULOS[accion];
  const selectMenu = new UserSelectMenuBuilder()
    .setCustomId(`victima:${accion}:${compradorId}`)
    .setPlaceholder('Selecciona a tu víctima...')
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
    .setLabel(`${art.label} (${art.coste} pts)`)
    .setEmoji(art.emoji)
    .setStyle(art.style);
}
