"use client";

import { Box, Typography } from "@mui/material";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/shared/ui";
import { FileGrid } from "@/features/folders";
import { DetailPanel } from "@/features/editor";
import { SearchResults } from "@/features/search";
import dynamic from "next/dynamic";

const MarkdownEditor = dynamic(() => import("@/features/editor/MarkdownEditor"), { ssr: false });

export default function Home() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  // Track which folder a search-selected file belongs to
  const [searchSelectedFolder, setSearchSelectedFolder] = useState<string | null>(null);
  const [searchSelectedFile, setSearchSelectedFile] = useState<string | null>(null);

  const handleSearchSelect = (folderId: string, fileId: string) => {
    setSearchSelectedFolder(folderId);
    setSearchSelectedFile(fileId);
  };

  const handleNavigate = (folderId: string, fileId: string) => {
    setSelectedFolder(folderId);
    setSelectedFile(fileId);
    setSearchValue("");
    setSearchSelectedFolder(null);
    setSearchSelectedFile(null);
  };

  const isSearching = searchValue.length >= 2;

  // When exiting search, clear search selection
  const handleFolderSelect = (id: string) => {
    setSelectedFolder(id);
    setSelectedFile(null);
    setSearchValue("");
    setSearchSelectedFolder(null);
    setSearchSelectedFile(null);
  };

  return (
    <DashboardLayout
      selectedFolder={selectedFolder}
      onSelectFolder={handleFolderSelect}
      onHome={() => {
        setSelectedFolder(null);
        setSelectedFile(null);
        setSearchValue("");
        setSearchSelectedFolder(null);
        setSearchSelectedFile(null);
      }}
      searchValue={searchValue}
      onSearchChange={(val) => {
        setSearchValue(val);
        if (val.length < 2) {
          setSearchSelectedFolder(null);
          setSearchSelectedFile(null);
        }
      }}
    >
      {/* Global search mode */}
      {isSearching && (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
            <SearchResults
              query={searchValue}
              onSelect={handleSearchSelect}
              selectedFile={searchSelectedFile}
            />
          </Box>
          {searchSelectedFolder && searchSelectedFile && (
            <Box
              sx={{
                flex: 1,
                overflow: "auto",
                minHeight: 0,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <DetailPanel
                key={`${searchSelectedFolder}/${searchSelectedFile}`}
                folderId={searchSelectedFolder}
                fileId={searchSelectedFile}
              />
            </Box>
          )}
        </Box>
      )}

      {/* Normal folder view */}
      {!isSearching && selectedFolder && (
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <Box sx={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
            <FileGrid
              folderId={selectedFolder}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              onNavigate={handleNavigate}
              onCreated={setSelectedFile}
              searchFilter=""
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

      {/* Empty state — show README */}
      {!isSearching && !selectedFolder && <WelcomeView />}
    </DashboardLayout>
  );
}

function WelcomeView() {
  const { data } = useQuery<{ content: string | null }>({
    queryKey: ["readme"],
    queryFn: () => fetch("/api/readme").then((r) => r.json()),
  });

  if (!data?.content) {
    return (
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
    );
  }

  return (
    <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
      <MarkdownEditor content={data.content} onChange={() => {}} />
    </Box>
  );
}
