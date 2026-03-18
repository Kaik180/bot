import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
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
  nicknameAleatorio,
  ARTICULOS,
} from './tienda.js';

import {
  puedeModerar,
  esInmune,
  buscarOCrearRol,
  registrarCompra,
} from './moderacion.js';

import {
  activarEscudo,
  tieneEscudo,
  msEscudoRestante,
  activarSeguro,
  tieneSeguro,
  registrarAtaque,
  obtenerHistorialAtaques,
  comprarTicket,
  obtenerPozo,
  obtenerTicketsUsuario,
  realizarSorteo,
} from './estado.js';

// ─── Validación del token ─────────────────────────────────────────────────────

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Error: la variable de entorno DISCORD_TOKEN no está definida.');
  process.exit(1);
}

// ─── Duelos pendientes (en memoria) ──────────────────────────────────────────
// Clave: `${retadorId}:${objetivoId}` → { apuesta, timestamp }
const duelosPendientes = new Map();

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
    .setName('estado')
    .setDescription('Muestra tus defensas activas (escudo, seguro)')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('duelo')
    .setDescription('Reta a otro usuario por una apuesta de puntos')
    .addUserOption((o) =>
      o.setName('usuario').setDescription('Usuario al que retas').setRequired(true),
    )
    .addIntegerOption((o) =>
      o.setName('apuesta').setDescription('Puntos que cada jugador pone en juego').setMinValue(50).setRequired(true),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('loteria-comprar')
    .setDescription('Compra un ticket de lotería (100 puntos cada uno)')
    .addIntegerOption((o) =>
      o.setName('cantidad').setDescription('Número de tickets a comprar').setMinValue(1).setMaxValue(20),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('loteria-pozo')
    .setDescription('Muestra el pozo actual de la lotería y tus tickets')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('loteria-sorteo')
    .setDescription('(Admin) Realiza el sorteo de la lotería ahora')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
  iniciarSorteoAutomatico();
});

// ─── Mensajes de texto ────────────────────────────────────────────────────────

client.on('messageCreate', (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!hola') msg.reply('¡Hola mundo!');
});

// ─── Router de interacciones ──────────────────────────────────────────────────

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand())      await manejarSlash(interaction);
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

// --- Comando Guía ---
    if (commandName === 'guia') {
        const embedGuia = new EmbedBuilder()
            .setTitle('💎 GUÍA DE ECONOMÍA ELITE')
            .setColor(0xD4AF37) 
            .setThumbnail(interaction.guild.iconURL())
            .setDescription('Bienvenido al sistema de economía más exclusivo. Los puntos son un recurso de lujo y difícil obtención.')
            .addFields(
                { 
                    name: '🏆 ¿Cómo conseguir puntos?', 
                    value: '• Participando en **Eventos Especiales**.\n• Recompensas por ver **Streams oficiales**.\n• Apoyando al servidor con **Packs Premium**.' 
                },
                { 
                    name: '📦 PACKS DE PUNTOS PREMIUM', 
                    value: 
                    '**• Pack Bronce:** 2.000 pts — **5€**\n' +
                    '**• Pack Plata:** 5.000 pts — **15€**\n' +
                    '**• Pack Oro:** 15.000 pts — **40€**\n' +
                    '**• Pack Divino:** 40.000 pts — **100€**' 
                },
                { 
                    name: '💳 ¿Cómo comprar?', 
                    value: 'Abre un ticket en el canal de soporte o contacta con un Administrador.' 
                }
            )
            .setFooter({ text: 'Estos precios apoyan directamente el mantenimiento del servidor.' })
            .setTimestamp();

        return await interaction.reply({ embeds: [embedGuia] });
    }
// ─── Comandos slash ───────────────────────────────────────────────────────────

