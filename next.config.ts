import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  /**
   * Enable logging, for this you need to start with `npm run dev` as it is not shown in production builds. 
   * You can also enable logging for fetches and server functions separately.
   */
  logging: {
    fetches: {
      fullUrl: true,         // Shows the full URL of fetches in the console
      hmrRefreshes: true,    // Shows the fetches that are being reused
    },
    serverFunctions: true,   // Shows the name, arguments, and duration of Server Actions
    incomingRequests: true,  // Logs incoming requests in development
    browserToTerminal: true, // Forwards browser console logs to the terminal
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
