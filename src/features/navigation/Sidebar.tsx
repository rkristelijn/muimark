"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  Warning,
  Build,
  BugReport,
  Science,
  MenuBook,
  Architecture,
  Dns,
  Cloud,
} from "@mui/icons-material";
import type { FolderDef } from "@/shared/lib/config";

const DRAWER_WIDTH = 240;

const iconMap: Record<string, React.ReactNode> = {
  warning: <Warning />,
  build: <Build />,
  bug_report: <BugReport />,
  science: <Science />,
  menu_book: <MenuBook />,
  architecture: <Architecture />,
  dns: <Dns />,
  cloud: <Cloud />,
};

interface SidebarProps {
  selectedFolder: string | null;
  onSelectFolder: (id: string) => void;
}

export function Sidebar({ selectedFolder, onSelectFolder }: SidebarProps) {
  const { data: folders } = useQuery<FolderDef[]>({
    queryKey: ["folders"],
    queryFn: () => fetch("/api/folders").then((r) => r.json()),
  });

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
      }}
    >
      <Toolbar>
        <Typography variant="h6" noWrap>
          ITSM
        </Typography>
      </Toolbar>
      <List>
        {folders?.map((folder) => (
          <ListItemButton
            key={folder.id}
            selected={selectedFolder === folder.id}
            onClick={() => onSelectFolder(folder.id)}
          >
            <ListItemIcon>{iconMap[folder.icon] || <MenuBook />}</ListItemIcon>
            <ListItemText primary={folder.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
