// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const next = require('next');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Telegram MTProto setup - Read from environment variables
const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
const API_HASH = process.env.TELEGRAM_API_HASH || '';
const PHONE_NUMBER = process.env.TELEGRAM_PHONE_NUMBER || '';
const SESSION_STRING = process.env.TELEGRAM_SESSION_STRING || '';
const CHANNEL_USERNAME = process.env.TELEGRAM_CHANNEL_USERNAME || '';
const GOLD_CHANNEL_USERNAME = process.env.TELEGRAM_GOLD_CHANNEL_USERNAME || '';

// Store messages in memory (in production, use a database)
let sellMessage = null;
let buyMessage = null;
let goldData = {
  melt: { sell: null, buy: null },
  gram: { sell: null, buy: null },
  updatedAt: null
};
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

// Helper to convert Persian/Arabic digits to English
function toEnglishDigits(str) {
  if (!str) return str;
  return str.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
            .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
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
      limit: 30,
    });

    // Get all messages with 'دلار فردایی تهران'
    const allDollarMessages = result.filter(
      msg => msg.message && 
             msg.message.includes('دلار فردایی تهران')
    );

    // Filter messages for both buy and sell
    // Buy messages can have "خرید" or "خــرید" (with dashes/separators)
    // Use regex to match variations with special characters between letters
    const buyMessages = allDollarMessages.filter(
      msg => {
        // Match "خرید" with optional special characters/dashes between letters
        // Pattern: خ followed by optional special chars, ر followed by optional special chars, ی followed by optional special chars, د
        return /خ[ـ\s\-_]*ر[ـ\s\-_]*ی[ـ\s\-_]*د/.test(msg.message) || 
               msg.message.includes('خرید') ||
               msg.message.includes('خريد'); // Different character encoding
      }
    );

    const sellMessages = allDollarMessages.filter(
      msg => msg.message.includes('فروش')
    );

    // Debug: Log message counts
    //console.log(`Found ${sellMessages.length} sell messages and ${buyMessages.length} buy messages`);
    
    // Debug: If no buy messages found, check what messages we have
    if (buyMessages.length === 0) {
      console.log(`Total messages with 'دلار فردایی تهران': ${allDollarMessages.length}`);
      if (allDollarMessages.length > 0) {
        console.log('Sample message text:', allDollarMessages[0].message?.substring(0, 200));
        // Log first 5 messages to see patterns
        console.log('\n--- First 5 messages with دلار فردایی تهران ---');
        allDollarMessages.slice(0, 5).forEach((msg, idx) => {
          console.log(`Message ${idx + 1}:`, msg.message?.substring(0, 300));
        });
        console.log('--- End of messages ---\n');
      }
    }

    // Helper function to process messages and find the latest one
    function processMessages(messages) {
      let latestMessage = null;
      let latestDate = 0;
      
      for (const msg of messages) {
        if (msg.message) {
          const dateObj = msg.date
            ? new Date(msg.date * 1000)
            : new Date();
          const dateTime = dateObj.getTime();

          if (dateTime > latestDate) {
            latestDate = dateTime;
            latestMessage = {
              id: msg.id,
              text: msg.message,
              date: dateObj.toISOString(),
              dateObj: dateTime,
              chatId: entity.id ? entity.id.toString() : '',
            };
          }
        }
      }

      // Extract number from message
      if (latestMessage) {
        // Try to find number before "خرید" or "فروش" first (format: "119,750 خــرید🔵")
        let numberMatch = null;
        
        // Check for number before buy keyword
        numberMatch = latestMessage.text.match(/(\d{1,3}(?:,\d{3})+)\s*[⏳\s]*خ[ـ\s\-_]*ر[ـ\s\-_]*ی[ـ\s\-_]*د/);
        if (!numberMatch) {
          numberMatch = latestMessage.text.match(/(\d{1,3}(?:,\d{3})+)\s*[⏳\s]*خرید/);
        }
        
        // Check for number before sell keyword
        if (!numberMatch) {
          numberMatch = latestMessage.text.match(/(\d{1,3}(?:,\d{3})+)\s*[⏳\s]*فروش/);
        }
        
        // Fallback: try to find any number with commas
        if (!numberMatch) {
          numberMatch = latestMessage.text.match(/(\d{1,3}(?:,\d{3})+)/); // Must have at least one comma
        }
        if (!numberMatch) {
          numberMatch = latestMessage.text.match(/(\d{1,3}(?:,\d{3})*)/); // Can have zero or more commas
        }
        if (!numberMatch) {
          numberMatch = latestMessage.text.match(/([\d,]+)/); // Any digits and commas
        }
        
        if (numberMatch && numberMatch[1]) {
          latestMessage.number = numberMatch[1].replace(/,/g, ''); // Remove commas for numeric value
          latestMessage.formattedNumber = numberMatch[1]; // Keep formatted version with commas
        } else {
          console.log('No number found in text:', latestMessage.text);
        }
      }
      
      return latestMessage;
    }

    // Helper function to extract price from a message for buy or sell
    function extractPriceFromMessage(msg, isBuy) {
      const dateObj = msg.date ? new Date(msg.date * 1000) : new Date();
      const dateTime = dateObj.getTime();
      
      if (isBuy) {
        // Try multiple patterns to find the number after "خرید" (with or without dashes)
        let buyMatch = msg.message.match(/خ[ـ\s\-_]*ر[ـ\s\-_]*ی[ـ\s\-_]*د[^\d]*(\d{1,3}(?:,\d{3})+)/);
        if (!buyMatch) {
          buyMatch = msg.message.match(/خرید[^\d]*(\d{1,3}(?:,\d{3})+)/);
        }
        if (!buyMatch) {
          buyMatch = msg.message.match(/خ[ـ\s\-_]*ر[ـ\s\-_]*ی[ـ\s\-_]*د[^\d]*(\d{1,3}(?:,\d{3})*)/);
        }
        if (!buyMatch) {
          buyMatch = msg.message.match(/خرید[^\d]*(\d{1,3}(?:,\d{3})*)/);
        }
        if (!buyMatch) {
          buyMatch = msg.message.match(/خ[ـ\s\-_]*ر[ـ\s\-_]*ی[ـ\s\-_]*د[^\d]*([\d,]+)/);
        }
        if (!buyMatch) {
          buyMatch = msg.message.match(/خرید[^\d]*([\d,]+)/);
        }
        // Also try number before buy keyword (with any characters/emojis in between)
        if (!buyMatch) {
          buyMatch = msg.message.match(/(\d{1,3}(?:,\d{3})+)[^\d]*خ[ـ\s\-_]*ر[ـ\s\-_]*ی[ـ\s\-_]*د/);
        }
        if (!buyMatch) {
          buyMatch = msg.message.match(/(\d{1,3}(?:,\d{3})+)[^\d]*خرید/);
        }
        
        if (buyMatch && buyMatch[1]) {
          return {
            id: msg.id,
            text: msg.message,
            date: dateObj.toISOString(),
            dateObj: dateTime,
            chatId: entity.id ? entity.id.toString() : '',
            number: buyMatch[1].replace(/,/g, ''),
            formattedNumber: buyMatch[1],
          };
        }
      } else {
        // Try to extract sell price
        let sellMatch = msg.message.match(/فروش[^\d]*(\d{1,3}(?:,\d{3})+)/);
        if (!sellMatch) {
          sellMatch = msg.message.match(/فروش[^\d]*(\d{1,3}(?:,\d{3})*)/);
        }
        if (!sellMatch) {
          sellMatch = msg.message.match(/فروش[^\d]*([\d,]+)/);
        }
        // Also try number before sell keyword (with any characters/emojis in between)
        if (!sellMatch) {
          sellMatch = msg.message.match(/(\d{1,3}(?:,\d{3})+)[^\d]*فروش/);
        }
        
        if (sellMatch && sellMatch[1]) {
          return {
            id: msg.id,
            text: msg.message,
            date: dateObj.toISOString(),
            dateObj: dateTime,
            chatId: entity.id ? entity.id.toString() : '',
            number: sellMatch[1].replace(/,/g, ''),
            formattedNumber: sellMatch[1],
          };
        }
      }
      return null;
    }

    // Collect all potential buy and sell messages (from both combined and separate)
    let allBuyCandidates = [];
    let allSellCandidates = [];
    
    // Process all messages to find buy and sell prices
    for (const msg of allDollarMessages) {
      const hasBuy = /خ[ـ\s\-_]*ر[ـ\s\-_]*ی[ـ\s\-_]*د/.test(msg.message) || 
                     msg.message.includes('خرید') ||
                     msg.message.includes('خريد');
      const hasSell = msg.message.includes('فروش');
      
      if (hasBuy) {
        const buyPrice = extractPriceFromMessage(msg, true);
        if (buyPrice) {
          allBuyCandidates.push(buyPrice);
        }
      }
      
      if (hasSell) {
        const sellPrice = extractPriceFromMessage(msg, false);
        if (sellPrice) {
          allSellCandidates.push(sellPrice);
        }
      }
    }
    
    // Find the latest buy message
    if (allBuyCandidates.length > 0) {
      const latestBuy = allBuyCandidates.reduce((latest, current) => {
        return (current.dateObj > latest.dateObj) ? current : latest;
      });
      
      if (!buyMessage || latestBuy.dateObj > buyMessage.dateObj) {
        buyMessage = latestBuy;
      }
    } else {
      console.log('No buy messages found');
    }
    
    // Find the latest sell message
    if (allSellCandidates.length > 0) {
      const latestSell = allSellCandidates.reduce((latest, current) => {
        return (current.dateObj > latest.dateObj) ? current : latest;
      });
      
      if (!sellMessage || latestSell.dateObj > sellMessage.dateObj) {
        sellMessage = latestSell;
      }
    } else {
      console.log('No sell messages found');
    }
    
    // console.log(`Fetched ${messages.length} message(s) from Telegram channel: ${CHANNEL_USERNAME}`);
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

