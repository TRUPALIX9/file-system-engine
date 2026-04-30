import { exec } from "child_process";
import { promisify } from "util";
import type { AndroidProviderDescriptor, AndroidAuthorizationState, AndroidTransportState } from "@shared/types";
import { getAdbPath } from "./adbPath";

const execAsync = promisify(exec);

export async function detectAndroidDevices(): Promise<AndroidProviderDescriptor[]> {
  try {
    const adbPath = await getAdbPath();
    const { stdout } = await execAsync(`${adbPath} devices -l`);
    const lines = stdout.split('\n').map(line => line.trim()).filter(Boolean);
    
    // First line is usually "List of devices attached"
    const devices: AndroidProviderDescriptor[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('*')) continue; // Daemon starting messages
      
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      
      const serial = parts[0];
      const stateStr = parts[1];
      
      let transportState: AndroidTransportState = "unknown";
      let authorizationState: AndroidAuthorizationState = "unknown";
      
      if (stateStr === 'device') {
        transportState = "device";
        authorizationState = "authorized";
      } else if (stateStr === 'unauthorized') {
        transportState = "unauthorized";
        authorizationState = "unauthorized";
      } else if (stateStr === 'offline') {
        transportState = "offline";
        authorizationState = "offline";
      }
      
      // Parse adb properties like model:Pixel_4 device:flame transport_id:1
      let model = "Android Device";
      let manufacturer = "Unknown"; // ADB usually doesn't give manufacturer easily without adb shell getprop
      
      for (const part of parts.slice(2)) {
        if (part.startsWith('model:')) {
          model = part.substring(6).replace(/_/g, ' ');
        }
      }
      
      devices.push({
        id: `adb-${serial}`,
        kind: "android-adb",
        serial,
        model,
        displayName: model,
        accessState: authorizationState === 'authorized' ? 'available' : 'unauthorized',
        transportState,
        authorizationState,
        platform: process.platform as any,
        lastSeenAt: new Date().toISOString(),
        capabilities: {
          canBrowse: authorizationState === 'authorized',
          canRead: authorizationState === 'authorized',
          canWrite: authorizationState === 'authorized',
          canRename: authorizationState === 'authorized',
          canDelete: authorizationState === 'authorized',
          canCreateFolder: authorizationState === 'authorized',
          canStreamPreview: false,
          canHashDirectly: false,
          canRunTextExtraction: false
        },
        warnings: authorizationState === 'unauthorized' ? [{
          code: "android-unauthorized",
          message: "Device unauthorized. Please allow USB debugging on the device."
        }] : [],
        roots: [
          {
            path: '/sdcard',
            label: 'Internal Storage',
            isPrimary: true,
            isWritable: true
          }
        ]
      });
    }
    
    return devices;
  } catch (error) {
    console.error("ADB detection failed. Is adb installed?", error);
    return [];
  }
}
