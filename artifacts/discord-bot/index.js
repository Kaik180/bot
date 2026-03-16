import { Client, GatewayIntentBits } from 'discord.js';

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error('Error: La variable de entorno DISCORD_TOKEN no está definida.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once('clientReady', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.content === '!hola') {
    message.reply('¡Hola mundo!');
  }
});

client.login(token);