async function manejarSlash(interaction) {
  const { commandName, user } = interaction;

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
    await interaction.reply({
      content: `💰 Tienes **${obtenerPuntos(user.id)} puntos** del servidor.`,
      ephemeral: true,
    });
    return;
  }

  // /avisos
  if (commandName === 'avisos') {
    const n = obtenerAvisos(user.id);
    await interaction.reply({
      content: `⚠️ Tienes **${n} aviso${n !== 1 ? 's' : ''}** registrados.`,
      ephemeral: true,
    });
    return;
  }

  // /estado
  if (commandName === 'estado') {
    const escudo = tieneEscudo(user.id);
    const seguro = tieneSeguro(user.id);
    const msRestante = msEscudoRestante(user.id);
    const minRestantes = Math.ceil(msRestante / 60000);

    const lineas = [
      `🔰 **Escudo:** ${escudo ? `✅ Activo (~${minRestantes} min restantes)` : '❌ Inactivo'}`,
      `🪂 **Seguro de Desempleo:** ${seguro ? '✅ Activo' : '❌ Inactivo'}`,
      `💰 **Puntos:** ${obtenerPuntos(user.id)}`,
      `🎟️ **Tickets de lotería:** ${obtenerTicketsUsuario(user.id)}`,
    ];

    await interaction.reply({ content: lineas.join('\n'), ephemeral: true });
    return;
  }

  // /duelo
  if (commandName === 'duelo') {
    const objetivo = interaction.options.getUser('usuario');
    const apuesta  = interaction.options.getInteger('apuesta');

    if (objetivo.id === user.id) {
      await interaction.reply({ content: '❌ No puedes retarte a ti mismo.', ephemeral: true });
      return;
    }
    if (objetivo.bot) {
      await interaction.reply({ content: '❌ No puedes retar a un bot.', ephemeral: true });
      return;
    }
    if (!tienePuntos(user.id, apuesta)) {
      await interaction.reply({
        content: `❌ Necesitas **${apuesta} puntos** para apostar y solo tienes **${obtenerPuntos(user.id)}**.`,
        ephemeral: true,
      });
      return;
    }

    const claveduelo = `${user.id}:${objetivo.id}`;
    if (duelosPendientes.has(claveduelo)) {
      await interaction.reply({ content: '⚠️ Ya tienes un duelo pendiente contra ese usuario.', ephemeral: true });
      return;
    }

    const btnAceptar = new ButtonBuilder()
      .setCustomId(`duelo_aceptar:${user.id}:${objetivo.id}:${apuesta}`)
      .setLabel('⚔️ Aceptar duelo')
      .setStyle(ButtonStyle.Success);

    const btnRechazar = new ButtonBuilder()
      .setCustomId(`duelo_rechazar:${user.id}:${objetivo.id}:${apuesta}`)
      .setLabel('🏳️ Rechazar')
      .setStyle(ButtonStyle.Danger);

    duelosPendientes.set(claveduelo, { apuesta, timestamp: Date.now() });

    // Expirar el duelo en 5 minutos si no se acepta
    setTimeout(() => duelosPendientes.delete(claveduelo), 5 * 60 * 1000);

    await interaction.reply({
      content: `⚔️ **${user}** reta a **${objetivo}** a un duelo por **${apuesta} puntos** cada uno.\n${objetivo}, ¿aceptas el reto?`,
      components: [new ActionRowBuilder().addComponents(btnAceptar, btnRechazar)],
    });
    return;
  }

  // /loteria-comprar
  if (commandName === 'loteria-comprar') {
    const cantidad = interaction.options.getInteger('cantidad') ?? 1;
    const costeTotal = cantidad * 100;

    if (!tienePuntos(user.id, costeTotal)) {
      await interaction.reply({
        content: `❌ Necesitas **${costeTotal} puntos** para ${cantidad} ticket(s) y solo tienes **${obtenerPuntos(user.id)}**.`,
        ephemeral: true,
      });
      return;
    }

    const res = gastarPuntos(user.id, costeTotal);
    let info = null;
    for (let i = 0; i < cantidad; i++) info = comprarTicket(user.id);

    await interaction.reply({
      content: `🎟️ Compraste **${cantidad} ticket(s)** por **${costeTotal} puntos**.\n` +
               `Tienes **${info.misTickets} ticket(s)** en total. El pozo actual es de **${info.pozo} puntos**.\n` +
               `Saldo restante: **${res.saldo} puntos**.`,
    });
    return;
  }

  // /loteria-pozo
  if (commandName === 'loteria-pozo') {
    const pozo = obtenerPozo();
    const misTickets = obtenerTicketsUsuario(user.id);
    await interaction.reply({
      content: `🏆 El pozo de la lotería acumula **${pozo} puntos**.\nTienes **${misTickets} ticket(s)** comprados.`,
    });
    return;
  }

  // /loteria-sorteo (admin)
  if (commandName === 'loteria-sorteo') {
    await ejecutarSorteo(interaction.guild, interaction.channel);
    await interaction.reply({ content: '🎰 Sorteo ejecutado. Revisa el canal de logs.', ephemeral: true });
    return;
  }

  // /dar-puntos
  if (commandName === 'dar-puntos') {
    const objetivo = interaction.options.getUser('usuario');
    const cantidad = interaction.options.getInteger('cantidad');
    const nuevo = darPuntos(objetivo.id, cantidad);
    await interaction.reply({ content: `✅ Se han otorgado **${cantidad} puntos** a ${objetivo}. Ahora tiene **${nuevo} puntos**.` });
    return;
  }

  // /quitar-puntos
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
    const embedJuegos = new EmbedBuilder()
      .setTitle('🎮 Menú de Juegos')
      .setColor(0x9b59b6)
      .setDescription('Usa tus puntos del servidor para jugar y ganar mucho más.')
      .addFields(
        {
          name: '⚔️ Duelos',
          value: [
            'Reta a otro usuario a un duelo por puntos.',
            '• Cada jugador pone la misma apuesta en juego.',
            '• El bot elige al ganador al azar (50/50).',
            '• El ganador se lleva **el doble** de lo apostado.',
            '',
            '**Cómo usar:** `/duelo @usuario apuesta`',
            '*El retado tiene 5 minutos para aceptar o rechazar.*',
          ].join('\n'),
          inline: false,
        },
        {
          name: '🎰 Lotería Progresiva',
          value: [
            'Compra tickets y acumula el pozo para el próximo sorteo.',
            '• Cada ticket cuesta **100 puntos**.',
            '• Todos los tickets van al pozo global.',
            '• Cuantos más tickets tengas, más probabilidades de ganar.',
            '• El sorteo se realiza automáticamente cada **24 horas**.',
            '• El ganador se lleva **todo el pozo** acumulado.',
            '',
            '**Comandos:**',
            '`/loteria-comprar [cantidad]` — Compra tickets',
            '`/loteria-pozo` — Ver el pozo actual y tus tickets',
          ].join('\n'),
          inline: false,
        },
      )
      .setFooter({ text: '/estado para ver tus defensas activas • /puntos para ver tu saldo' });

    await interaction.reply({ embeds: [embedJuegos], ephemeral: false });
    return;
  }
  if (sel === 'menu_tienda') {
    await interaction.reply({ embeds: [buildEmbedTienda()], components: buildBotonesTienda() });
  }
}

