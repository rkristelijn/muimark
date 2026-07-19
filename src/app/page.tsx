"use client";

import { Box, Typography } from "@mui/material";
import { useState } from "react";
import { DashboardLayout } from "@/shared/ui";
import { FileGrid } from "@/features/folders";
import { DetailPanel } from "@/features/editor";
import { CreateDialog } from "@/features/folders";

export default function Home() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");

  return (
    <DashboardLayout
      selectedFolder={selectedFolder}
      onSelectFolder={(id) => {
        setSelectedFolder(id);
        setSelectedFile(null);
      }}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
    >
      {selectedFolder && (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
            <CreateDialog folderId={selectedFolder} onCreated={setSelectedFile} />
          </Box>
          <Box sx={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
            <FileGrid
              folderId={selectedFolder}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              searchFilter={searchValue}
            />
          </Box>
          {selectedFile && (
            <Box
              sx={{
                flex: 1,
                overflow: "auto",
                minHeight: 0,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <DetailPanel key={selectedFile} folderId={selectedFolder} fileId={selectedFile} />
            </Box>
          )}
        </Box>
      )}
      {!selectedFolder && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <Typography color="text.secondary">
            Select a folder from the sidebar
          </Typography>
        </Box>
      )}
    </DashboardLayout>
  );
}
