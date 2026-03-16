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

import { obtenerPuntos, darPuntos, gastarPuntos } from './economia.js';

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('Error: La variable de entorno DISCORD_TOKEN no está definida.');
  process.exit(1);
}

// ─── Definición de comandos slash ────────────────────────────────────────────

const commands = [
  new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Abre el menú principal del servidor')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('puntos')
    .setDescription('Muestra tus puntos del servidor')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('dar-puntos')
    .setDescription('(Admin) Otorga puntos a un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName('usuario').setDescription('Usuario que recibirá los puntos').setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName('cantidad')
        .setDescription('Cantidad de puntos a otorgar')
        .setMinValue(1)
        .setRequired(true),
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
  } catch (error) {
    console.error('Error al registrar comandos:', error);
  }
}

// ─── Cliente de Discord ───────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('clientReady', async (c) => {
  console.log(`Bot conectado como ${c.user.tag}`);
  await registrarComandos(c.user.id);
});

// ─── Mensajes de texto (comando !hola) ────────────────────────────────────────

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (message.content === '!hola') message.reply('¡Hola mundo!');
});

// ─── Interacciones ────────────────────────────────────────────────────────────

client.on('interactionCreate', async (interaction) => {
  try {

    // ── /menu ──────────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand() && interaction.commandName === 'menu') {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('menu_principal')
        .setPlaceholder('Elige una opción...')
        .addOptions([
          {
            label: 'Menú de Juegos',
            value: 'menu_juegos',
            description: 'Ver los juegos disponibles (Próximamente)',
            emoji: '🎮',
          },
          {
            label: 'Tienda del Servidor',
            value: 'menu_tienda',
            description: 'Usa tus puntos para comprar acciones',
            emoji: '🛒',
          },
        ]);

      await interaction.reply({
        content: '**Menú Principal** — Selecciona una sección:',
        components: [new ActionRowBuilder().addComponents(selectMenu)],
      });
      return;
    }

    // ── /puntos ────────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand() && interaction.commandName === 'puntos') {
      const pts = obtenerPuntos(interaction.user.id);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('💰 Tu saldo')
            .setDescription(`Tienes **${pts} puntos** del servidor.`)
            .setColor(0xf1c40f)
            .setThumbnail(interaction.user.displayAvatarURL()),
        ],
        ephemeral: true,
      });
      return;
    }

    // ── /dar-puntos ────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand() && interaction.commandName === 'dar-puntos') {
      const objetivo = interaction.options.getUser('usuario');
      const cantidad = interaction.options.getInteger('cantidad');
      const nuevoTotal = darPuntos(objetivo.id, cantidad);

      await interaction.reply({
        content: `✅ Se han otorgado **${cantidad} puntos** a ${objetivo}. Ahora tiene **${nuevoTotal} puntos**.`,
      });
      return;
    }

    // ── Select menu principal ──────────────────────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_principal') {
      const seleccion = interaction.values[0];

      if (seleccion === 'menu_juegos') {
        await interaction.reply({
          content: '🚧 Este menú está en construcción. ¡Vuelve pronto!',
          ephemeral: true,
        });
        return;
      }

      if (seleccion === 'menu_tienda') {
        await interaction.reply({
          embeds: [buildEmbedTienda()],
          components: [buildBotonesTienda()],
        });
        return;
      }
    }

    // ── Botones de la tienda ───────────────────────────────────────────────
    if (interaction.isButton()) {

      // Botón: Muteo de broma (500 pts)
      if (interaction.customId === 'comprar_muteo') {
        const coste = 500;
        const resultado = gastarPuntos(interaction.user.id, coste);

        if (!resultado.ok) {
          await interaction.reply({
            content: `❌ No tienes suficientes puntos. Necesitas **${coste}** y tienes **${resultado.saldo}**.`,
            ephemeral: true,
          });
          return;
        }

        // Intenta aplicar timeout de 5 minutos al usuario que compró
        const miembro = interaction.member;
        try {
          await miembro.timeout(5 * 60 * 1000, 'Muteo de broma comprado en la tienda');
          await interaction.reply({
            content: `🔇 ¡${interaction.user} se ha muteado a sí mismo por 5 minutos! Se descontaron **${coste} puntos**. Saldo: **${resultado.saldo} puntos**.`,
          });
        } catch {
          // Devuelve los puntos si el bot no pudo mutear
          darPuntos(interaction.user.id, coste);
          await interaction.reply({
            content: '⚠️ No tengo permisos para aplicar el muteo. No se descontaron puntos.',
            ephemeral: true,
          });
        }
        return;
      }

      // Botón: Rol VIP (1000 pts)
      if (interaction.customId === 'comprar_vip') {
        const coste = 1000;
        const resultado = gastarPuntos(interaction.user.id, coste);

        if (!resultado.ok) {
          await interaction.reply({
            content: `❌ No tienes suficientes puntos. Necesitas **${coste}** y tienes **${resultado.saldo}**.`,
            ephemeral: true,
          });
          return;
        }

        try {
          const guild = interaction.guild;

          // Busca el rol "VIP" o lo crea si no existe
          let rolVip = guild.roles.cache.find((r) => r.name === 'VIP');
          if (!rolVip) {
            rolVip = await guild.roles.create({
              name: 'VIP',
              color: 0xf1c40f,
              reason: 'Rol VIP creado automáticamente por la tienda del servidor',
            });
            console.log(`Rol VIP creado en ${guild.name}`);
          }

          await interaction.member.roles.add(rolVip);
          await interaction.reply({
            content: `👑 ¡${interaction.user} ahora tiene el rol **VIP** durante 1 hora! Se descontaron **${coste} puntos**. Saldo: **${resultado.saldo} puntos**.`,
          });

          // Quita el rol pasada 1 hora
          setTimeout(async () => {
            try {
              await interaction.member.roles.remove(rolVip);
              await interaction.user
                .send('⏰ Tu rol **VIP** ha expirado tras 1 hora.')
                .catch(() => {});
            } catch {
              // El miembro puede haber salido del servidor
            }
          }, 60 * 60 * 1000);

        } catch {
          // Devuelve los puntos si el bot no pudo asignar el rol
          darPuntos(interaction.user.id, coste);
          await interaction.reply({
            content: '⚠️ No tengo permisos para crear o asignar roles. No se descontaron puntos.',
            ephemeral: true,
          });
        }
        return;
      }
    }

  } catch (error) {
    console.error('Error en interactionCreate:', error);
    const msg = { content: '❌ Ocurrió un error inesperado. Inténtalo de nuevo.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

// ─── Helpers para la tienda ───────────────────────────────────────────────────

function buildEmbedTienda() {
  return new EmbedBuilder()
    .setTitle('🛒 Tienda del Servidor')
    .setDescription('Gasta tus **Puntos del Servidor** en estas acciones exclusivas.')
    .setColor(0x5865f2)
    .addFields(
      { name: '🔇 Muteo de broma (5 min)', value: 'Coste: **500 puntos**', inline: true },
      { name: '👑 Rol VIP temporal (1 hora)', value: 'Coste: **1000 puntos**', inline: true },
    )
    .setFooter({ text: 'Usa /puntos para ver tu saldo.' });
}

function buildBotonesTienda() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('comprar_muteo')
      .setLabel('Muteo de broma (500 pts)')
      .setEmoji('🔇')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('comprar_vip')
      .setLabel('Rol VIP (1000 pts)')
      .setEmoji('👑')
      .setStyle(ButtonStyle.Success),
  );
}

// ─── Inicio ───────────────────────────────────────────────────────────────────

client.login(token);
