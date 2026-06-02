const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');

const app = express();
app.use(express.json());

// CORS
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
const SITE_URL = process.env.SITE_URL || 'https://kalllstore.netlify.app';

client.once('ready', () => {
  console.log(`✅ KallStore Bot ready! Logged in as ${client.user.tag}`);
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

    // Tombol — link langsung ke admin panel
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('⚙️ Buka Admin Panel')
        .setStyle(ButtonStyle.Link)
        .setURL(SITE_URL),
    );

    const actionEmbed = new EmbedBuilder()
      .setTitle('⚡ Ada pesanan baru dari ' + name)
      .setColor(0x5865f2)
      .setDescription(
        '**' + pack + '** — ' + price + '\n\n' +
        '> Klik tombol di bawah untuk buka Admin Panel\n' +
        '> Login → cari Order `#' + order.id + '` → klik **✓ APPROVE**\n\n' +
        '📸 Bukti TF bisa dilihat di Admin Panel website'
      )
      .setFooter({ text: 'Login: adminkal / kalstore123' });

    await channel.send({ embeds: [embed] });
    await channel.send({ embeds: [actionEmbed], components: [row] });

    res.json({ success: true });
  } catch (e) {
    console.error('Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Endpoint: notif approve dari website
app.post('/approve-from-site', async (req, res) => {
  const secret = req.headers['x-secret'];
  if (secret !== WEBHOOK_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  const { orderId } = req.body;
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setTitle('✅ PESANAN APPROVED!')
      .setColor(0x00e676)
      .setDescription('Order `#' + orderId + '` telah di-approve dari Admin Panel.\nLink download sudah aktif untuk pembeli!')
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
