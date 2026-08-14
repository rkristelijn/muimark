"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { MenuBook, GridOn } from "@mui/icons-material";
import type { FolderDef } from "@/shared/lib/config";
import { FolderActions } from "@/features/folders/FolderActions";

const DRAWER_WIDTH = 240;

interface SidebarProps {
  selectedFolder: string | null;
  onSelectFolder: (id: string) => void;
}

export function Sidebar({ selectedFolder, onSelectFolder }: SidebarProps) {
  const queryClient = useQueryClient();
  const { data } = useQuery<{ folders: FolderDef[] }>({
    queryKey: ["folders"],
    queryFn: () => fetch("/api/folders").then((r) => r.json()),
  });

  const folders = data?.folders;
  const selectedFolderDef = folders?.find((f) => f.id === selectedFolder);

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
        <Typography variant="h6" noWrap sx={{ flex: 1 }}>
          Muimark
        </Typography>
        <FolderActions
          folderId={selectedFolder || undefined}
          folderLabel={selectedFolderDef?.label}
          onFolderCreated={(id) => {
            queryClient.invalidateQueries({ queryKey: ["folders"] });
            onSelectFolder(id);
          }}
          onFolderDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ["folders"] });
            if (folders && folders.length > 1) {
              const remaining = folders.filter((f) => f.id !== selectedFolder);
              if (remaining[0]) onSelectFolder(remaining[0].id);
            }
          }}
          onFolderRenamed={(newId) => {
            queryClient.invalidateQueries({ queryKey: ["folders"] });
            onSelectFolder(newId);
          }}
        />
      </Toolbar>
      <List>
        {folders?.map((folder) => (
          <ListItemButton
            key={folder.id}
            selected={selectedFolder === folder.id}
            onClick={() => onSelectFolder(folder.id)}
          >
            <ListItemIcon>
              {folder.type === "csv" ? <GridOn /> : <MenuBook />}
            </ListItemIcon>
            <ListItemText primary={folder.label} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}
