import { Box, Typography } from "@mui/material";
import Link from "next/link";
import { SearchOff } from "@mui/icons-material";

export default function NotFound() {
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
      <SearchOff sx={{ fontSize: 48, color: "text.secondary" }} />
      <Typography variant="h5" component="h2">
        Page not found
      </Typography>
      <Typography variant="body2" color="text.secondary">
        The page you are looking for does not exist.
      </Typography>
      <Link href="/">Back to home</Link>
    </Box>
  );
}
