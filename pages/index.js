import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  Box,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  Grid,
  Button,
  Badge,
  Divider,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Diamond as DiamondIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import Image from 'next/image';
import goldRating from './pics/goldbar.png';

// Custom Price Card Component
const PriceSection = ({ title, time, buyPrice, sellPrice, buySub, sellSub, isHeader, showGeram }) => {
  return (
    <>
      <Card sx={{ mb: 2 }}>
        <Box sx={{ px: 2, py: 1 }}>
          {/* Header Row */}
          <Grid container spacing={2} dir="rtl">
            <Grid item sx={{px:0}} xs={4}>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" >
                    {title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', mt: 0.5 }}>
                    <AccessTimeIcon sx={{ fontSize: 14, color: 'red' }} />
                    <Box sx={{ px: 0.2 }} />
                    <Typography variant="caption" sx={{ mr: 0.5, color: 'red' }}>
                      {time}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Prices Row */}

            {/* Buy Section (Green) */}
            <Grid item xs={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{
                  bgcolor: '#10B981', // Green
                  color: 'white',
                  p: 1.5,
                  borderRadius: 2,
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                }}>
                  <Typography variant="caption">
                    {buyPrice || '---'}
                  </Typography>
                </Box>
                {showGeram && (
                  <Box sx={{
                    bgcolor: '#FDE047', // Yellow
                    p: 0.5,
                    borderRadius: 2,
                    textAlign: 'center',
                    border: '1px solid #FCD34D'
                  }}>
                    <Typography variant="caption">
                      گرم {buySub || '---'}
                    </Typography>
                  </Box>
                )}
                <Typography align="center" variant="body2" sx={{ fontWeight: 'bold', color: '#374151' }}>
                  بخرید
                </Typography>
              </Box>
            </Grid>

            {/* Sell Section (Red) */}
            <Grid item xs={4}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{
                  bgcolor: '#EF4444', // Red
                  color: 'white',
                  p: 1.5,
                  borderRadius: 2,
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)'
                }}>
                  <Typography variant="caption">
                    {sellPrice || '---'}
                  </Typography>
                </Box>
                {showGeram && (
                  <Box sx={{
                    bgcolor: '#FDE047', // Yellow
                    p: 0.5,
                    borderRadius: 2,
                    textAlign: 'center',
                    border: '1px solid #FCD34D'
                  }}>
                    <Typography variant="caption">
                      گرم {sellSub || '---'}
                    </Typography>
                  </Box>
                )}
                <Typography align="center" variant="body2" sx={{ fontWeight: 'bold', color: '#374151' }}>
                  بفروشید
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Card>
      <Divider />
    </>
  );
};

export default function Home() {
  const [sellMessage, setSellMessage] = useState(null);
  const [buyMessage, setBuyMessage] = useState(null);
  const [goldData, setGoldData] = useState(null);
  const [mtData, setMtData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [navValue, setNavValue] = useState(0); // Default to 'Market'

  const fetchMessages = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Add timestamp to query to prevent browser caching
      const response = await fetch(`/api/messages?t=${new Date().getTime()}`);
      const data = await response.json();

      if (data.success) {
        setSellMessage(data.sellMessage || null);
        setBuyMessage(data.buyMessage || null);
        setGoldData(data.goldData || null);
        setMtData(data.mtData || null);
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

  const [currentTime, setCurrentTime] = useState('');
  const [todayDate, setTodayDate] = useState('');

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 5000);

    // Initial time set
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));
      setTodayDate(now.toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' }));
    };
    updateTime();

    // Update time every minute
    const timeInterval = setInterval(updateTime, 60000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#F3F4F6',
      pb: 8,
      fontFamily: 'Iransans, Roboto, sans-serif' // Ensure font is applied
    }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{
        background: 'linear-gradient(to right, #0F2027, #203A43, #2C5364)', // Dark Blue Gradient
        pt: 1,
        pb: 1
      }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton size="small" sx={{ color: connected ? '#4ADE80' : '#EF4444' }}>
              <CheckCircleIcon />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              Gold Rating
            </Typography>
            <Image src={goldRating} alt="Gold Rating" width={32} height={32} />
          </Box>
          <IconButton sx={{ color: 'white' }}>
            <Badge color="error" variant="dot">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Connection Status (Hidden but useful for debugging if needed, or keep discrete) */}
      {!connected && (
        <Alert severity="warning" sx={{ mx: 2, mt: 2 }} action={
          <Button color="inherit" size="small" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <CircularProgress size={16} color="inherit" /> : 'RECONNECT'}
          </Button>
        }>
          Disconnected from Telegram Server
        </Alert>
      )}

      <Container maxWidth="sm" sx={{ mt: 2, px: 2 }}>
        {/* Action Buttons */}
        <Button
          fullWidth
          variant="contained"
          startIcon={<DiamondIcon />}
          sx={{
            mb: 2,
            bgcolor: '#FDE047',
            color: '#854D0E',
            borderRadius: 50,
            py: 1.5,
            fontWeight: 'bold',
            fontSize: '1rem',
            '&:hover': { bgcolor: '#FCD34D' },
            boxShadow: 'none'
          }}
        >
          اونس لحظه ای : {mtData?.broker_xau_usd?.bid || '-'} دلار
        </Button>





        {/* Abshodeh Iran (Melt Data) */}
        <PriceSection
          title="آبشده فردایی ایران"
          time={`امروز ${currentTime}`}
          buyPrice={goldData?.melt?.formattedSell}
          sellPrice={goldData?.melt?.formattedBuy} 
          buySub={goldData?.gram?.formattedSell}
          sellSub={goldData?.gram?.formattedBuy}
          showGeram={true}
        />

        {/* Dollar (Real Data) */}
        <PriceSection
          title="دلار تهران"
          time={`امروز ${currentTime}`}
          buyPrice={sellMessage ? (sellMessage.formattedNumber || sellMessage.number) : '---'}
          sellPrice={buyMessage ? (buyMessage.formattedNumber || buyMessage.number) : '---'}
          buySub="---"
          sellSub="---"
          showGeram={false}
        />
        {/* Global Price */}
        <PriceSection
          title="مظنه جهانی"
          time={`امروز ${currentTime}`}
          buyPrice={
            mtData?.broker_xau_usd?.bid && sellMessage?.number
              ? (mtData.broker_xau_usd.bid * sellMessage.number / 9.5726).toLocaleString('en-US', { maximumFractionDigits: 0 })
              : '-'
          } 
          sellPrice={
            mtData?.broker_xau_usd?.ask && buyMessage?.number
              ? (mtData.broker_xau_usd.ask * buyMessage.number / 9.5726).toLocaleString('en-US', { maximumFractionDigits: 0 })
              : '-'
          }
          buySub="---"
          sellSub="---"
          showGeram={false}
        />
      </Container>

      {/* Bottom Navigation */}

    </Box>
  );
}
