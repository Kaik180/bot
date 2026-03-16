import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} from 'discord.js';

import { obtenerPuntos, darPuntos, quitarPuntos, gastarPuntos } from './economia.js';
import { buildEmbedTienda, buildBotonesTienda, ARTICULOS } from './tienda.js';
import {
  puedeModerar,
  esInmune,
  buscarOCrearRol,
  registrarCompra,
} from './moderacion.js';

// ─── Validación del token ─────────────────────────────────────────────────────

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Error: la variable de entorno DISCORD_TOKEN no está definida.');
  process.exit(1);
}

// ─── Comandos slash ───────────────────────────────────────────────────────────

const commands = [
  new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Abre el menú principal del servidor')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('puntos')
    .setDescription('Muestra cuántos puntos del servidor tienes')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('dar-puntos')
    .setDescription('(Admin) Otorga puntos a un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((o) =>
      o.setName('usuario').setDescription('Usuario que recibirá los puntos').setRequired(true),
    )
    .addIntegerOption((o) =>
      o.setName('cantidad').setDescription('Cantidad de puntos').setMinValue(1).setRequired(true),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('quitar-puntos')
    .setDescription('(Admin) Quita puntos a un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((o) =>
      o.setName('usuario').setDescription('Usuario al que se quitarán puntos').setRequired(true),
    )
    .addIntegerOption((o) =>
      o.setName('cantidad').setDescription('Cantidad de puntos a quitar').setMinValue(1).setRequired(true),
    )
    .toJSON(),
];

// ─── Registro de comandos en Discord ─────────────────────────────────────────

const rest = new REST({ version: '10' }).setToken(token);

async function registrarComandos(clientId) {
  try {
    console.log('Registrando comandos slash...');
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Comandos slash registrados correctamente.');
  } catch (err) {
    console.error('Error al registrar comandos:', err);
  }
}

// ─── Cliente ──────────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('clientReady', async (c) => {
  console.log(`Bot conectado como ${c.user.tag}`);
  await registrarComandos(c.user.id);
});

// ─── Mensajes de texto ────────────────────────────────────────────────────────

client.on('messageCreate', (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!hola') msg.reply('¡Hola mundo!');
});

// ─── Interacciones ────────────────────────────────────────────────────────────

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) await manejarComandoSlash(interaction);
    else if (interaction.isStringSelectMenu()) await manejarSelectMenu(interaction);
    else if (interaction.isButton()) await manejarBoton(interaction);
  } catch (err) {
    console.error('Error en interactionCreate:', err);
    const msg = { content: '❌ Ocurrió un error inesperado. Inténtalo de nuevo.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
    else await interaction.reply(msg).catch(() => {});
  }
});

// ─── Comandos slash ───────────────────────────────────────────────────────────

async function manejarComandoSlash(interaction) {
  const { commandName } = interaction;

  // /menu
  if (commandName === 'menu') {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('menu_principal')
      .setPlaceholder('Elige una sección...')
      .addOptions([
        { label: 'Menú de Juegos', value: 'menu_juegos', description: 'Próximamente', emoji: '🎮' },
        { label: 'Tienda del Servidor', value: 'menu_tienda', description: 'Usa tus puntos', emoji: '🛒' },
      ]);
    await interaction.reply({
      content: '**Menú Principal** — Selecciona una sección:',
      components: [new ActionRowBuilder().addComponents(selectMenu)],
    });
    return;
  }

  // /puntos
  if (commandName === 'puntos') {
    const pts = obtenerPuntos(interaction.user.id);
    await interaction.reply({
      content: `💰 Tienes **${pts} puntos** del servidor.`,
      ephemeral: true,
    });
    return;
  }

  // /dar-puntos
  if (commandName === 'dar-puntos') {
    const objetivo = interaction.options.getUser('usuario');
    const cantidad = interaction.options.getInteger('cantidad');
    const nuevo = darPuntos(objetivo.id, cantidad);
    await interaction.reply({
      content: `✅ Se han otorgado **${cantidad} puntos** a ${objetivo}. Ahora tiene **${nuevo} puntos**.`,
    });
    return;
  }

  // /quitar-puntos
  if (commandName === 'quitar-puntos') {
    const objetivo = interaction.options.getUser('usuario');
    const cantidad = interaction.options.getInteger('cantidad');
    const nuevo = quitarPuntos(objetivo.id, cantidad);
    await interaction.reply({
      content: `✅ Se han quitado **${cantidad} puntos** a ${objetivo}. Ahora tiene **${nuevo} puntos**.`,
    });
    return;
  }
}

