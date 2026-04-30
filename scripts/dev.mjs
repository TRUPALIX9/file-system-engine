import { spawn } from "node:child_process";
import { once } from "node:events";

const env = {
  ...process.env,
  NODE_ENV: "development",
  VITE_DEV_SERVER_URL: "http://127.0.0.1:5173"
};

const commands = [
  ["npm", ["run", "build:main"]],
  ["npm", ["run", "build:preload"]]
];

for (const [command, args] of commands) {
  const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  const [code] = await once(child, "exit");

  if (code !== 0) {
    process.exit(Number(code));
  }
}

const renderer = spawn("npm", ["run", "dev:renderer"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env
});

for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    const response = await fetch(env.VITE_DEV_SERVER_URL);

    if (response.ok) {
      break;
    }
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

const electron = spawn("npx", ["electron", "."], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env
});

const shutdown = () => {
  renderer.kill();
  electron.kill();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const [code] = await once(electron, "exit");
shutdown();
process.exit(Number(code ?? 0));
