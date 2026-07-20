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
import { MenuBook } from "@mui/icons-material";
import type { FolderDef } from "@/shared/lib/config";

const DRAWER_WIDTH = 240;

interface SidebarProps {
  selectedFolder: string | null;
  onSelectFolder: (id: string) => void;
}

export function Sidebar({ selectedFolder, onSelectFolder }: SidebarProps) {
  const { data } = useQuery<{ folders: FolderDef[] }>({
    queryKey: ["folders"],
    queryFn: () => fetch("/api/folders").then((r) => r.json()),
  });

  const folders = data?.folders;

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
          Muimark
        </Typography>
      </Toolbar>
      <List>
        {folders?.map((folder) => (
          <ListItemButton
            key={folder.id}
            selected={selectedFolder === folder.id}
            onClick={() => onSelectFolder(folder.id)}
          >
            <ListItemIcon><MenuBook /></ListItemIcon>
            <ListItemText primary={folder.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