// ─── Botones ──────────────────────────────────────────────────────────────────

async function manejarBoton(interaction) {
  const { customId, user } = interaction;

  // ── Botones de duelo ───────────────────────────────────────────────────────
  if (customId.startsWith('duelo_')) {
    await manejarBotonDuelo(interaction);
    return;
  }

  // ── Botones de la tienda ───────────────────────────────────────────────────
  const articulo = ARTICULOS[customId];
  if (!articulo) return;

  if (!tienePuntos(user.id, articulo.coste)) {
    await interaction.reply({
      content: `❌ No tienes suficientes puntos. Necesitas **${articulo.coste}** y tienes **${obtenerPuntos(user.id)}**.`,
      ephemeral: true,
    });
    return;
  }

  if (articulo.necesitaObjetivo) {
    await interaction.reply(buildSelectorVictima(customId, user.id));
    return;
  }

  await ejecutarAccionPropia(interaction, customId);
}

// ─── Botones de duelo ─────────────────────────────────────────────────────────

async function manejarBotonDuelo(interaction) {
  const partes  = interaction.customId.split(':');
  const accion   = partes[0]; // duelo_aceptar / duelo_rechazar
  const retadorId  = partes[1];
  const objetivoId = partes[2];
  const apuesta    = parseInt(partes[3]);

  // Solo el retado puede responder
  if (interaction.user.id !== objetivoId) {
    await interaction.reply({ content: '🔒 Solo el usuario retado puede responder a este duelo.', ephemeral: true });
    return;
  }

  const claveduelo = `${retadorId}:${objetivoId}`;

  if (accion === 'duelo_rechazar') {
    duelosPendientes.delete(claveduelo);
    await interaction.reply({ content: `🏳️ **${interaction.user}** rechazó el duelo.` });
    return;
  }

  if (accion === 'duelo_aceptar') {
    duelosPendientes.delete(claveduelo);

    // Verificar que ambos tienen los puntos
    const retador  = await interaction.guild.members.fetch(retadorId).catch(() => null);
    if (!retador) {
      await interaction.reply({ content: '❌ El retador ya no está en el servidor.', ephemeral: true });
      return;
    }

    if (!tienePuntos(retadorId, apuesta)) {
      await interaction.reply({ content: `❌ **${retador.user.tag}** ya no tiene suficientes puntos para el duelo.` });
      return;
    }
    if (!tienePuntos(objetivoId, apuesta)) {
      await interaction.reply({ content: `❌ No tienes suficientes puntos para aceptar el duelo (necesitas **${apuesta}**).`, ephemeral: true });
      return;
    }

    // Descontar a ambos
    gastarPuntos(retadorId, apuesta);
    gastarPuntos(objetivoId, apuesta);

    const pozo = apuesta * 2;
    const ganadorId = Math.random() < 0.5 ? retadorId : objetivoId;
    const ganadorMember = ganadorId === retadorId ? retador : interaction.member;

    darPuntos(ganadorId, pozo);

    const embed = new EmbedBuilder()
      .setTitle('⚔️ ¡Resultado del Duelo!')
      .setColor(0xf1c40f)
      .setDescription(
        `**${retador.user.tag}** vs **${interaction.user.tag}**\n\n` +
        `🎲 El destino ha decidido... ¡**${ganadorMember.user.tag}** gana **${pozo} puntos**!`,
      );

    await interaction.reply({ embeds: [embed] });
    return;
  }
}