// ─── Select menu ──────────────────────────────────────────────────────────────

async function manejarSelectMenu(interaction) {
  if (interaction.customId !== 'menu_principal') return;
  const sel = interaction.values[0];

  if (sel === 'menu_juegos') {
    await interaction.reply({ content: '🚧 Este menú está en construcción. ¡Vuelve pronto!', ephemeral: true });
    return;
  }
  if (sel === 'menu_tienda') {
    await interaction.reply({
      embeds: [buildEmbedTienda()],
      components: buildBotonesTienda(),
    });
  }
}

// ─── Botones de la tienda ─────────────────────────────────────────────────────

async function manejarBoton(interaction) {
  const { customId, user, member, guild } = interaction;
  if (!ARTICULOS[customId]) return;

  const articulo = ARTICULOS[customId];
  const botMember = guild.members.me;

  // 1. Verificar puntos
  const resultado = gastarPuntos(user.id, articulo.coste);
  if (!resultado.ok) {
    await interaction.reply({
      content: `❌ No tienes suficientes puntos. Necesitas **${articulo.coste}** y tienes **${resultado.saldo}**.`,
      ephemeral: true,
    });
    return;
  }

  // 2. Ejecutar la acción de la tienda
  const exito = await ejecutarAccion(interaction, customId, member, botMember, guild);

  // 3. Si falló, devolver los puntos
  if (!exito) {
    darPuntos(user.id, articulo.coste);
    return;
  }

  // 4. Registrar la compra en #logs-tienda
  await registrarCompra(guild, user, articulo.label, articulo.coste);
}

// ─── Lógica de cada artículo ──────────────────────────────────────────────────

