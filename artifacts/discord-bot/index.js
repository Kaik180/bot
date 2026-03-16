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

import {
  obtenerPuntos,
  darPuntos,
  quitarPuntos,
  gastarPuntos,
  tienePuntos,
  obtenerAvisos,
  quitarAviso,
} from './economia.js';

import {
  buildEmbedTienda,
  buildBotonesTienda,
  buildSelectorVictima,
  ARTICULOS,
} from './tienda.js';

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
    .setName('avisos')
    .setDescription('Muestra cuántos avisos tienes registrados')
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

// ─── Registro de comandos ─────────────────────────────────────────────────────

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

// ─── Router de interacciones ──────────────────────────────────────────────────

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand())  await manejarSlash(interaction);
    else if (interaction.isStringSelectMenu()) await manejarStringSelect(interaction);
    else if (interaction.isUserSelectMenu())   await manejarSelectorVictima(interaction);
    else if (interaction.isButton())           await manejarBoton(interaction);
  } catch (err) {
    console.error('Error en interactionCreate:', err);
    const msg = { content: '❌ Ocurrió un error inesperado. Inténtalo de nuevo.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
    else await interaction.reply(msg).catch(() => {});
  }
});

// ─── Comandos slash ───────────────────────────────────────────────────────────

async function manejarSlash(interaction) {
  const { commandName } = interaction;

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

  if (commandName === 'puntos') {
    const pts = obtenerPuntos(interaction.user.id);
    await interaction.reply({ content: `💰 Tienes **${pts} puntos** del servidor.`, ephemeral: true });
    return;
  }

  if (commandName === 'avisos') {
    const avisos = obtenerAvisos(interaction.user.id);
    await interaction.reply({
      content: `⚠️ Tienes **${avisos} aviso${avisos !== 1 ? 's' : ''}** registrados.`,
      ephemeral: true,
    });
    return;
  }

  if (commandName === 'dar-puntos') {
    const objetivo = interaction.options.getUser('usuario');
    const cantidad = interaction.options.getInteger('cantidad');
    const nuevo = darPuntos(objetivo.id, cantidad);
    await interaction.reply({ content: `✅ Se han otorgado **${cantidad} puntos** a ${objetivo}. Ahora tiene **${nuevo} puntos**.` });
    return;
  }

  if (commandName === 'quitar-puntos') {
    const objetivo = interaction.options.getUser('usuario');
    const cantidad = interaction.options.getInteger('cantidad');
    const nuevo = quitarPuntos(objetivo.id, cantidad);
    await interaction.reply({ content: `✅ Se han quitado **${cantidad} puntos** a ${objetivo}. Ahora tiene **${nuevo} puntos**.` });
    return;
  }
}

// ─── Select menu del menú principal ──────────────────────────────────────────

async function manejarStringSelect(interaction) {
  if (interaction.customId !== 'menu_principal') return;
  const sel = interaction.values[0];

  if (sel === 'menu_juegos') {
    await interaction.reply({ content: '🚧 Este menú está en construcción. ¡Vuelve pronto!', ephemeral: true });
    return;
  }
  if (sel === 'menu_tienda') {
    await interaction.reply({ embeds: [buildEmbedTienda()], components: buildBotonesTienda() });
  }
}

// ─── Botones de la tienda ─────────────────────────────────────────────────────

async function manejarBoton(interaction) {
  const { customId, user } = interaction;
  const articulo = ARTICULOS[customId];
  if (!articulo) return;

  // Verificar que el comprador tiene suficientes puntos (sin descontar aún)
  if (!tienePuntos(user.id, articulo.coste)) {
    await interaction.reply({
      content: `❌ No tienes suficientes puntos. Necesitas **${articulo.coste}** y tienes **${obtenerPuntos(user.id)}**.`,
      ephemeral: true,
    });
    return;
  }

  // Si el artículo necesita elegir víctima → mostrar UserSelectMenu
  if (articulo.necesitaObjetivo) {
    await interaction.reply(buildSelectorVictima(customId, user.id));
    return;
  }

  // Si es de auto-aplicación → ejecutar directamente
  await ejecutarAccionPropia(interaction, customId);
}

// ─── UserSelectMenu: selección de víctima ────────────────────────────────────

