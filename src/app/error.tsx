"use client";

import { useEffect } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ErrorOutlined } from "@mui/icons-material";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to server log (if browser logging enabled)
    if (process.env.NEXT_PUBLIC_BROWSER_LOGGING === "true") {
      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: "boundary",
          message: error.message,
          stack: error.stack,
          url: window.location.pathname,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
    // Always log to console
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: 2,
      }}
    >
      <ErrorOutlined sx={{ fontSize: 48, color: "error.main" }} />
      <Typography variant="h5" component="h2">
        Something went wrong
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500, textAlign: "center" }}>
        {error.message}
      </Typography>
      <Typography variant="caption" color="text.disabled">
        {window.location.pathname}
      </Typography>
      <Button variant="outlined" onClick={reset}>
        Try again
      </Button>
    </Box>
  );
}
