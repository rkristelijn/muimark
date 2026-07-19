"use client";

import { Box, Button, Typography } from "@mui/material";
import { ErrorOutlined } from "@mui/icons-material";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
      <Typography variant="body2" color="text.secondary">
        {error.message}
      </Typography>
      <Button variant="outlined" onClick={reset}>
        Try again
      </Button>
    </Box>
  );
}