// ─── UserSelectMenu: selección de víctima ────────────────────────────────────

async function manejarSelectorVictima(interaction) {
  const partes = interaction.customId.split(':');
  if (partes[0] !== 'victima' || partes.length < 3) return;

  const accion      = partes[1];
  const compradorId = partes[2];

  if (interaction.user.id !== compradorId) {
    await interaction.reply({ content: '🔒 Solo quien abrió este menú puede usarlo.', ephemeral: true });
    return;
  }

  const articulo = ARTICULOS[accion];
  if (!articulo) return;

  const objetivoId    = interaction.values[0];
  const objetivoMember = await interaction.guild.members.fetch(objetivoId).catch(() => null);

  if (!objetivoMember) {
    await interaction.reply({ content: '❌ No se encontró al usuario.', ephemeral: true });
    return;
  }
  if (objetivoId === compradorId) {
    await interaction.reply({ content: '❌ No puedes seleccionarte a ti mismo como víctima.', ephemeral: true });
    return;
  }

  // ── Verificar protección del objetivo ─────────────────────────────────────
  if (esInmune(objetivoMember)) {
    const tipoProteccion = tieneEscudo(objetivoMember.id) ? 'Escudo activo' : 'rol Inmune';
    await interaction.reply({
      content: `🛡️ ¡**${objetivoMember.user.tag}** está protegido (${tipoProteccion})! No puedes atacarle ahora.`,
      ephemeral: true,
    });
    return;
  }

  // ── Verificar jerarquía de roles ──────────────────────────────────────────
  const botMember = interaction.guild.members.me;
  const check     = puedeModerar(botMember, objetivoMember);
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

  // ── Ejecutar la acción ────────────────────────────────────────────────────
  const exito = await ejecutarAccionSobreObjetivo(
    interaction, accion, objetivoMember, resultado.saldo,
  );

  if (!exito) {
    darPuntos(compradorId, articulo.coste);
    return;
  }

  // ── Registrar historial de ataques ────────────────────────────────────────
  registrarAtaque(objetivoId, interaction.user.tag, articulo.label);

  // ── Reembolso del Seguro de Desempleo al objetivo ─────────────────────────
  if (tieneSeguro(objetivoId)) {
    const reembolso = Math.floor(articulo.coste * 0.5);
    darPuntos(objetivoId, reembolso);
    await objetivoMember.user
      .send(`🪂 Tu **Seguro de Desempleo** se activó: has recibido **${reembolso} puntos** de reembolso tras el ataque de **${interaction.user.tag}**.`)
      .catch(() => {});
    console.log(`Seguro activado: ${reembolso} pts devueltos a ${objetivoMember.user.tag}`);
  }

  // ── Log en #logs-tienda ───────────────────────────────────────────────────
  await registrarCompra(
    interaction.guild,
    interaction.user,
    `${articulo.label} → ${objetivoMember.user.tag}`,
    articulo.coste,
  );
}

