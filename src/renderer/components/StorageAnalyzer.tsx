import React, { useState } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Fade, TextField, InputAdornment, IconButton } from '@mui/material';
import { MountedFilesystemDescriptor, StorageAnalysisResult, TreemapItem } from '@shared/types';
import { CustomIcon } from './CustomIcon';

interface StorageAnalyzerProps {
  providers: MountedFilesystemDescriptor[];
  isDark: boolean;
}

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
  const percentage = Math.max((item.sizeBytes / totalBytes) * 100, 0.1);
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

  const handleBrowse = async () => {
    const engine = (window as any).fileSystemEngine;
    if (engine?.app?.showOpenDialog) {
      const res = await engine.app.showOpenDialog({ properties: ['openDirectory'] });
      if (!res.canceled && res.filePaths.length > 0) {
        setTargetPath(res.filePaths[0]);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!targetPath) return;

    setAnalyzing(true);
    setResult(null);
    try {
      const engine = (window as any).fileSystemEngine;
      const matchedProvider = providers.find(p => targetPath.startsWith(p.mountPath) && p.id !== 'root');
      const providerId = matchedProvider ? matchedProvider.id : 'root';
      
      const res = await engine.storage.analyze({
        root: { providerId, path: targetPath },
        includeHidden: false,
        maxEntries: 1000,
        maxDepth: 5
      });
      setResult(res);
    } catch (e) {
      console.error("Analysis failed", e);
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
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              readOnly: true,
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
          disabled={!targetPath || analyzing}
          startIcon={analyzing ? <CircularProgress size={16} color="inherit" /> : <CustomIcon name="scans" size={16} />}
        >
          {analyzing ? 'Scanning...' : 'Analyze Storage'}
        </Button>
      </Paper>

      {result && (
        <Fade in>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Summary Header */}
            <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Size Scanned</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {formatBytes(result.totalBytes ?? 0)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Files</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{(result.fileCount ?? 0).toLocaleString()}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Directories</Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>{(result.directoryCount ?? 0).toLocaleString()}</Typography>
              </Box>
            </Box>

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
              {result.treemapItems?.length > 0 ? (
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
