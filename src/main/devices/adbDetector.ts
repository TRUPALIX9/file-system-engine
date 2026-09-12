import { execFile } from "child_process";
import { promisify } from "util";
import type { AndroidProviderDescriptor, AndroidAuthorizationState, AndroidTransportState } from "@shared/types";
import { getAdbPath } from "./adbPath";

const execFileAsync = promisify(execFile);

export async function detectAndroidDevices(): Promise<AndroidProviderDescriptor[]> {
  try {
    const adbPath = await getAdbPath();
    const { stdout } = await execFileAsync(adbPath, ["devices", "-l"]);
    const lines = stdout.split('\n').map(line => line.trim()).filter(Boolean);
    
    // First line is usually "List of devices attached"
    const devices: AndroidProviderDescriptor[] = [];

    for (const line of lines) {
      if (line.startsWith('*') || line.startsWith('List of')) continue; 
      
      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;

      const [serial, state] = parts;
      
      // Parse additional info like model:SM_S928U1
      const modelMatch = line.match(/model:(\S+)/);
      const modelName = modelMatch ? modelMatch[1].replace(/_/g, ' ') : "Android Device";
      
      console.log(`[Android Detector] Found: ${serial} | Model: ${modelName} | Status: ${state}`);
      
      let transportState: AndroidTransportState = "unknown";
      let authorizationState: AndroidAuthorizationState = "unknown";
      
      if (state === 'device') {
        transportState = "device";
        authorizationState = "authorized";
      } else if (state === 'unauthorized') {
        transportState = "unauthorized";
        authorizationState = "unauthorized";
      } else if (state === 'offline') {
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
