import Head from 'next/head';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '../styles/globals.css';

// Create RTL cache for Emotion so that MUI styles are flipped correctly
const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: {
      main: '#0088cc',
    },
    secondary: {
      main: '#f50057',
    },
  },
  typography: {
        fontFamily: "Iransans , Roboto",
    },
});

export default function App({ Component, pageProps }) {
  return (
    <CacheProvider value={cacheRtl}>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </CacheProvider>
  );
}

