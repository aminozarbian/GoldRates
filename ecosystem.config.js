// PM2 Ecosystem Configuration
module.exports = {
  apps: [{
    name: 'telegram-reader',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    // Automatically restart if memory usage exceeds 500MB
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};

