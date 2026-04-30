import React from 'react';
import { CustomIcon } from './CustomIcon';
import { FileEntry } from '@shared/types';
import { useTheme } from '@mui/material';

interface FileEntryIconProps {
  entry: FileEntry;
  size?: number;
}

export const FileEntryIcon: React.FC<FileEntryIconProps> = ({ entry, size = 18 }) => {
  const theme = useTheme();

  if (entry.kind === 'directory') {
    return <CustomIcon name="folder" size={size} sx={{ color: theme.palette.primary.main }} />;
  }

  const name = entry.name.toLowerCase();
  
  if (name.endsWith('.pdf')) {
    return <CustomIcon name="pdf" size={size} sx={{ color: '#EF4444' }} />; // Red
  }
  
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) {
    return <CustomIcon name="ppt" size={size} sx={{ color: '#F97316' }} />; // Orange
  }
  
  if (name.endsWith('.doc') || name.endsWith('.docx')) {
    return <CustomIcon name="doc" size={size} sx={{ color: '#3B82F6' }} />; // Blue
  }
  
  if (name.endsWith('.txt')) {
    return <CustomIcon name="txt" size={size} sx={{ color: '#64748B' }} />; // Slate
  }

  return <CustomIcon name="file" size={size} sx={{ color: theme.palette.text.secondary }} />;
};
