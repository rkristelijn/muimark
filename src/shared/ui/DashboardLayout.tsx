"use client";

import { useState, useEffect, type ReactNode } from "react";
import {
  AppBar,
  Box,
  Collapse,
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
  ExpandLess,
  ExpandMore,
  Folder,
  FolderOpen,
  LightMode,
  Menu as MenuIcon,
  Search as SearchIcon,
  Dashboard,
  Description,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { useThemeMode } from "./ThemeContext";
import type { TreeNode } from "@/shared/lib/config";

const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 56;

interface FoldersResponse {
  tree: TreeNode[];
}

interface DashboardLayoutProps {
  children: ReactNode;
  selectedFolder: string | null;
  onSelectFolder: (id: string) => void;
  onHome: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
}

/**
 * Recursive tree item component
 */
function TreeItem({
  node,
  depth,
  selectedFolder,
  collapsed,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedFolder: string | null;
  collapsed: boolean;
  onSelect: (path: string) => void;
}) {
  const encodedId = node.path.replace(/\//g, "--");
  const isSelected = selectedFolder === encodedId;
  const isAncestor = selectedFolder?.startsWith(encodedId + "--") ?? false;
  const [userToggled, setUserToggled] = useState<boolean | null>(null);

  // Open state: user override wins, otherwise auto-expand if selected/ancestor/top-level
  const open = userToggled !== null
    ? userToggled
    : (isSelected || isAncestor || depth === 0);

  const hasChildren = node.children.length > 0;

  const handleClick = () => {
    if (node.hasMarkdown) {
      onSelect(encodedId);
    }
    if (hasChildren) {
      setUserToggled(!open);
    }
  };

  if (collapsed) {
    // In collapsed mode, only show top-level as icons
    if (depth > 0) return null;
    return (
      <Tooltip title={node.name} placement="right">
        <ListItemButton
          selected={isSelected || selectedFolder?.startsWith(encodedId + "--")}
          onClick={handleClick}
          sx={{ minHeight: 40, justifyContent: "center", px: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 0, justifyContent: "center" }}>
            {node.hasMarkdown ? <Description fontSize="small" /> : <Folder fontSize="small" />}
          </ListItemIcon>
        </ListItemButton>
      </Tooltip>
    );
  }

  return (
    <>
      <ListItemButton
        selected={isSelected}
        onClick={handleClick}
        sx={{
          minHeight: 36,
          pl: 2 + depth * 1.5,
          pr: 1,
        }}
      >
        <ListItemIcon sx={{ minWidth: 28 }}>
          {hasChildren ? (
            open ? <FolderOpen fontSize="small" /> : <Folder fontSize="small" />
          ) : (
            <Description fontSize="small" />
          )}
        </ListItemIcon>
        <ListItemText
          primary={formatLabel(node.name)}
          slotProps={{
            primary: {
              variant: "body2",
              noWrap: true,
              sx: { fontWeight: isSelected ? 600 : 400 },
            },
          }}
        />
        {hasChildren && (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </Box>
        )}
      </ListItemButton>
      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedFolder={selectedFolder}
                collapsed={collapsed}
                onSelect={onSelect}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

function formatLabel(name: string): string {
  return name
    .replace(/[-_]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function DashboardLayout({
  children,
  selectedFolder,
  onSelectFolder,
  onHome,
  searchValue,
  onSearchChange,
}: DashboardLayoutProps) {
  const { mode, toggleTheme } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("muimark-sidebar-collapsed") === "true";
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("muimark-sidebar-collapsed", String(next));
      return next;
    });
  };

  const currentWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const { data } = useQuery<FoldersResponse>({
    queryKey: ["folders"],
    queryFn: () => fetch("/api/folders").then((r) => r.json()),
  });

  const { data: readmeData } = useQuery<{ title: string }>({
    queryKey: ["readme"],
    queryFn: () => fetch("/api/readme").then((r) => r.json()),
  });

  const projectTitle = readmeData?.title || "Muimark";

  // Update browser tab title
  useEffect(() => {
    document.title = projectTitle;
  }, [projectTitle]);

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ justifyContent: collapsed ? "center" : "space-between" }}>
        {!collapsed && (
          <Typography
            variant="h6"
            noWrap
            sx={{ fontWeight: 700, cursor: "pointer" }}
            onClick={onHome}
          >
            {projectTitle}
          </Typography>
        )}
        <IconButton onClick={toggleCollapsed} size="small">
          {collapsed ? <MenuIcon /> : <ChevronLeft />}
        </IconButton>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, overflow: "auto", py: 0.5 }}>
        <Tooltip title={collapsed ? "Home" : ""} placement="right">
          <ListItemButton
            selected={selectedFolder === null}
            onClick={() => {
              onHome();
              setMobileOpen(false);
            }}
            sx={{
              minHeight: 40,
              justifyContent: collapsed ? "center" : "initial",
              px: collapsed ? 1 : 2,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: collapsed ? 0 : 28,
                mr: collapsed ? 0 : 1,
                justifyContent: "center",
              }}
            >
              <Dashboard fontSize="small" />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Home" slotProps={{ primary: { variant: "body2" } }} />}
          </ListItemButton>
        </Tooltip>
        <Divider sx={{ my: 0.5 }} />
        {data?.tree?.map((node) => (
          <TreeItem
            key={node.path}
            node={node}
            depth={0}
            selectedFolder={selectedFolder}
            collapsed={collapsed}
            onSelect={(id) => {
              onSelectFolder(id);
              setMobileOpen(false);
            }}
          />
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
