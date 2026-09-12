import { execFile } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";

const execFileAsync = promisify(execFile);

async function checkAndroid() {
  const adbPath = join(homedir(), "Library", "Android", "sdk", "platform-tools", "adb");
  
  console.log("------------------------------------------");
  console.log("   ANDROID DEVICE DIAGNOSTIC TOOL         ");
  console.log("------------------------------------------");
  
  if (!existsSync(adbPath)) {
    console.error(`ERROR: ADB not found at ${adbPath}`);
    return;
  }
  
  console.log(`Checking via: ${adbPath}`);
  
  try {
    const { stdout } = await execFileAsync(adbPath, ["devices", "-l"]);
    const lines = stdout.trim().split('\n');
    const devices = lines.slice(1).filter(l => l.trim().length > 0);
    
    if (devices.length === 0) {
      console.log("\nRESULT: ❌ No devices connected.");
      console.log("\nTROUBLESHOOTING TIPS:");
      console.log("1. Ensure USB cable is plugged in firmly.");
      console.log("2. Enable 'USB Debugging' in Phone Settings > Developer Options.");
      console.log("3. Change USB mode on phone to 'File Transfer' or 'MTP'.");
    } else {
      console.log(`\nRESULT: ✅ ${devices.length} device(s) found!`);
      devices.forEach((d, i) => console.log(`  [${i+1}] ${d}`));
      
      if (stdout.includes("unauthorized")) {
        console.log("\nWARNING: Device is UNAUTHORIZED.");
        console.log("Please check your phone screen and tap 'ALLOW' for USB debugging.");
      }
    }
  } catch (error) {
    console.error(`\nEXECUTION ERROR: ${error.message}`);
  }
  console.log("------------------------------------------");
}

checkAndroid();