// Function to fetch Gold messages
async function fetchGoldMessages() {
  if (!client || !isConnected || !GOLD_CHANNEL_USERNAME) {
    return;
  }

  try {
    const entity = await client.getEntity(GOLD_CHANNEL_USERNAME);
    const result = await client.getMessages(entity, { limit: 10 });

    const relevantMessages = result.filter(msg => 
      msg.message && (
        msg.message.includes('آبشده نقدی فردا') ||
        msg.message.includes('آبشده نقدی')
      )
    );

    if (relevantMessages.length > 0) {
      // Find latest message
      let latestMsg = relevantMessages.reduce((latest, current) => {
        return (current.date > latest.date) ? current : latest;
      });

      if (latestMsg) {
          const text = toEnglishDigits(latestMsg.message);
          const dateObj = new Date(latestMsg.date * 1000);
          
          // Split by "هرگرم" or "هر گرم" to separate Melt and Gram sections
          // Normalize text slightly for splitting
          const normalizedText = text.replace(/هر\s*گرم/g, 'SPLIT_HERE_GRAM');
          const parts = normalizedText.split('SPLIT_HERE_GRAM');
          
          let meltPart = parts[0]; // "Melt" section is usually first
          let gramPart = parts[1] || ''; // "Gram" section is usually second

          // If only one part and it contains specific keywords, try to identify which part it is
          if (!gramPart && meltPart) {
              if (meltPart.includes('گرم') && !meltPart.includes('ابشده')) {
                  // It might be just the gram part
                  gramPart = meltPart;
                  meltPart = '';
              }
          }

          let meltSell = null;
          let meltBuy = null;
          let gramSell = null;
          let gramBuy = null;

          // Helper to extract buy/sell
          const extractBuySell = (textPart) => {
              const sellMatch = textPart.match(/فروش\s*:\s*([\d,]+)/);
              const buyMatch = textPart.match(/خرید\s*:\s*([\d,]+)/);
              
              // console.log('Extracting from part:', textPart.substring(0, 50) + '...');
              // console.log('Buy match:', buyMatch ? buyMatch[1] : 'null');
              // console.log('Sell match:', sellMatch ? sellMatch[1] : 'null');

              return {
                  sell: sellMatch ? sellMatch[1] : null,
                  buy: buyMatch ? buyMatch[1] : null
              };
          };

          if (meltPart) {
             const result = extractBuySell(meltPart);
             meltSell = result.sell;
             meltBuy = result.buy;
          }

          if (gramPart) {
             const result = extractBuySell(gramPart);
             gramSell = result.sell;
             gramBuy = result.buy;
          }
          
          if (meltSell || meltBuy || gramSell || gramBuy) {
              goldData = {
                  melt: { 
                      sell: meltSell ? meltSell.replace(/,/g, '') : null, 
                      buy: meltBuy ? meltBuy.replace(/,/g, '') : null,
                      formattedSell: meltSell,
                      formattedBuy: meltBuy
                  },
                  gram: { 
                      sell: gramSell ? gramSell.replace(/,/g, '') : null, 
                      buy: gramBuy ? gramBuy.replace(/,/g, '') : null,
                      formattedSell: gramSell,
                      formattedBuy: gramBuy
                  },
                  updatedAt: dateObj.toISOString(),
                  messageId: latestMsg.id
              };
              // Only log if something changed? For now log always on update to verify.
              // console.log(`Updated Gold data: Melt(S:${goldData.melt.formattedSell}, B:${goldData.melt.formattedBuy})`);
          }
      }
    }
  } catch (error) {
    console.error('Error fetching Gold messages:', error.message);
  }
}

