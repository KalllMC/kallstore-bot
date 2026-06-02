const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');

const app = express();
app.use(express.json());

// CORS — izinkan semua origin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-secret');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'kallstore2025';

client.once('ready', () => {
  console.log(`✅ KallStore Bot ready! Logged in as ${client.user.tag}`);
});

// Handle button APPROVE / REJECT
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const parts = interaction.customId.split('_');
  const action = parts[0];
  const orderId = parts[1];
  if (!orderId) return;

  if (action === 'approve') {
    const approvedEmbed = new EmbedBuilder()
      .setTitle('✅ PESANAN APPROVED!')
      .setColor(0x00e676)
      .addFields(
        { name: '🆔 Order ID', value: '`#' + orderId + '`', inline: true },
        { name: '👤 Di-approve oleh', value: interaction.user.username, inline: true },
        { name: '📦 Status', value: 'Link download sudah aktif untuk pembeli!', inline: false },
      )
      .setFooter({ text: 'KallStore · Brutal Legends' })
      .setTimestamp();

    await interaction.update({ embeds: [approvedEmbed], components: [] });

  } else if (action === 'reject') {
    const rejectedEmbed = new EmbedBuilder()
      .setTitle('❌ PESANAN DITOLAK!')
      .setColor(0xe74c3c)
      .addFields(
        { name: '🆔 Order ID', value: '`#' + orderId + '`', inline: true },
        { name: '👤 Di-reject oleh', value: interaction.user.username, inline: true },
        { name: '📦 Status', value: 'Pesanan telah ditolak.', inline: false },
      )
      .setFooter({ text: 'KallStore · Brutal Legends' })
      .setTimestamp();

    await interaction.update({ embeds: [rejectedEmbed], components: [] });
  }
});

// Endpoint: terima pesanan dari website
app.post('/order', async (req, res) => {
  const secret = req.headers['x-secret'];
  if (secret !== WEBHOOK_SECRET) return res.status(401).json({ error: 'Unauthorized' });

  const order = req.body;
  if (!order || !order.id) return res.status(400).json({ error: 'Invalid order' });

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    const pack = order.product?.name || '-';
    const price = 'Rp ' + (order.product?.price || 0).toLocaleString('id-ID');
    const name = order.buyer?.name || '-';
    const disc = order.buyer?.discord || '-';
    const wa = order.buyer?.wa || '-';

    // Embed detail pesanan
    const embed = new EmbedBuilder()
      .setTitle('🔔 PESANAN BARU MASUK!')
      .setColor(0xc9a227)
      .addFields(
        { name: '🛒 Pack', value: '**' + pack + '**', inline: true },
        { name: '💰 Harga', value: '**' + price + '**', inline: true },
        { name: '\u200b', value: '\u200b', inline: false },
        { name: '👤 Nama', value: name, inline: true },
        { name: '🎮 Discord', value: disc, inline: true },
        { name: '📱 WhatsApp', value: wa || '-', inline: true },
        { name: '🆔 Order ID', value: '`#' + order.id + '`', inline: false },
      )
      .setFooter({ text: 'KallStore · Brutal Legends' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    // Tombol approve/reject
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('approve_' + order.id)
        .setLabel('✅ APPROVE')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('reject_' + order.id)
        .setLabel('❌ REJECT')
        .setStyle(ButtonStyle.Danger)
    );

    const actionEmbed = new EmbedBuilder()
      .setTitle('⚡ Action untuk Order #' + order.id)
      .setColor(0x5865f2)
      .setDescription('**' + pack + '** — ' + price + '\nPembeli: ' + name)
      .setFooter({ text: 'Klik tombol untuk approve atau reject' });

    await channel.send({ embeds: [actionEmbed], components: [row] });

    res.json({ success: true });
  } catch (e) {
    console.error('Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Endpoint: approve dari admin panel website
app.post('/approve-from-site', async (req, res) => {
  const secret = req.headers['x-secret'];
  if (secret !== WEBHOOK_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const { orderId } = req.body;
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setTitle('✅ APPROVED dari Admin Panel!')
      .setColor(0x00e676)
      .addFields({ name: '🆔 Order ID', value: '`#' + orderId + '`', inline: true })
      .setTimestamp();
    await channel.send({ embeds: [embed] });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/', (req, res) => res.json({ status: 'KallStore Bot running!' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

client.login(TOKEN);
