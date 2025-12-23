import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Card,
  Box,
  Button,
  AppBar,
  Toolbar,
  Alert
} from '@mui/material';
import Image from 'next/image';
import goldRating from '../public/goldbar.png';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already logged in
    setLoading(false);
  }, []);

  const handleLogin = async () => {
    setError(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (data.success) {
        // Cookie is set by server
        router.replace('/dashboard');
      } else {
        if (data.error == 'Invalid credentials') {
          setError('نام کاربری یا رمز عبور اشتباه است');
        } else if (data.error == 'User is already logged in on another device. Please wait or contact support.') {
          setError('کاربر در حال حاضر در سامانه وارد شده است. لطفا منتظر بمانید یا با پشتیبانی تماس بگیرید.');
        } else{
          setError(data.error);
        }
      }
    } catch (err) {
      setError('خطا در برقراری ارتباط');
    }
  };

  if (loading) return null; // Avoid flash of login content

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#F3F4F6',
      pb: 8,
      fontFamily: 'Iransans, Roboto, sans-serif'
    }}>
      <AppBar position="static" elevation={0} sx={{
        background: 'linear-gradient(to right, #0F2027, #203A43, #2C5364)',
        pt: 1,
        pb: 1
      }}>
        <Toolbar sx={{ justifyContent: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
              ورود به سامانه
            </Typography>
            <Image src={goldRating} alt="Gold Rating" width={32} height={32} />
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xs" sx={{ mt: 8, px: 2 }}>
        <Card sx={{ p: 3, bgcolor: 'white', borderRadius: 2, boxShadow: 3 }}>
          <Typography variant="h5" align="center" gutterBottom sx={{ mb: 3, fontWeight: 'bold', color: '#374151' }}>
            لطفا وارد شوید
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box>
                <Typography variant="body2" sx={{ mb: 0.5, color: '#4B5563' }}>نام کاربری</Typography>
                <input
                  type="text"
                  placeholder="نام کاربری خود را وارد کنید"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ 
                    fontFamily: 'Iransans, Roboto, sans-serif',
                    width: '100%',
                    padding: '12px', 
                    borderRadius: '6px', 
                    border: '1px solid #D1D5DB',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    textAlign: 'right',
                    direction: 'rtl'
                  }}
                />
            </Box>
            
            <Box>
                <Typography variant="body2" sx={{ mb: 0.5, color: '#4B5563', }}>رمز عبور</Typography>
                <input
                  type="password"
                  placeholder="رمز عبور خود را وارد کنید"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ 
                    fontFamily: 'Iransans, Roboto, sans-serif',
                    width: '100%',
                    padding: '12px', 
                    borderRadius: '6px', 
                    border: '1px solid #D1D5DB',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    textAlign: 'right',
                    direction: 'rtl'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLogin();
                  }}
                />
            </Box>

            <Button 
                variant="contained" 
                onClick={handleLogin}
                size="large"
                sx={{ 
                    mt: 1,
                    bgcolor: '#2C5364',
                    '&:hover': { bgcolor: '#203A43' },
                    fontFamily: 'Iransans, Roboto, sans-serif'
                }}
            >
              ورود
            </Button>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}