// Helper to get MT5 Gold Price
function getMtGoldPrice() {
  try {
    const dataPath = path.join(__dirname, 'data', 'mt_prices.json');
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(fileContent);
    }
  } catch (error) {
    console.error('Error reading MT gold price:', error.message);
  }
  return null;
}

// Initialize and start fetching messages
(async () => {
  client = await initializeTelegramClient();
  
  if (client) {
    if (CHANNEL_USERNAME) {
        await fetchTelegramMessages();
    }
    if (GOLD_CHANNEL_USERNAME) {
        await fetchGoldMessages();
    }
    
    // Fetch messages every 5 seconds
    setInterval(async () => {
        if (CHANNEL_USERNAME) await fetchTelegramMessages();
        if (GOLD_CHANNEL_USERNAME) await fetchGoldMessages();
    }, 5000);
  }
})();

app.prepare().then(() => {
  const server = express();
  server.use(express.json());

  // API endpoint to get messages
  server.get('/api/messages', (req, res) => {
    // Add strong no-cache headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store'); // For CDNs

    const mtData = getMtGoldPrice();
    res.json({ 
      sellMessage, 
      buyMessage, 
      goldData,
      mtData,
      success: true, 
      connected: isConnected 
    });
  });

  // API endpoint to manually trigger message fetch
  server.post('/api/fetch-messages', async (req, res) => {
    if (!isConnected) {
      client = await initializeTelegramClient();
    }
    if (CHANNEL_USERNAME) await fetchTelegramMessages();
    if (GOLD_CHANNEL_USERNAME) await fetchGoldMessages();
    
    const mtData = getMtGoldPrice();

    res.json({ 
      sellMessage, 
      buyMessage, 
      goldData,
      mtData,
      success: true, 
      messageInfo: 'Messages fetched successfully', 
      connected: isConnected 
    });
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
