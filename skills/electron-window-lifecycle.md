# Skill: Electron Window Lifecycle Management

This skill covers how to prevent "Object has been destroyed" errors and manage window references correctly in the main process.

## 🪟 Stale Reference Prevention
In Electron, a JS object for a `BrowserWindow` can outlive the actual window.

### Patterns:
- **`isDestroyed()` Check**: Before calling `focus()`, `restore()`, or `show()`, always check `if (window && !window.isDestroyed())`.
- **Reference Nulling**: Set `window = null` when the `closed` event fires.
- **Re-creation Logic**: In `activate` (macOS) and `second-instance` handlers, check if the window is destroyed. If so, call the creation function again.

## 🏗️ Window Creation
- Use `show: false` initially.
- Only call `show()` on the `ready-to-show` event to prevent visual flickering.
- Store the window reference in a mutable variable (`let mainWindow`) to allow for re-instantiation.
