const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({limit:'10mb'}));

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

// ===== FILE STORAGE =====
const DB_FILE = path.join('/tmp', 'orders.json');

function readOrders() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch(e) {}
  return [];
}

function writeOrders(orders) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(orders), 'utf8');
  } catch(e) {
    console.error('Write error:', e);
  }
}

// ===== AUTH MIDDLEWARE =====
function auth(req, res, next) {
  if (req.headers['x-secret'] !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

client.once('ready', () => {
  console.log(`✅ KallStore Bot ready! Logged in as ${client.user.tag}`);
});

// ===== GET ALL ORDERS =====
app.get('/orders', auth, (req, res) => {
  const orders = readOrders();
  res.json(orders);
});

// ===== SAVE NEW ORDER =====
app.post('/save-order', auth, (req, res) => {
  const order = req.body;
  if (!order || !order.id) return res.status(400).json({ error: 'Invalid order' });

  const orders = readOrders();
  // Cek duplikat
  if (orders.find(o => o.id === order.id)) {
    return res.json({ success: true, message: 'Already exists' });
  }
  orders.unshift(order);
  writeOrders(orders);
  console.log(`📦 New order saved: #${order.id} - ${order.product?.name}`);
  res.json({ success: true });
});

// ===== UPDATE ORDER (approve/reject) =====
app.post('/update-order', auth, (req, res) => {
  const { id, data } = req.body;
  if (!id || !data) return res.status(400).json({ error: 'Invalid request' });

  const orders = readOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });

  orders[idx] = { ...orders[idx], ...data };
  writeOrders(orders);
  console.log(`✏️ Order updated: #${id} -> ${JSON.stringify(data)}`);
  res.json({ success: true });
});

// ===== HEALTH CHECK =====
app.get('/', (req, res) => res.json({ status: 'KallStore Bot running!' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

client.login(TOKEN);
