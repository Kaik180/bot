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
} from 'discord.js';

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('Error: La variable de entorno DISCORD_TOKEN no está definida.');
  process.exit(1);
}

// ─── Definición del comando slash /menu ───────────────────────────────────────

const commands = [
  new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Abre el menú principal del servidor')
    .toJSON(),
];

// ─── Registro del comando slash en Discord ────────────────────────────────────

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

// ─── Manejo de mensajes (comando !hola) ───────────────────────────────────────

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content === '!hola') {
    message.reply('¡Hola mundo!');
  }
});

// ─── Manejo de interacciones ──────────────────────────────────────────────────

client.on('interactionCreate', async (interaction) => {

  // ── Comando slash /menu ──────────────────────────────────────────────────
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

    const fila = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content: '**Menú Principal** — Selecciona una sección:',
      components: [fila],
    });
    return;
  }

  // ── Interacciones del menú desplegable ───────────────────────────────────
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
      const embed = new EmbedBuilder()
        .setTitle('🛒 Tienda del Servidor')
        .setDescription('Gasta tus **Puntos del Servidor** en estas acciones exclusivas.')
        .setColor(0x5865f2)
        .addFields(
          {
            name: '🔇 Muteo de broma (5 min)',
            value: 'Coste: **500 puntos**',
            inline: true,
          },
          {
            name: '👑 Rol VIP temporal (1 hora)',
            value: 'Coste: **1000 puntos**',
            inline: true,
          },
        )
        .setFooter({ text: 'Los puntos se obtienen participando en el servidor.' });

      const botonMuteo = new ButtonBuilder()
        .setCustomId('comprar_muteo')
        .setLabel('Comprar Muteo (500 pts)')
        .setEmoji('🔇')
        .setStyle(ButtonStyle.Primary);

      const botonVip = new ButtonBuilder()
        .setCustomId('comprar_vip')
        .setLabel('Comprar VIP (1000 pts)')
        .setEmoji('👑')
        .setStyle(ButtonStyle.Success);

      const filaBotones = new ActionRowBuilder().addComponents(botonMuteo, botonVip);

      await interaction.reply({
        embeds: [embed],
        components: [filaBotones],
      });
      return;
    }
  }

  // ── Interacciones de botones de compra ───────────────────────────────────
  if (interaction.isButton()) {
    if (interaction.customId === 'comprar_muteo' || interaction.customId === 'comprar_vip') {
      await interaction.reply({
        content: '⚠️ Intento de compra detectado. No tienes suficientes Puntos del Servidor para este artículo.',
        ephemeral: true,
      });
      return;
    }
  }
});

// ─── Inicio ───────────────────────────────────────────────────────────────────

client.login(token);
