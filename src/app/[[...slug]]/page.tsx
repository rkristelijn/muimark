"use client";

import { Box, Typography } from "@mui/material";
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/shared/ui";
import { FileGrid } from "@/features/folders";
import { DetailPanel } from "@/features/editor";
import { SearchResults } from "@/features/search";
import dynamic from "next/dynamic";

const MarkdownEditor = dynamic(() => import("@/features/editor/MarkdownEditor"), { ssr: false });

function parseUrl(): { folder: string | null; file: string | null } {
  if (typeof window === "undefined") return { folder: null, file: null };
  const parts = window.location.pathname.split("/").filter(Boolean);
  return {
    folder: parts[0] || null,
    file: parts[1] || null,
  };
}

export default function Home() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(() => parseUrl().folder);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [searchSelectedFolder, setSearchSelectedFolder] = useState<string | null>(null);
  const [searchSelectedFile, setSearchSelectedFile] = useState<string | null>(null);

  // On init: resolve file slug from URL to actual fileId
  useEffect(() => {
    const { folder, file } = parseUrl();
    if (folder && file) {
      // Try resolving as displayId first
      fetch(`/api/resolve?id=${encodeURIComponent(file)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.fileId) {
            setSelectedFile(data.fileId);
          } else {
            // Fallback: use as-is (it might be the actual fileId)
            setSelectedFile(file);
          }
        })
        .catch(() => setSelectedFile(file));
    } else if (folder) {
      // Auto-select first file
      fetch(`/api/folders/${folder}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.files?.length) {
            setSelectedFile(data.files[0].id);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Sync URL → state on popstate (back/forward)
  useEffect(() => {
    const handler = () => {
      const { folder, file } = parseUrl();
      setSelectedFolder(folder);
      setSelectedFile(file);
      setSearchValue("");
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  // Push URL when state changes (use displayId for clean URLs)
  const navigate = useCallback((folder: string | null, displayId: string | null) => {
    const path = folder ? (displayId ? `/${folder}/${displayId}` : `/${folder}`) : "/";
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
  }, []);

  const handleSelectFolder = (id: string) => {
    setSelectedFolder(id);
    setSelectedFile(null);
    setSearchValue("");
    setSearchSelectedFolder(null);
    setSearchSelectedFile(null);

    // Auto-select first file
    fetch(`/api/folders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.files?.length) {
          const first = data.files[0];
          setSelectedFile(first.id);
          navigate(id, first.displayId || first.id);
        } else {
          navigate(id, null);
        }
      })
      .catch(() => navigate(id, null));
  };

  const handleSelectFile = (fileId: string, displayId?: string) => {
    setSelectedFile(fileId);
    navigate(selectedFolder, displayId || fileId);
  };

  const handleNavigate = (folderId: string, fileId: string) => {
    setSelectedFolder(folderId);
    setSelectedFile(fileId);
    setSearchValue("");
    setSearchSelectedFolder(null);
    setSearchSelectedFile(null);
    // Resolve displayId for clean URL
    fetch(`/api/folders/${folderId}`)
      .then((r) => r.json())
      .then((data) => {
        const file = data.files?.find((f: { id: string }) => f.id === fileId);
        navigate(folderId, file?.displayId || fileId);
      })
      .catch(() => navigate(folderId, fileId));
  };

  const handleHome = () => {
    setSelectedFolder(null);
    setSelectedFile(null);
    setSearchValue("");
    setSearchSelectedFolder(null);
    setSearchSelectedFile(null);
    navigate(null, null);
  };

  const handleSearchSelect = (folderId: string, fileId: string) => {
    setSearchSelectedFolder(folderId);
    setSearchSelectedFile(fileId);
  };

  const handleEditorNavigate = useCallback((displayId: string) => {
    fetch(`/api/resolve?id=${encodeURIComponent(displayId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.folderId && data.fileId) {
          setSelectedFolder(data.folderId);
          setSelectedFile(data.fileId);
          setSearchValue("");
          navigate(data.folderId, displayId);
        }
      })
      .catch(() => {});
  }, [navigate]);

  const isSearching = searchValue.length >= 2;

  return (
    <DashboardLayout
      selectedFolder={selectedFolder}
      onSelectFolder={handleSelectFolder}
      onHome={handleHome}
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
                onNavigate={handleEditorNavigate}
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
              onSelectFile={handleSelectFile}
              onNavigate={handleNavigate}
              onCreated={handleSelectFile}
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
              <DetailPanel key={selectedFile} folderId={selectedFolder} fileId={selectedFile} onNavigate={handleEditorNavigate} />
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
