'use client';

import { useState, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import Editor from '@monaco-editor/react';
import { useMermaidRender } from './useMermaidRender';
import { templates, type MermaidTemplate } from './templates';

export interface MermaidEditorProps {
  /** Initial mermaid code */
  initialCode?: string;
  /** Called when code changes */
  onChange?: (code: string) => void;
  /** Editor height (default: 100%) */
  height?: string | number;
}

export function MermaidEditor({
  initialCode,
  onChange,
  height = '100%',
}: MermaidEditorProps) {
  const [code, setCode] = useState(
    initialCode ?? templates[0]?.code ?? ''
  );
  const [templateAnchor, setTemplateAnchor] = useState<HTMLElement | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const { svg, error, isRendering } = useMermaidRender(code);

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      const newCode = value ?? '';
      setCode(newCode);
      onChange?.(newCode);
    },
    [onChange]
  );

  const handleTemplateSelect = useCallback(
    (template: MermaidTemplate) => {
      setCode(template.code);
      onChange?.(template.code);
      setTemplateAnchor(null);
    },
    [onChange]
  );

  const handleCopySvg = useCallback(async () => {
    if (svg) {
      await navigator.clipboard.writeText(svg);
    }
  }, [svg]);

  const handleDownloadSvg = useCallback(() => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, [svg]);

  const handleDownloadPng = useCallback(async () => {
    if (!svg || !previewRef.current) return;
    const svgElement = previewRef.current.querySelector('svg');
    if (!svgElement) return;

    const canvas = document.createElement('canvas');
    const rect = svgElement.getBoundingClientRect();
    const scale = 2; // 2x for retina
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'diagram.png';
      a.click();
    };
    img.src = url;
  }, [svg]);

  const handleCopyMarkdown = useCallback(async () => {
    const markdown = '```mermaid\n' + code + '\n```';
    await navigator.clipboard.writeText(markdown);
  }, [code]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height,
        gap: 1,
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1,
          py: 0.5,
          flexShrink: 0,
        }}
      >
        <Button
          size="small"
          variant="outlined"
          onClick={(e) => setTemplateAnchor(e.currentTarget)}
        >
          Templates
        </Button>
        <Menu
          anchorEl={templateAnchor}
          open={Boolean(templateAnchor)}
          onClose={() => setTemplateAnchor(null)}
        >
          {templates.map((t) => (
            <MenuItem key={t.id} onClick={() => handleTemplateSelect(t)}>
              <ListItemText primary={t.label} secondary={t.description} />
            </MenuItem>
          ))}
        </Menu>

        <Box sx={{ flex: 1 }} />

        {isRendering && <CircularProgress size={16} />}

        <ButtonGroup size="small" variant="outlined">
          <Tooltip title="Copy SVG">
            <IconButton size="small" onClick={handleCopySvg} disabled={!svg}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download SVG">
            <IconButton size="small" onClick={handleDownloadSvg} disabled={!svg}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download PNG">
            <IconButton size="small" onClick={handleDownloadPng} disabled={!svg}>
              <ImageIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy as Markdown">
            <IconButton size="small" onClick={handleCopyMarkdown}>
              <InsertDriveFileIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
      </Box>

      {/* Editor + Preview split */}
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          gap: 1,
          overflow: 'hidden',
          px: 1,
          pb: 1,
        }}
      >
        {/* Code Editor */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant="caption"
            sx={{ px: 1, py: 0.5, color: 'text.secondary', flexShrink: 0 }}
          >
            Code
          </Typography>
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Editor
              defaultLanguage="markdown"
              value={code}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                lineNumbers: 'on',
                wordWrap: 'on',
                fontSize: 13,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                renderWhitespace: 'selection',
                padding: { top: 8 },
              }}
            />
          </Box>
        </Paper>

        {/* Preview */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant="caption"
            sx={{ px: 1, py: 0.5, color: 'text.secondary', flexShrink: 0 }}
          >
            Preview
          </Typography>
          <Box
            ref={previewRef}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 2,
              overflow: 'auto',
              '& svg': {
                maxWidth: '100%',
                height: 'auto',
              },
            }}
          >
            {error ? (
              <Alert severity="error" sx={{ width: '100%', whiteSpace: 'pre-wrap' }}>
                {error}
              </Alert>
            ) : svg ? (
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <Typography color="text.secondary" variant="body2">
                Start typing to see preview...
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
