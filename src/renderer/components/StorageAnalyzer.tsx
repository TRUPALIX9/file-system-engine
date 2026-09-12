import React, { useState } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Fade, TextField, InputAdornment, Alert } from '@mui/material';
import { MountedFilesystemDescriptor, StorageAnalysisResult, TreemapItem } from '@shared/types';
import { CustomIcon } from './CustomIcon';

interface StorageAnalyzerProps {
  providers: MountedFilesystemDescriptor[];
  isDark: boolean;
}

// Largest scan the renderer asks for; the main process reports `truncated` when it stops early.
const MAX_SCAN_ENTRIES = 50000;

// Helper to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Basic squarify-like treemap renderer
const TreemapBlock: React.FC<{ item: TreemapItem, totalBytes: number }> = ({ item, totalBytes }) => {
  const percentage = totalBytes > 0 ? Math.max((item.sizeBytes / totalBytes) * 100, 0.1) : 0;
  return (
    <Box
      sx={{
        width: `${percentage}%`,
        height: '100%',
        bgcolor: item.color || 'primary.main',
        border: '1px solid rgba(0,0,0,0.2)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'opacity 0.2s',
        '&:hover': { opacity: 0.8 },
        display: 'flex',
        flexDirection: 'column',
        p: 0.5,
      }}
      title={`${item.label}\n${formatBytes(item.sizeBytes)}`}
    >
      {percentage > 2 && (
        <>
          <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: '0.65rem', lineHeight: 1 }} noWrap>
            {item.label}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.6rem', lineHeight: 1 }} noWrap>
            {formatBytes(item.sizeBytes)}
          </Typography>
        </>
      )}
    </Box>
  );
};

export const StorageAnalyzer: React.FC<StorageAnalyzerProps> = ({ providers, isDark }) => {
  const [targetPath, setTargetPath] = useState<string>(providers[0]?.mountPath || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<StorageAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBrowse = async () => {
    const engine = (window as any).fileSystemEngine;
    if (!engine?.app?.showOpenDialog) return;

    const res = await engine.app.showOpenDialog({ properties: ['openDirectory'], title: 'Choose a folder to analyze' });
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    if (!res.data.canceled && res.data.filePaths.length > 0) {
      setTargetPath(res.data.filePaths[0]);
    }
  };

  const handleAnalyze = async () => {
    const path = targetPath.trim();
    if (!path) return;

    setAnalyzing(true);
    setResult(null);
    setError(null);
    try {
      const engine = (window as any).fileSystemEngine;
      // Use the most specific provider that contains the path (Documents before Home before System).
      const matchedProvider = providers
        .filter(p => p.id !== 'root' && (path === p.mountPath || path.startsWith(p.mountPath.endsWith('/') || p.mountPath.endsWith('\\') ? p.mountPath : `${p.mountPath}/`) || path.startsWith(`${p.mountPath}\\`)))
        .sort((a, b) => b.mountPath.length - a.mountPath.length)[0];
      const providerId = matchedProvider ? matchedProvider.id : 'root';

      const res = await engine.storage.analyze({
        root: { providerId, providerKind: 'desktop-filesystem', path },
        includeHidden: false,
        maxEntries: MAX_SCAN_ENTRIES,
        maxDepth: 12
      });
      if (res.ok) {
        setResult(res.data);
      } else {
        setError(res.error.message);
      }
    } catch (e: any) {
      setError(e?.message || 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3, bgcolor: 'background.default', height: '100%', overflow: 'hidden' }}>
      <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <CustomIcon name="treemap" size={28} sx={{ color: 'primary.main' }} />
        Storage Analyzer
      </Typography>

      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', borderRadius: 2 }}>
        <TextField
          variant="outlined"
          size="small"
          fullWidth
          placeholder="Select a folder to analyze..."
          value={targetPath}
          onChange={(e) => setTargetPath(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleAnalyze(); }}
          sx={{ flex: 1 }}
          slotProps={{
            htmlInput: { 'aria-label': 'Folder to analyze' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <CustomIcon name="storage" size={16} />
                </InputAdornment>
              )
            }
          }}
        />
        <Button variant="outlined" onClick={handleBrowse}>
          Browse...
        </Button>
        <Button
          variant="contained"
          onClick={handleAnalyze}
          disabled={!targetPath.trim() || analyzing}
          startIcon={analyzing ? <CircularProgress size={16} color="inherit" /> : <CustomIcon name="scans" size={16} />}
        >
          {analyzing ? 'Scanning...' : 'Analyze Storage'}
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Fade in>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Summary Header */}
            <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Size Scanned</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {formatBytes(result.totalBytes)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Files</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{result.fileCount.toLocaleString()}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Directories</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{result.directoryCount.toLocaleString()}</Typography>
              </Box>
            </Box>

            {result.truncated && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Partial scan: stopped after {MAX_SCAN_ENTRIES.toLocaleString()} entries, so the totals cover only part of this folder.
              </Alert>
            )}

            {/* Treemap Visualization */}
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Visual Breakdown (Largest Items)</Typography>
            <Paper
              sx={{
                flex: 1,
                mb: 3,
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'stretch'
              }}
            >
              {result.treemapItems.length > 0 ? (
                result.treemapItems.map(item => (
                  <TreemapBlock key={item.id} item={item} totalBytes={result.totalBytes} />
                ))
              ) : (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled' }}>
                  No data to display
                </Box>
              )}
            </Paper>
          </Box>
        </Fade>
      )}
    </Box>
  );
};
