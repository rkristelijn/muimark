"use client";

import { useState, type ReactNode } from "react";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
  Divider,
} from "@mui/material";
import {
  ChevronLeft,
  DarkMode,
  LightMode,
  Menu as MenuIcon,
  Search as SearchIcon,
  Warning,
  Build,
  BugReport,
  Science,
  MenuBook,
  Architecture,
  Dns,
  Cloud,
  Dashboard,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { useThemeMode } from "./ThemeContext";
import type { FolderDef } from "@/shared/lib/config";

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 56;

const iconMap: Record<string, React.ReactNode> = {
  warning: <Warning />,
  build: <Build />,
  bug_report: <BugReport />,
  science: <Science />,
  menu_book: <MenuBook />,
  architecture: <Architecture />,
  dns: <Dns />,
  cloud: <Cloud />,
  dashboard: <Dashboard />,
};

interface DashboardLayoutProps {
  children: ReactNode;
  selectedFolder: string | null;
  onSelectFolder: (id: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

export function DashboardLayout({
  children,
  selectedFolder,
  onSelectFolder,
  searchValue,
  onSearchChange,
}: DashboardLayoutProps) {
  const { mode, toggleTheme } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const currentWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const { data: folders } = useQuery<FolderDef[]>({
    queryKey: ["folders"],
    queryFn: () => fetch("/api/folders").then((r) => r.json()),
  });

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ justifyContent: collapsed ? "center" : "space-between" }}>
        {!collapsed && (
          <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>
            ITSM
          </Typography>
        )}
        <IconButton onClick={() => setCollapsed(!collapsed)} size="small">
          {collapsed ? <MenuIcon /> : <ChevronLeft />}
        </IconButton>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, overflow: "auto" }}>
        {folders?.map((folder) => (
          <Tooltip
            key={folder.id}
            title={collapsed ? folder.label : ""}
            placement="right"
          >
            <ListItemButton
              selected={selectedFolder === folder.id}
              onClick={() => {
                onSelectFolder(folder.id);
                setMobileOpen(false);
              }}
              sx={{
                minHeight: 44,
                justifyContent: collapsed ? "center" : "initial",
                px: collapsed ? 1 : 2.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: collapsed ? 0 : 2,
                  justifyContent: "center",
                }}
              >
                {iconMap[folder.icon] || <MenuBook />}
              </ListItemIcon>
              {!collapsed && <ListItemText primary={folder.label} />}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${currentWidth}px)` },
          ml: { sm: `${currentWidth}px` },
          transition: "width 225ms cubic-bezier(0.4, 0, 0.6, 1), margin 225ms cubic-bezier(0.4, 0, 0.6, 1)",
        }}
        elevation={1}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Search Bar */}
          <Box
            sx={(theme) => ({
              position: "relative",
              borderRadius: 1,
              backgroundColor: alpha(theme.palette.common.white, 0.15),
              "&:hover": {
                backgroundColor: alpha(theme.palette.common.white, 0.25),
              },
              mr: 2,
              ml: 0,
              width: "100%",
              maxWidth: 400,
            })}
          >
            <Box
              sx={{
                p: "0 12px",
                height: "100%",
                position: "absolute",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SearchIcon />
            </Box>
            <InputBase
              placeholder="Search files…"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              sx={{
                color: "inherit",
                width: "100%",
                "& .MuiInputBase-input": {
                  p: "8px 8px 8px 44px",
                  width: "100%",
                },
              }}
              inputProps={{ "aria-label": "search" }}
            />
          </Box>

          <Box sx={{ flex: 1 }} />

          {/* Theme Toggle */}
          <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <IconButton color="inherit" onClick={toggleTheme}>
              {mode === "dark" ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Sidebar - Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: DRAWER_WIDTH },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Sidebar - Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", sm: "block" },
          width: currentWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: currentWidth,
            transition: "width 225ms cubic-bezier(0.4, 0, 0.6, 1)",
            overflowX: "hidden",
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Toolbar /> {/* Spacer for fixed AppBar */}
        <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
