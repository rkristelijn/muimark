"use client";

import { Box } from "@mui/material";
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { FileGrid } from "@/components/FileGrid";
import { DetailPanel } from "@/components/DetailPanel";
import { CreateDialog } from "@/components/CreateDialog";

export default function Home() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <Sidebar
        selectedFolder={selectedFolder}
        onSelectFolder={(id) => {
          setSelectedFolder(id);
          setSelectedFile(null);
        }}
      />
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedFolder && (
          <>
            <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
              <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
                <CreateDialog folderId={selectedFolder} />
              </Box>
              <FileGrid
                folderId={selectedFolder}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
              />
            </Box>
            {selectedFile && (
              <Box sx={{ flex: 1, overflow: "auto", minHeight: 0, borderTop: 1, borderColor: "divider" }}>
                <DetailPanel folderId={selectedFolder} fileId={selectedFile} />
              </Box>
            )}
          </>
        )}
        {!selectedFolder && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <Box sx={{ color: "text.secondary" }}>Select a folder from the sidebar</Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
