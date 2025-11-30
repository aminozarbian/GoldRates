# Telegram Channel Reader

A Next.js application that reads messages from a Telegram channel using MTProto API and displays them on a web page using Material-UI.

## Features

- Reads messages from a Telegram channel in real-time using MTProto
- Beautiful Material-UI interface
- Auto-refresh every 30 seconds
- Manual refresh button
- Express.js backend API
- Next.js frontend
- Direct channel access (no bot required)

## Prerequisites

- Node.js (v14 or higher)
- Telegram API credentials (API ID and API Hash)
- A Telegram account
- Access to the Telegram channel you want to read

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Get Telegram API Credentials:**
   - Go to [https://my.telegram.org/apps](https://my.telegram.org/apps)
   - Log in with your phone number
   - Create a new application
   - Copy your `api_id` and `api_hash`

3. **Get your Channel Username:**
   - Open your Telegram channel
   - The username is the part after `@` (e.g., for `@mychannel`, use `mychannel`)
   - If your channel doesn't have a username, you'll need to use the channel ID (negative number)

4. **Configure environment variables:**
   - Copy `env.example` to `.env`
   - Fill in your credentials:

   ```env
   TELEGRAM_API_ID=your_api_id_here
   TELEGRAM_API_HASH=your_api_hash_here
   TELEGRAM_PHONE_NUMBER=+1234567890
   TELEGRAM_CHANNEL_USERNAME=your_channel_username
   TELEGRAM_SESSION_STRING=
   PORT=3000
   ```

5. **First-time Authentication:**
   - Run the development server: `npm run dev`
   - On first run, you'll be prompted to enter a verification code sent to your Telegram
   - After successful authentication, a session string will be displayed
   - Copy this session string and add it to your `.env` file as `TELEGRAM_SESSION_STRING`
   - This avoids re-authentication on subsequent runs

6. **Run the development server:**
   ```bash
   npm run dev
   ```

7. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Important Notes

- **First Authentication**: You'll need to enter a verification code on first run. This is sent to your Telegram account.
- **Session String**: Save the session string after first login to avoid re-authentication.
- **Channel Access**: You must be a member of the channel you want to read.
- **2FA**: If you have 2FA enabled, you may need to enter your password during authentication.
- **Rate Limits**: Telegram has rate limits. The app fetches messages every 30 seconds to avoid hitting limits.

## API Endpoints

- `GET /api/messages` - Get all stored messages
- `POST /api/fetch-messages` - Manually trigger a message fetch from Telegram

## Project Structure

```
.
├── server.js          # Express server with MTProto Telegram integration
├── pages/
│   ├── _app.js       # Next.js app wrapper with MUI theme
│   └── index.js      # Main page displaying messages
├── package.json
└── README.md
```

## Technologies Used

- Next.js - React framework
- Express.js - Node.js web server
- Material-UI (MUI) - React UI component library
- telegram (MTProto) - Telegram MTProto client library

## Troubleshooting

- **"Not authorized" error**: Make sure you've completed the first-time authentication and saved the session string.
- **"Channel not found"**: Verify the channel username is correct and you're a member of the channel.
- **Connection errors**: Check your internet connection and Telegram API credentials.
- **Session expired**: Re-authenticate by removing the `TELEGRAM_SESSION_STRING` from `.env` and running again.
