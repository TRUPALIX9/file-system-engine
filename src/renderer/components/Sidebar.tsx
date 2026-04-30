import React from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, Divider, IconButton
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Folder as FolderIcon,
  GridOn as SinglePaneIcon,
  Description as DocIcon
} from '@mui/icons-material';
import { DeviceInventory, MountedFilesystemDescriptor } from '@shared/types';
import { CustomIcon } from './CustomIcon';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: "Explorer" | "Operations" | "Settings" | "Analyze") => void;
  inventory: DeviceInventory | null;
  allDesktopProviders: MountedFilesystemDescriptor[];
  selectedProviderId: string | null;
  selectedProviderIdRight: string | null;
  isMac: boolean;
  pinnedFolders: Array<{ name: string, path: string, providerId: string }>;
  onSelectProvider: (p: MountedFilesystemDescriptor) => void;
  onBrowsePinned: (pin: { name: string, path: string, providerId: string }) => void;
  onRefresh: () => void;
  brandName: string;
  isDark: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  inventory,
  allDesktopProviders,
  selectedProviderId,
  selectedProviderIdRight,
  isMac,
  pinnedFolders,
  onSelectProvider,
  onBrowsePinned,
  onRefresh,
  brandName,
  isDark
}) => {
  const isSelected = (id: string) =>
    activeTab === "Explorer" && (selectedProviderId === id || selectedProviderIdRight === id);

  return (
    <Box sx={{
      width: 240,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid',
      borderColor: 'divider',
      bgcolor: 'background.paper'
    }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider', mb: 1 }}>
        <Box sx={{
          width: 32, height: 32,
          borderRadius: 1,
          bgcolor: '#0F172A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          overflow: 'hidden'
        }}>
          <img 
            src="logos/fse-app-icon-small.svg" 
            alt="Logo" 
            style={{ width: 22, height: 22, objectFit: 'contain' }} 
          />
        </Box>
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 900, fontSize: '0.8rem', lineHeight: 1, display: 'block', letterSpacing: -0.3 }}>
            File System Engine
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.disabled', lineHeight: 1 }}>
            v0.1.0-Stable
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
        <List subheader={<Typography variant="overline" sx={{ px: 2, fontWeight: 700, color: 'text.disabled' }}>System</Typography>}>
          {allDesktopProviders.filter(p => p.displayName === 'System' || p.id === 'root').map((p) => (
            <ListItem key={p.id} disablePadding>
              <ListItemButton
                selected={isSelected(p.id)}
                onClick={() => onSelectProvider(p)}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CustomIcon name="storage" />
                </ListItemIcon>
                <ListItemText primary={<Typography noWrap sx={{ fontSize: '0.85rem' }}>{p.displayName}</Typography>} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <List subheader={<Typography variant="overline" sx={{ px: 2, fontWeight: 700, color: 'text.disabled' }}>Quick Access</Typography>}>
          {allDesktopProviders.filter(p => ['Home', 'Desktop', 'Documents', 'Downloads'].includes(p.displayName)).map((p) => {
            let icon = <FolderIcon fontSize="small" />;
            if (p.displayName === 'Home') icon = <CustomIcon name="storage" />;
            if (p.displayName === 'Desktop') icon = <SinglePaneIcon fontSize="small" />;
            if (p.displayName === 'Downloads') icon = <CustomIcon name="storage" />;
            if (p.displayName === 'Documents') icon = <DocIcon fontSize="small" />;

            return (
              <ListItem key={p.id} disablePadding>
                <ListItemButton
                  selected={isSelected(p.id)}
                  onClick={() => onSelectProvider(p)}
                  sx={{ borderRadius: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
                  <ListItemText primary={<Typography noWrap sx={{ fontSize: '0.85rem' }}>{p.displayName}</Typography>} />
                </ListItemButton>
              </ListItem>
            );
          })}

          {pinnedFolders.map((pin) => (
            <ListItem key={`${pin.providerId}-${pin.path}`} disablePadding>
              <ListItemButton
                selected={activeTab === "Explorer" && (selectedProviderId === pin.providerId || selectedProviderIdRight === pin.providerId)}
                onClick={() => onBrowsePinned(pin)}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}><CustomIcon name="tag" /></ListItemIcon>
                <ListItemText primary={<Typography noWrap sx={{ fontSize: '0.85rem' }}>{pin.name}</Typography>} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <List subheader={
          <Box sx={{ px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.disabled' }}>Devices</Typography>
            <IconButton size="small" onClick={onRefresh} sx={{ color: 'text.disabled', '&:hover': { color: 'primary.main' } }}>
              <CustomIcon name="up" size={14} sx={{ transform: 'rotate(180deg)' }} />
            </IconButton>
          </Box>
        }>
          {[
            ...allDesktopProviders.filter(p => p.id !== 'root' && p.displayName !== 'System' && !['Home', 'Desktop', 'Documents', 'Downloads'].includes(p.displayName)),
            ...(inventory?.androidDevices || [])
          ].map((p: any) => (
            <ListItem key={p.id} disablePadding>
              <ListItemButton
                selected={isSelected(p.id)}
                onClick={() => onSelectProvider(p)}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {p.kind?.includes('android') ? <CustomIcon name="android" /> : <CustomIcon name="external-drive" />}
                </ListItemIcon>
                <ListItemText primary={<Typography noWrap sx={{ fontSize: '0.85rem' }}>{p.displayName || p.model || 'Unknown Device'}</Typography>} />
              </ListItemButton>
            </ListItem>
          ))}
          {(allDesktopProviders.filter(p => p.id !== 'root' && p.displayName !== 'System' && !['Home', 'Desktop', 'Documents', 'Downloads'].includes(p.displayName)).length === 0 && !inventory?.androidDevices?.length) && (
            <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.disabled', fontStyle: 'italic' }}>
              No devices connected
            </Typography>
          )}
        </List>
      </Box>

      <Box sx={{ p: 1 }}>
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton
            selected={activeTab === "Analyze"}
            onClick={() => setActiveTab("Analyze")}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}><CustomIcon name="treemap" /></ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Storage Analyzer</Typography>} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton
            selected={activeTab === "Operations"}
            onClick={() => setActiveTab("Operations")}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}><CustomIcon name="duplicates" /></ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Transfer Hub</Typography>} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            selected={activeTab === "Settings"}
            onClick={() => setActiveTab("Settings")}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}><SettingsIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary={<Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Settings</Typography>} />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );
};