async function manejarSelectorVictima(interaction) {
  // customId tiene formato "victima:{accion}:{compradorId}"
  const partes = interaction.customId.split(':');
  if (partes[0] !== 'victima' || partes.length < 3) return;

  const accion      = partes[1];
  const compradorId = partes[2];

  // ── Seguridad: solo el comprador puede usar este menú ─────────────────────
  if (interaction.user.id !== compradorId) {
    await interaction.reply({
      content: '🔒 Solo la persona que abrió este menú puede usarlo.',
      ephemeral: true,
    });
    return;
  }

  const articulo = ARTICULOS[accion];
  if (!articulo) return;

  // Obtener el miembro objetivo seleccionado
  const objetivoId = interaction.values[0];
  const objetivoMember = await interaction.guild.members.fetch(objetivoId).catch(() => null);

  if (!objetivoMember) {
    await interaction.reply({ content: '❌ No se encontró al usuario seleccionado.', ephemeral: true });
    return;
  }

  // ── No permitir seleccionarse a uno mismo en acciones de víctima ──────────
  if (objetivoId === compradorId) {
    await interaction.reply({ content: '❌ No puedes seleccionarte a ti mismo como víctima.', ephemeral: true });
    return;
  }

  // ── Verificar inmunidad del objetivo ──────────────────────────────────────
  if (esInmune(objetivoMember)) {
    await interaction.reply({
      content: `🛡️ ¡No puedes tocar a **${objetivoMember.user.tag}**, es **Inmune**!`,
      ephemeral: true,
    });
    return;
  }

  // ── Verificar jerarquía de roles ──────────────────────────────────────────
  const botMember = interaction.guild.members.me;
  const check = puedeModerar(botMember, objetivoMember);
  if (!check.ok) {
    await interaction.reply({ content: `⚠️ ${check.razon}`, ephemeral: true });
    return;
  }

  // ── Descontar puntos ──────────────────────────────────────────────────────
  const resultado = gastarPuntos(compradorId, articulo.coste);
  if (!resultado.ok) {
    await interaction.reply({
      content: `❌ Ya no tienes suficientes puntos. Necesitas **${articulo.coste}** y tienes **${resultado.saldo}**.`,
      ephemeral: true,
    });
    return;
  }

  // ── Ejecutar la acción sobre el objetivo ──────────────────────────────────
  const exito = await ejecutarAccionSobreObjetivo(
    interaction, accion, objetivoMember, resultado.saldo,
  );

  if (!exito) {
    // Devolver puntos si la acción falló
    darPuntos(compradorId, articulo.coste);
    return;
  }

  // ── Registrar en #logs-tienda ─────────────────────────────────────────────
  await registrarCompra(
    interaction.guild,
    interaction.user,
    `${articulo.label} → ${objetivoMember.user.tag}`,
    articulo.coste,
  );
}

// ─── Acciones de auto-aplicación (sin objetivo) ──────────────────────────────

async function ejecutarAccionPropia(interaction, accion) {
  const { user, member, guild } = interaction;
  const articulo = ARTICULOS[accion];
  const botMember = guild.members.me;

  // ── Rol VIP 1 hora ────────────────────────────────────────────────────────
  if (accion === 'comprar_vip') {
    const res = gastarPuntos(user.id, articulo.coste);
    if (!res.ok) {
      await interaction.reply({ content: `❌ No tienes suficientes puntos. Necesitas **${articulo.coste}** y tienes **${res.saldo}**.`, ephemeral: true });
      return;
    }
    try {
      const rolVip = await buscarOCrearRol(guild, 'VIP', { color: 0xf1c40f });
      await member.roles.add(rolVip);
      await interaction.reply({ content: `👑 **${user}** ahora tiene el rol **VIP** durante 1 hora. (-${articulo.coste} pts | Saldo: ${res.saldo} pts)` });
      await registrarCompra(guild, user, articulo.label, articulo.coste);
      setTimeout(async () => {
        await member.roles.remove(rolVip).catch(() => {});
        await user.send('⏰ Tu rol **VIP** ha expirado.').catch(() => {});
      }, 60 * 60 * 1000);
    } catch {
      darPuntos(user.id, articulo.coste);
      await interaction.reply({ content: '⚠️ No tengo permisos para crear o asignar el rol VIP.', ephemeral: true });
    }
    return;
  }

  // ── Inmunidad 24 horas ────────────────────────────────────────────────────
  if (accion === 'comprar_inmunidad') {
    const res = gastarPuntos(user.id, articulo.coste);
    if (!res.ok) {
      await interaction.reply({ content: `❌ No tienes suficientes puntos. Necesitas **${articulo.coste}** y tienes **${res.saldo}**.`, ephemeral: true });
      return;
    }
    try {
      const rolInmune = await buscarOCrearRol(guild, 'Inmune', { color: 0x2ecc71 });
      await member.roles.add(rolInmune);
      await interaction.reply({ content: `🛡️ **${user}** tiene el rol **Inmune** durante 24 horas. Nadie podrá mutearte con el bot. (-${articulo.coste} pts | Saldo: ${res.saldo} pts)` });
      await registrarCompra(guild, user, articulo.label, articulo.coste);
      setTimeout(async () => {
        await member.roles.remove(rolInmune).catch(() => {});
        await user.send('⏰ Tu rol **Inmune** ha expirado.').catch(() => {});
      }, 24 * 60 * 60 * 1000);
    } catch {
      darPuntos(user.id, articulo.coste);
      await interaction.reply({ content: '⚠️ No tengo permisos para crear o asignar el rol Inmune.', ephemeral: true });
    }
    return;
  }
}

