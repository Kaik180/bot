import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

export const ARTICULOS = {
  comprar_muteo: {
    label: 'Auto-muteo 5 min',
    emoji: '🔇',
    coste: 500,
    descripcion: 'Te muteas a ti mismo durante 5 minutos',
    style: ButtonStyle.Primary,
  },
  comprar_timeout10: {
    label: 'Muteo Chat 10 min',
    emoji: '⏱️',
    coste: 600,
    descripcion: 'Te aplicas un timeout de 10 minutos en el chat',
    style: ButtonStyle.Primary,
  },
  comprar_voz: {
    label: 'Muteo de Voz',
    emoji: '🔕',
    coste: 500,
    descripcion: 'Te ensordece en el canal de voz si estás conectado',
    style: ButtonStyle.Secondary,
  },
  comprar_unwarn: {
    label: 'Quitar Aviso',
    emoji: '🧹',
    coste: 800,
    descripcion: 'Notifica al staff para revisar una advertencia tuya',
    style: ButtonStyle.Secondary,
  },
  comprar_vip: {
    label: 'Rol VIP 1h',
    emoji: '👑',
    coste: 1000,
    descripcion: 'Obtén el rol VIP durante 1 hora',
    style: ButtonStyle.Success,
  },
  comprar_inmunidad: {
    label: 'Inmunidad 24h',
    emoji: '🛡️',
    coste: 2000,
    descripcion: 'El bot no podrá mutearte durante 24 horas',
    style: ButtonStyle.Danger,
  },
};

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

export function buildBotonesTienda() {
  // Fila 1: acciones de muteo / moderación
  const fila1 = new ActionRowBuilder().addComponents(
    btn('comprar_muteo'),
    btn('comprar_timeout10'),
    btn('comprar_voz'),
    btn('comprar_unwarn'),
  );

  // Fila 2: roles especiales
  const fila2 = new ActionRowBuilder().addComponents(
    btn('comprar_vip'),
    btn('comprar_inmunidad'),
  );

  return [fila1, fila2];
}

function btn(id) {
  const art = ARTICULOS[id];
  return new ButtonBuilder()
    .setCustomId(id)
    .setLabel(`${art.label} (${art.coste} pts)`)
    .setEmoji(art.emoji)
    .setStyle(art.style);
}