// ─── Acciones sobre uno mismo ─────────────────────────────────────────────────

async function ejecutarAccionPropia(interaction, accion) {
  const { user, member, guild } = interaction;
  const art = ARTICULOS[accion];

  async function cobrarYEjecutar(fn) {
    const res = gastarPuntos(user.id, art.coste);
    if (!res.ok) {
      await interaction.reply({
        content: `❌ No tienes suficientes puntos. Necesitas **${art.coste}** y tienes **${res.saldo}**.`,
        ephemeral: true,
      });
      return null;
    }
    return res;
  }

  // ── Rol VIP 1 hora ────────────────────────────────────────────────────────
  if (accion === 'comprar_vip') {
    const res = await cobrarYEjecutar();
    if (!res) return;
    try {
      const rolVip = await buscarOCrearRol(guild, 'VIP', { color: 0xf1c40f });
      await member.roles.add(rolVip);
      await interaction.reply({ content: `👑 **${user}** tiene el rol **VIP** durante 1 hora. (-${art.coste} pts | Saldo: ${res.saldo} pts)` });
      await registrarCompra(guild, user, art.label, art.coste);
      setTimeout(async () => {
        await member.roles.remove(rolVip).catch(() => {});
        await user.send('⏰ Tu rol **VIP** ha expirado.').catch(() => {});
      }, 60 * 60 * 1000);
    } catch {
      darPuntos(user.id, art.coste);
      await interaction.reply({ content: '⚠️ No tengo permisos para crear o asignar el rol VIP.', ephemeral: true });
    }
    return;
  }

  // ── Inmunidad 24h (via rol Discord) ──────────────────────────────────────
  if (accion === 'comprar_inmunidad') {
    const res = await cobrarYEjecutar();
    if (!res) return;
    try {
      const rolInmune = await buscarOCrearRol(guild, 'Inmune', { color: 0x2ecc71 });
      await member.roles.add(rolInmune);
      await interaction.reply({ content: `🛡️ **${user}** tiene el rol **Inmune** durante 24 horas. (-${art.coste} pts | Saldo: ${res.saldo} pts)` });
      await registrarCompra(guild, user, art.label, art.coste);
      setTimeout(async () => {
        await member.roles.remove(rolInmune).catch(() => {});
        await user.send('⏰ Tu rol **Inmune** ha expirado.').catch(() => {});
      }, 24 * 60 * 60 * 1000);
    } catch {
      darPuntos(user.id, art.coste);
      await interaction.reply({ content: '⚠️ No tengo permisos para crear o asignar el rol Inmune.', ephemeral: true });
    }
    return;
  }

  // ── Escudo personal 2h (persiste en disco) ────────────────────────────────
  if (accion === 'escudo_personal') {
    const res = await cobrarYEjecutar();
    if (!res) return;
    activarEscudo(user.id, 2 * 60 * 60 * 1000);
    await interaction.reply({ content: `🔰 **${user}** ha activado el **Escudo** durante 2 horas. Ningún ataque de la tienda funcionará contra ti. (-${art.coste} pts | Saldo: ${res.saldo} pts)` });
    await registrarCompra(guild, user, art.label, art.coste);
    return;
  }

  // ── Seguro de Desempleo (pasivo permanente) ───────────────────────────────
  if (accion === 'seguro_desempleo') {
    if (tieneSeguro(user.id)) {
      await interaction.reply({ content: '🪂 Ya tienes el **Seguro de Desempleo** activo.', ephemeral: true });
      return;
    }
    const res = await cobrarYEjecutar();
    if (!res) return;
    activarSeguro(user.id);
    await interaction.reply({ content: `🪂 **${user}** ha activado el **Seguro de Desempleo**. Si alguien te ataca, recibirás el 50% del coste del ataque en puntos. (-${art.coste} pts | Saldo: ${res.saldo} pts)` });
    await registrarCompra(guild, user, art.label, art.coste);
    return;
  }

  // ── Espionaje ─────────────────────────────────────────────────────────────
  if (accion === 'espionaje') {
    const res = await cobrarYEjecutar();
    if (!res) return;
    const historial = obtenerHistorialAtaques(user.id);
    let informe;
    if (historial.length === 0) {
      informe = 'No hay registros de ataques contra ti aún.';
    } else {
      informe = historial
        .map((h, i) => `${i + 1}. **${h.atacanteTag}** — ${h.accion} (${h.fecha})`)
        .join('\n');
    }
    try {
      await user.send(`🕵️ **Informe de Espionaje:**\nÚltimos ataques que has recibido:\n${informe}`);
      await interaction.reply({ content: `🕵️ Te he enviado el informe de espionaje por DM. (-${art.coste} pts | Saldo: ${res.saldo} pts)`, ephemeral: true });
    } catch {
      darPuntos(user.id, art.coste);
      await interaction.reply({ content: '⚠️ No pude enviarte un DM. Asegúrate de tener los mensajes directos habilitados.', ephemeral: true });
    }
    await registrarCompra(guild, user, art.label, art.coste);
    return;
  }
}