// Devuelve true si la acción se ejecutó con éxito, false si hubo un error.
async function ejecutarAccion(interaction, customId, member, botMember, guild) {

  // ── Auto-muteo 5 min ───────────────────────────────────────────────────────
  if (customId === 'comprar_muteo') {
    if (esInmune(member)) {
      await interaction.reply({ content: '🛡️ Tienes el rol **Inmune**, ¡el muteo no te afecta!', ephemeral: true });
      return false;
    }
    const check = puedeModerar(botMember, member);
    if (!check.ok) {
      await interaction.reply({ content: `⚠️ ${check.razon}`, ephemeral: true });
      return false;
    }
    try {
      await member.timeout(5 * 60 * 1000, 'Auto-muteo comprado en la tienda');
      await interaction.reply({
        content: `🔇 **${interaction.user}** se ha muteado durante **5 minutos**. (-500 pts | Saldo: ${obtenerPuntos(interaction.user.id)} pts)`,
      });
      return true;
    } catch {
      await interaction.reply({ content: '⚠️ No tengo permisos para aplicar el timeout.', ephemeral: true });
      return false;
    }
  }

  // ── Timeout Chat 10 min ────────────────────────────────────────────────────
  if (customId === 'comprar_timeout10') {
    if (esInmune(member)) {
      await interaction.reply({ content: '🛡️ Tienes el rol **Inmune**, ¡el muteo no te afecta!', ephemeral: true });
      return false;
    }
    const check = puedeModerar(botMember, member);
    if (!check.ok) {
      await interaction.reply({ content: `⚠️ ${check.razon}`, ephemeral: true });
      return false;
    }
    try {
      await member.timeout(10 * 60 * 1000, 'Timeout 10 min comprado en la tienda');
      await interaction.reply({
        content: `⏱️ **${interaction.user}** se ha aplicado un timeout de **10 minutos** en el chat. (-600 pts | Saldo: ${obtenerPuntos(interaction.user.id)} pts)`,
      });
      return true;
    } catch {
      await interaction.reply({ content: '⚠️ No tengo permisos para aplicar el timeout.', ephemeral: true });
      return false;
    }
  }

  // ── Muteo de Voz ───────────────────────────────────────────────────────────
  if (customId === 'comprar_voz') {
    const voiceState = member.voice;
    if (!voiceState?.channel) {
      await interaction.reply({
        content: '🔕 Debes estar en un canal de voz para usar este artículo.',
        ephemeral: true,
      });
      return false;
    }
    const check = puedeModerar(botMember, member);
    if (!check.ok) {
      await interaction.reply({ content: `⚠️ ${check.razon}`, ephemeral: true });
      return false;
    }
    try {
      await member.voice.setDeaf(true, 'Muteo de voz comprado en la tienda');
      await interaction.reply({
        content: `🔕 **${interaction.user}** ha sido ensordecido en el canal de voz. (-500 pts | Saldo: ${obtenerPuntos(interaction.user.id)} pts)`,
      });
      // Quitar la sordera tras 5 minutos
      setTimeout(async () => {
        await member.voice.setDeaf(false).catch(() => {});
      }, 5 * 60 * 1000);
      return true;
    } catch {
      await interaction.reply({ content: '⚠️ No tengo permisos para ensordecer en el canal de voz.', ephemeral: true });
      return false;
    }
  }

  // ── Quitar Aviso (Unwarn) ──────────────────────────────────────────────────
  if (customId === 'comprar_unwarn') {
    // Notifica al staff buscando un canal con "staff", "mod" o "admin" en el nombre
    const canalStaff = guild.channels.cache.find(
      (c) => c.isTextBased() && /staff|mod|admin|moderac/i.test(c.name),
    );
    if (canalStaff) {
      await canalStaff.send(
        `🧹 **${interaction.user.tag}** ha solicitado la revisión de una advertencia usando 800 puntos de la tienda. Por favor revisar el historial de advertencias.`,
      );
    }
    await interaction.reply({
      content: canalStaff
        ? `🧹 Tu solicitud de revisión de aviso ha sido enviada al staff en ${canalStaff}. (-800 pts | Saldo: ${obtenerPuntos(interaction.user.id)} pts)`
        : '🧹 Solicitud registrada. No encontré un canal de staff, pero el log ha sido guardado. (-800 pts)',
    });
    return true;
  }

  // ── Rol VIP 1 hora ─────────────────────────────────────────────────────────
  if (customId === 'comprar_vip') {
    try {
      const rolVip = await buscarOCrearRol(guild, 'VIP', { color: 0xf1c40f });
      await member.roles.add(rolVip);
      await interaction.reply({
        content: `👑 **${interaction.user}** ahora tiene el rol **VIP** durante 1 hora. (-1000 pts | Saldo: ${obtenerPuntos(interaction.user.id)} pts)`,
      });
      setTimeout(async () => {
        await member.roles.remove(rolVip).catch(() => {});
        await interaction.user.send('⏰ Tu rol **VIP** ha expirado.').catch(() => {});
      }, 60 * 60 * 1000);
      return true;
    } catch {
      await interaction.reply({ content: '⚠️ No tengo permisos para crear o asignar el rol VIP.', ephemeral: true });
      return false;
    }
  }

  // ── Inmunidad 24 horas ─────────────────────────────────────────────────────
  if (customId === 'comprar_inmunidad') {
    try {
      const rolInmune = await buscarOCrearRol(guild, 'Inmune', { color: 0x2ecc71 });
      await member.roles.add(rolInmune);
      await interaction.reply({
        content: `🛡️ **${interaction.user}** ahora tiene el rol **Inmune** durante 24 horas. ¡Los comandos de muteo del bot no te afectarán! (-2000 pts | Saldo: ${obtenerPuntos(interaction.user.id)} pts)`,
      });
      setTimeout(async () => {
        await member.roles.remove(rolInmune).catch(() => {});
        await interaction.user.send('⏰ Tu rol **Inmune** ha expirado.').catch(() => {});
      }, 24 * 60 * 60 * 1000);
      return true;
    } catch {
      await interaction.reply({ content: '⚠️ No tengo permisos para crear o asignar el rol Inmune.', ephemeral: true });
      return false;
    }
  }

  return false;
}

// ─── Inicio ───────────────────────────────────────────────────────────────────

client.login(token);
