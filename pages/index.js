import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Alert,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Grid,
  Paper
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TelegramIcon from '@mui/icons-material/Telegram';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);

  const fetchMessages = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch('/api/messages');
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages || []);
        setConnected(data.connected || false);
      } else {
        setError('Failed to fetch messages');
      }
    } catch (err) {
      setError('Error connecting to server: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await fetch('/api/fetch-messages', { method: 'POST' });
      await fetchMessages(true);
    } catch (err) {
      setError('Error refreshing messages: ' + err.message);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <TelegramIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Telegram Channel Reader
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: connected ? 'success.main' : 'error.main',
                mr: 1,
              }}
            />
            <Typography variant="caption">
              {connected ? 'Connected' : 'Disconnected'}
            </Typography>
          </Box>
          <IconButton
            color="inherit"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {!connected && !loading && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Not connected to Telegram. Please check your configuration and ensure authentication is complete.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No messages found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Make sure your Telegram bot token and channel ID are configured correctly.
            </Typography>
            <Button
              variant="contained"
              onClick={handleRefresh}
              sx={{ mt: 3 }}
              disabled={refreshing}
            >
              {refreshing ? <CircularProgress size={24} /> : 'Refresh Messages'}
            </Button>
          </Paper>
        ) : (
          <>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h4" component="h1">
                Channel Messages
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {messages.map((message) => (
                <Grid item xs={12} key={message.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(message.date).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {message.id}
                        </Typography>
                      </Box>
                      <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.text || '(No text content)'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>
    </>
  );
}