// ─── Acciones sobre la víctima seleccionada ──────────────────────────────────

async function ejecutarAccionSobreObjetivo(interaction, accion, objetivo, saldoRestante) {
  const { user, guild } = interaction;
  const art = ARTICULOS[accion];

  // ── Muteo Chat + Voz 5 min ────────────────────────────────────────────────
  if (accion === 'comprar_muteo') {
    try {
      const promesas = [objetivo.timeout(5 * 60 * 1000, `Muteo comprado por ${user.tag}`)];
      const enVoz = !!objetivo.voice?.channel;
      if (enVoz) promesas.push(objetivo.voice.setMute(true, `Muteo voz por ${user.tag}`));

      await Promise.all(promesas);
      await interaction.reply({
        content: `🔇 **${objetivo.user}** muteado **5 min** por **${user}**${enVoz ? ' (chat y voz)' : ' (chat)'}. (-${art.coste} pts | Saldo: ${saldoRestante} pts)`,
      });
      if (enVoz) setTimeout(async () => { await objetivo.voice.setMute(false).catch(() => {}); }, 5 * 60 * 1000);
      return true;
    } catch {
      await interaction.reply({ content: '⚠️ No tengo permisos para mutear a ese usuario.', ephemeral: true });
      return false;
    }
  }

  // ── Muteo Chat 10 min ─────────────────────────────────────────────────────
  if (accion === 'comprar_timeout10') {
    try {
      await objetivo.timeout(10 * 60 * 1000, `Muteo 10 min por ${user.tag}`);
      await interaction.reply({
        content: `⏱️ **${objetivo.user}** muteado **10 min** en el chat por **${user}**. (-${art.coste} pts | Saldo: ${saldoRestante} pts)`,
      });
      return true;
    } catch {
      await interaction.reply({ content: '⚠️ No tengo permisos para aplicar el timeout.', ephemeral: true });
      return false;
    }
  }

  // ── Muteo de Voz ──────────────────────────────────────────────────────────
  if (accion === 'comprar_voz') {
    if (!objetivo.voice?.channel) {
      await interaction.reply({ content: `🔕 **${objetivo.user.tag}** no está en ningún canal de voz.`, ephemeral: true });
      return false;
    }
    try {
      await objetivo.voice.setDeaf(true, `Muteo voz por ${user.tag}`);
      await interaction.reply({
        content: `🔕 **${objetivo.user}** ensordecido en voz por **${user}** durante 5 minutos. (-${art.coste} pts | Saldo: ${saldoRestante} pts)`,
      });
      setTimeout(async () => { await objetivo.voice.setDeaf(false).catch(() => {}); }, 5 * 60 * 1000);
      return true;
    } catch {
      await interaction.reply({ content: '⚠️ No tengo permisos para ensordecer a ese usuario.', ephemeral: true });
      return false;
    }
  }

  // ── Quitar Aviso ──────────────────────────────────────────────────────────
  if (accion === 'comprar_unwarn') {
    const antes = obtenerAvisos(objetivo.id);
    if (antes === 0) {
      await interaction.reply({ content: `🧹 **${objetivo.user.tag}** no tiene avisos registrados.`, ephemeral: true });
      return false;
    }
    const despues = quitarAviso(objetivo.id);
    const canalStaff = guild.channels.cache.find(
      (c) => c.isTextBased() && /staff|mod|admin|moderac/i.test(c.name),
    );
    if (canalStaff) {
      await canalStaff.send(`🧹 **${user.tag}** quitó 1 aviso a **${objetivo.user.tag}**. Avisos restantes: **${despues}**.`).catch(() => {});
    }
    await interaction.reply({
      content: `🧹 Se quitó **1 aviso** a **${objetivo.user}** (tenía ${antes}, ahora tiene ${despues}). (-${art.coste} pts | Saldo: ${saldoRestante} pts)`,
    });
    return true;
  }

  // ── Cambio de Nickname ────────────────────────────────────────────────────
  if (accion === 'cambio_nick') {
    const botMember = guild.members.me;
    if (!botMember.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      await interaction.reply({ content: '⚠️ No tengo el permiso **Gestionar Apodos** para cambiar nicknames.', ephemeral: true });
      return false;
    }
    const nickAnterior = objetivo.nickname || objetivo.user.username;
    const nickNuevo    = nicknameAleatorio();
    try {
      await objetivo.setNickname(nickNuevo, `Cambio de nick comprado por ${user.tag}`);
      await interaction.reply({
        content: `✏️ **${objetivo.user}** ahora se llama **"${nickNuevo}"** durante 1 hora (antes: ${nickAnterior}). (-${art.coste} pts | Saldo: ${saldoRestante} pts)`,
      });
      setTimeout(async () => {
        await objetivo.setNickname(nickAnterior === objetivo.user.username ? null : nickAnterior).catch(() => {});
      }, 60 * 60 * 1000);
      return true;
    } catch {
      await interaction.reply({ content: '⚠️ No pude cambiar el apodo de ese usuario (puede que su rol sea superior al mío).', ephemeral: true });
      return false;
    }
  }

  return false;
}

