// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const next = require('next');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Telegram MTProto setup - Read from environment variables
const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
const API_HASH = process.env.TELEGRAM_API_HASH || '';
const PHONE_NUMBER = process.env.TELEGRAM_PHONE_NUMBER || '';
const SESSION_STRING = process.env.TELEGRAM_SESSION_STRING || '';
const CHANNEL_USERNAME = process.env.TELEGRAM_CHANNEL_USERNAME || '';

// Store messages in memory (in production, use a database)
let messages = [];
let client = null;
let isConnected = false;

// Initialize Telegram client
async function initializeTelegramClient() {
  if (!API_ID || !API_HASH) {
    console.log('Telegram API ID or API Hash not configured');
    return null;
  }

  const stringSession = new StringSession(SESSION_STRING);
  
  const tgClient = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  try {
    console.log('Connecting to Telegram...');
    await tgClient.connect();

    if (!await tgClient.checkAuthorization()) {
      console.log('Not authorized. Starting authentication...');
      
      if (!PHONE_NUMBER) {
        console.error('Phone number is required for first-time authentication');
        return null;
      }

      // Check if we're in production mode - interactive auth won't work
      if (process.env.NODE_ENV === 'production') {
        console.error('ERROR: Authentication required but no session string provided.');
        console.error('Please generate a session string locally first, then add it to TELEGRAM_SESSION_STRING in your .env file.');
        console.error('To generate session string:');
        console.error('  1. Run locally with npm run dev');
        console.error('  2. Complete authentication');
        console.error('  3. Copy the session string from console output');
        console.error('  4. Add it to your production .env file');
        return null;
      }

      // Interactive authentication (local development only)
      await tgClient.start({
        phoneNumber: async () => PHONE_NUMBER,
        password: async () => {
          const password = await input.text('Please enter your 2FA password (if enabled, otherwise press Enter): ');
          return password || undefined;
        },
        phoneCode: async () => {
          const code = await input.text('Please enter the code you received: ');
          console.log(code.replace(/\s/g, ""));
          
          return code.replace(/\s/g, "");
        },
        onError: (err) => console.error('Authentication error:', err),
      });

      // Save session string
      const sessionString = tgClient.session.save();
      console.log('\n=== IMPORTANT ===');
      console.log('Session string (save this to TELEGRAM_SESSION_STRING in .env):');
      console.log(sessionString);
      console.log('=================\n');
    }

    console.log('Successfully connected to Telegram!');
    isConnected = true;
    return tgClient;
  } catch (error) {
    console.error('Error initializing Telegram client:', error.message);
    
    // If we have a session string but it's invalid, try to re-authenticate
    if (SESSION_STRING && error.message.includes('AUTH')) {
      console.log('Session expired. Please update TELEGRAM_SESSION_STRING or re-authenticate.');
    }
    
    return null;
  }
}

// Function to fetch messages from Telegram channel
async function fetchTelegramMessages() {
  if (!client || !isConnected || !CHANNEL_USERNAME) {
    if (!CHANNEL_USERNAME) {
      console.log('Telegram channel username not configured');
    }
    return;
  }

  try {
    // Resolve the channel entity
    const entity = await client.getEntity(CHANNEL_USERNAME);
    
    // Get messages from the channel
    const result = await client.getMessages(entity, {
      limit: 100,
    });

    // Process messages
    const channelMessages = [];
    for (const message of result) {
      if (message.message) {
        channelMessages.push({
          id: message.id,
          text: message.message,
          date: message.date ? new Date(message.date * 1000).toISOString() : new Date().toISOString(),
          chatId: entity.id ? entity.id.toString() : '',
          chatTitle: entity.title || CHANNEL_USERNAME,
          views: message.views || 0,
          dateObj: message.date || Math.floor(Date.now() / 1000)
        });
      }
    }

    // Sort by date (newest first) and update messages array
    channelMessages.sort((a, b) => b.dateObj - a.dateObj);
    messages = channelMessages;
    
    console.log(`Fetched ${messages.length} message(s) from Telegram channel: ${CHANNEL_USERNAME}`);
  } catch (error) {
    console.error('Error fetching Telegram messages:', error.message);
    
    // If connection lost, try to reconnect
    if (error.message.includes('connection') || error.message.includes('timeout')) {
      isConnected = false;
      console.log('Attempting to reconnect...');
      client = await initializeTelegramClient();
    }
  }
}

// Initialize and start fetching messages
(async () => {
  client = await initializeTelegramClient();
  
  if (client && CHANNEL_USERNAME) {
    // Fetch messages on startup
    await fetchTelegramMessages();
    
    // Fetch messages every 30 seconds
    setInterval(fetchTelegramMessages, 30000);
  }
})();

app.prepare().then(() => {
  const server = express();
  server.use(express.json());

  // API endpoint to get messages
  server.get('/api/messages', (req, res) => {
    res.json({ messages, success: true, connected: isConnected });
  });

  // API endpoint to manually trigger message fetch
  server.post('/api/fetch-messages', async (req, res) => {
    if (!isConnected) {
      client = await initializeTelegramClient();
    }
    await fetchTelegramMessages();
    res.json({ messages, success: true, message: 'Messages fetched successfully', connected: isConnected });
  });

  // Handle all other requests with Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
