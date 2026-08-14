import { Box, Card, CardContent, Typography } from "@mui/material";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
}

export function KpiCard({ title, value, subtitle, color, icon }: KpiCardProps) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent sx={{ textAlign: "center", py: 2 }}>
        {icon && <Box sx={{ color: color || "text.secondary", mb: 0.5 }}>{icon}</Box>}
        <Typography variant="h3" sx={{ color: color || "text.primary", fontWeight: 700 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