// ─── Lotería: sorteo ──────────────────────────────────────────────────────────

async function ejecutarSorteo(guild, canal) {
  const resultado = realizarSorteo();

  if (!resultado) {
    await canal?.send('🎰 La lotería se intentó sortear pero **no hay tickets** comprados aún.').catch(() => {});
    return;
  }

  const { ganadorId, pozo } = resultado;
  darPuntos(ganadorId, pozo);

  let ganadorTag = `<@${ganadorId}>`;
  try {
    const ganadorMember = await guild.members.fetch(ganadorId);
    ganadorTag = ganadorMember.user.tag;
    await ganadorMember.user.send(`🎉 ¡Has ganado la lotería del servidor! **${pozo} puntos** han sido añadidos a tu cuenta.`).catch(() => {});
  } catch {}

  const embed = new EmbedBuilder()
    .setTitle('🎰 ¡Sorteo de Lotería!')
    .setColor(0xf1c40f)
    .setDescription(`🏆 El ganador es **${ganadorTag}**, que se lleva **${pozo} puntos** del pozo.\n¡El pozo vuelve a cero!`);

  await canal?.send({ embeds: [embed] }).catch(() => {});
  console.log(`Lotería sorteada: ganador ${ganadorId}, pozo ${pozo} pts`);
}

// Sorteo automático cada 24 horas
function iniciarSorteoAutomatico() {
  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      const canal = guild.channels.cache.find((c) => c.isTextBased() && c.name === 'logs-tienda');
      await ejecutarSorteo(guild, canal);
    }
  }, 24 * 60 * 60 * 1000);

  console.log('Sorteo automático de lotería programado cada 24 horas.');
}

// ─── Inicio ───────────────────────────────────────────────────────────────────

client.login(token);
