"use client";

import { Chip } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import type { FolderDef } from "@/shared/lib/config";

interface RelatedLinksProps {
  value: string;
  onNavigate: (folderId: string, fileId: string) => void;
}

interface FolderPatternMap {
  folderId: string;
  pattern: RegExp;
}

export function RelatedLinks({ value, onNavigate }: RelatedLinksProps) {
  // Load folder definitions to get idPatterns
  const { data: foldersData } = useQuery<{ folders: FolderDef[] }>({
    queryKey: ["folders"],
    queryFn: () => fetch("/api/folders").then((r) => r.json()),
  });
  const folders = foldersData?.folders;

  if (!folders || !value) return <span>{value}</span>;

  // Build pattern map from folder configs
  const patternMap: FolderPatternMap[] = folders
    .filter((f) => f.idPattern)
    .map((f) => ({
      folderId: f.id,
      pattern: new RegExp(f.idPattern!, "gi"),
    }));

  // Find all ID references in the value
  const parts: { text: string; isLink: boolean; folderId?: string; fileId?: string }[] = [];

  // Combine all patterns into one regex to find matches
  const allPatterns = folders
    .filter((f) => f.idPattern)
    .map((f) => f.idPattern!.replace(/^\^/, "").replace(/\$$/, ""))
    .join("|");

  if (!allPatterns) return <span>{value}</span>;

  const combinedRegex = new RegExp(`(${allPatterns})`, "gi");
  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(value)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({ text: value.slice(lastIndex, match.index), isLink: false });
    }

    // Determine which folder this ID belongs to
    const matchedId = match[0];
    let targetFolder: string | undefined;

    for (const pm of patternMap) {
      pm.pattern.lastIndex = 0;
      if (pm.pattern.test(matchedId)) {
        targetFolder = pm.folderId;
        break;
      }
    }

    if (targetFolder) {
      parts.push({
        text: matchedId.toUpperCase(),
        isLink: true,
        folderId: targetFolder,
        fileId: matchedId,
      });
    } else {
      parts.push({ text: matchedId, isLink: false });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < value.length) {
    parts.push({ text: value.slice(lastIndex), isLink: false });
  }

  // If no links found, return plain text
  if (!parts.some((p) => p.isLink)) {
    return <span>{value}</span>;
  }

  return (
    <span>
      {parts.map((part, i) =>
        part.isLink ? (
          <Chip
            key={i}
            label={part.text}
            size="small"
            color="primary"
            variant="outlined"
            clickable
            onClick={(e) => {
              e.stopPropagation();
              if (part.folderId && part.fileId) {
                // Resolve displayId to actual fileId via API
                fetch(`/api/resolve?id=${encodeURIComponent(part.fileId)}`)
                  .then((r) => r.json())
                  .then((data) => {
                    if (data.folderId && data.fileId) {
                      onNavigate(data.folderId, data.fileId);
                    }
                  })
                  .catch(() => {});
              }
            }}
            sx={{ mx: 0.25 }}
          />
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}
