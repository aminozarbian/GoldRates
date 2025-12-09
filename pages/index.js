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
  Paper,
  CardMedia,
  Divider
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import GoldBar  from './pics/goldbar.png';
import Image from 'next/image'

export default function Home() {
  const [sellMessage, setSellMessage] = useState(null);
  const [buyMessage, setBuyMessage] = useState(null);
  const [goldData, setGoldData] = useState(null);
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
        setSellMessage(data.sellMessage || null);
        setBuyMessage(data.buyMessage || null);
        setGoldData(data.goldData || null);
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
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: '#696D7D' }}>
        <Toolbar>
          <Image src={GoldBar} alt="Gold Icon" width={40} height={40} style={{ marginRight: '16px' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Gold Rates
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
        ) : !sellMessage && !buyMessage ? (
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
            <Box sx={{ mb: 3, textAlign:'center' }}>
              <Typography variant="h4" component="h1">
                انس جهانی:
              </Typography>
            </Box>
            <Divider></Divider>

            <Grid container spacing={3} sx={{mt:1}}>
              {/* Dollar Section */}
              <Grid item xs={12}>
                <Typography variant='h5' align="center" sx={{ mb: 2 }}>
                  دلار
                </Typography>
                <Grid container spacing={2}>
                   <Grid item xs={6}>
                      <Card variant='outlined' sx={{textAlign:'center', backgroundImage:'linear-gradient(to bottom left, #c0f6e9, #1dab95 )', borderRadius:'15px'}}>
                        <Typography variant='body1' sx={{my:2, color:'white'}}>
                          {buyMessage ? (buyMessage.formattedNumber || buyMessage.number || 'N/A') : 'N/A'} تومان
                        </Typography>
                      </Card>
                      <Card variant='outlined' sx={{textAlign:'center', backgroundColor:'#F7E396' , borderRadius:'15px' , mt:1}}>
                        <Typography variant='body1' sx={{my:1}}>
                          خرید
                        </Typography>
                      </Card>
                   </Grid>
                   <Grid item xs={6}>
                      <Card variant='outlined' sx={{textAlign:'center', backgroundImage:'linear-gradient(to bottom left, #f49c9c, #d32626 )' , borderRadius:'15px'}}>
                        <Typography variant='body1' sx={{my:2, color:'white'}}>
                          {sellMessage ? (sellMessage.formattedNumber || sellMessage.number || 'N/A') : 'N/A'} تومان
                        </Typography>
                      </Card>
                      <Card variant='outlined' sx={{textAlign:'center', backgroundColor:'#F7E396' , borderRadius:'15px' , mt:1}}>
                        <Typography variant='body1' sx={{my:1}}>
                          فروش
                        </Typography>
                      </Card>
                   </Grid>
                </Grid>
              </Grid>

              {/* Gold Melt (Abshodeh) Section */}
              {goldData && goldData.melt && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant='h5' align="center" sx={{ mb: 2 }}>
                  آبشده نقدی
                </Typography>
                <Grid container spacing={2}>
                   <Grid item xs={6}>
                      <Card variant='outlined' sx={{textAlign:'center', backgroundImage:'linear-gradient(to bottom left, #c0f6e9, #1dab95 )', borderRadius:'15px'}}>
                        <Typography variant='body1' sx={{my:2, color:'white'}}> 
                          {goldData.melt.formattedBuy || 'N/A'} تومان
                        </Typography>
                      </Card>
                      <Card variant='outlined' sx={{textAlign:'center', backgroundColor:'#F7E396' , borderRadius:'15px' , mt:1}}>
                        <Typography variant='body1' sx={{my:1}}>
                          خرید
                        </Typography>
                      </Card>
                   </Grid>
                   <Grid item xs={6}>
                      <Card variant='outlined' sx={{textAlign:'center', backgroundImage:'linear-gradient(to bottom left, #f49c9c, #d32626 )' , borderRadius:'15px'}}>
                        <Typography variant='body1' sx={{my:2, color:'white'}}>
                          {goldData.melt.formattedSell || 'N/A'} تومان
                        </Typography>
                      </Card>
                      <Card variant='outlined' sx={{textAlign:'center', backgroundColor:'#F7E396' , borderRadius:'15px' , mt:1}}>
                        <Typography variant='body1' sx={{my:1}}>
                          فروش
                        </Typography>
                      </Card>
                   </Grid>
                </Grid>
              </Grid>
              )}

              {/* Gold Gram Section */}
              {goldData && goldData.gram && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant='h5' align="center" sx={{ mb: 2 }}>
                  هر گرم
                </Typography>
                <Grid container spacing={2}>
                   <Grid item xs={6}>
                      <Card variant='outlined' sx={{textAlign:'center', backgroundImage:'linear-gradient(to bottom left, #c0f6e9, #1dab95 )', borderRadius:'15px'}}>
                        <Typography variant='body1' sx={{my:2, color:'white'}}>
                          {goldData.gram.formattedBuy || 'N/A'} تومان
                        </Typography>
                      </Card>
                      <Card variant='outlined' sx={{textAlign:'center', backgroundColor:'#F7E396' , borderRadius:'15px' , mt:1}}>
                        <Typography variant='body1' sx={{my:1}}>
                          خرید
                        </Typography>
                      </Card>
                   </Grid>
                   <Grid item xs={6}>
                      <Card variant='outlined' sx={{textAlign:'center', backgroundImage:'linear-gradient(to bottom left, #f49c9c, #d32626 )' , borderRadius:'15px'}}>
                        <Typography variant='body1' sx={{my:2, color:'white'}}>
                          {goldData.gram.formattedSell || 'N/A'} تومان
                        </Typography>
                      </Card>
                      <Card variant='outlined' sx={{textAlign:'center', backgroundColor:'#F7E396' , borderRadius:'15px' , mt:1}}>
                        <Typography variant='body1' sx={{my:1}}>
                          فروش
                        </Typography>
                      </Card>
                   </Grid>
                </Grid>
              </Grid>
              )}
            </Grid>
          </>   
  )}   </Container>  
  </>
)};