// ─── Acciones sobre la víctima seleccionada ───────────────────────────────────

// Devuelve true si la acción tuvo éxito.
async function ejecutarAccionSobreObjetivo(interaction, accion, objetivo, saldoRestante) {
  const { user, guild } = interaction;
  const articulo = ARTICULOS[accion];

  // ── Muteo Chat 5 min ──────────────────────────────────────────────────────
  if (accion === 'comprar_muteo') {
    try {
      await objetivo.timeout(5 * 60 * 1000, `Muteo de broma comprado por ${user.tag} en la tienda`);
      await interaction.reply({
        content: `🔇 **${objetivo.user}** ha sido muteado en el chat durante **5 minutos** por **${user}**. (-${articulo.coste} pts | Saldo: ${saldoRestante} pts)`,
      });
      return true;
    } catch {
      await interaction.reply({ content: '⚠️ No tengo permisos para aplicar el timeout a ese usuario.', ephemeral: true });
      return false;
    }
  }

  // ── Muteo Chat 10 min ─────────────────────────────────────────────────────
  if (accion === 'comprar_timeout10') {
    try {
      await objetivo.timeout(10 * 60 * 1000, `Muteo de broma comprado por ${user.tag} en la tienda`);
      await interaction.reply({
        content: `⏱️ **${objetivo.user}** ha sido muteado en el chat durante **10 minutos** por **${user}**. (-${articulo.coste} pts | Saldo: ${saldoRestante} pts)`,
      });
      return true;
    } catch {
      await interaction.reply({ content: '⚠️ No tengo permisos para aplicar el timeout a ese usuario.', ephemeral: true });
      return false;
    }
  }

  // ── Muteo de Voz ──────────────────────────────────────────────────────────
  if (accion === 'comprar_voz') {
    if (!objetivo.voice?.channel) {
      await interaction.reply({
        content: `🔕 **${objetivo.user.tag}** no está en ningún canal de voz ahora mismo.`,
        ephemeral: true,
      });
      return false;
    }
    try {
      await objetivo.voice.setDeaf(true, `Muteo de voz comprado por ${user.tag} en la tienda`);
      await interaction.reply({
        content: `🔕 **${objetivo.user}** ha sido ensordecido en el canal de voz por **${user}** durante 5 minutos. (-${articulo.coste} pts | Saldo: ${saldoRestante} pts)`,
      });
      setTimeout(async () => {
        await objetivo.voice.setDeaf(false).catch(() => {});
      }, 5 * 60 * 1000);
      return true;
    } catch {
      await interaction.reply({ content: '⚠️ No tengo permisos para ensordecer a ese usuario.', ephemeral: true });
      return false;
    }
  }

  // ── Quitar Aviso ──────────────────────────────────────────────────────────
  if (accion === 'comprar_unwarn') {
    const avisosAntes = obtenerAvisos(objetivo.id);
    if (avisosAntes === 0) {
      await interaction.reply({
        content: `🧹 **${objetivo.user.tag}** no tiene avisos registrados. No se descontaron puntos.`,
        ephemeral: true,
      });
      return false;
    }
    const avisosDespues = quitarAviso(objetivo.id);

    // Notificar al canal de staff si existe
    const canalStaff = guild.channels.cache.find(
      (c) => c.isTextBased() && /staff|mod|admin|moderac/i.test(c.name),
    );
    if (canalStaff) {
      await canalStaff
        .send(`🧹 **${user.tag}** ha usado 800 puntos para quitar 1 aviso a **${objetivo.user.tag}**. Avisos restantes: **${avisosDespues}**.`)
        .catch(() => {});
    }

    await interaction.reply({
      content: `🧹 Se ha quitado **1 aviso** a **${objetivo.user}** (tenía ${avisosAntes}, ahora tiene ${avisosDespues}). (-${articulo.coste} pts | Saldo: ${saldoRestante} pts)`,
    });
    return true;
  }

  return false;
}

// ─── Inicio ───────────────────────────────────────────────────────────────────

client.login(token);
