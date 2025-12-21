/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  importScripts: ['/custom-sw.js']
})

const nextConfig = {
  reactStrictMode: true,
}

module.exports = withPWA(nextConfig)
