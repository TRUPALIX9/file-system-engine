# Skill: UI Rendering Safety in React & Electron

This skill covers the patterns required to prevent "blank screens" and rendering crashes in the File System Engine UI.

## 🛡️ Null-Safe Rendering
Always assume data from the Electron main process may be missing or transitioning during an IPC call.

### Patterns:
- **Optional Chaining**: Use `listing?.entries` or `provider?.displayName`.
- **Default Fallbacks**: Use `(inventory?.knownFolders || [])` to ensure `.map()` never runs on a null object.
- **Provider Guards**: Before rendering breadcrumbs or file lists, verify that both the `listing` and the `selectedProvider` are present.

## 🔄 Async State Transitions
When moving between folders:
1.  Clear the previous selection (`setSelectedEntry(null)`).
2.  Handle IPC failures gracefully using a `try/catch` or by checking `result.ok`.
3.  Display a global error alert instead of allowing the component to fail silently.

## 📉 Pagination & Performance
- Always use `PAGE_SIZE` (default 40) to limit the number of DOM nodes rendered.
- Virtualize or paginate large directory listings to prevent UI lag.
