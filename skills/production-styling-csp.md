# Skill: Production-Ready Styling & CSP

This skill covers the integration of Material UI (MUI) in Electron with strict Content Security Policies.

## 🎨 Material UI (MUI) Integration
- **CssBaseline**: Always include `<CssBaseline />` at the root of the app to normalize styles.
- **ThemeProvider**: Use a centralized theme object to manage Light/Dark mode transitions.
- **Zero-Conflict CSS**: Keep `app.css` extremely minimal. Let MUI handle the layout and styling to avoid CSS specificity wars.

## 🛡️ Content Security Policy (CSP)
Electron apps require a CSP to prevent XSS, but MUI (Emotion) needs to inject inline styles.

### Requirements:
- **`style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`**: Essential for MUI's dynamic styling and Google Font stylesheets.
- **`font-src 'self' data: https://fonts.gstatic.com`**: Required for the actual font files.
- **`default-src 'self'`**: Keep all other sources restricted to the local app package.

## 📏 Viewport Management
- Set `html`, `body`, and `#root` to `width: 100vw` and `height: 100vh`.
- Use `overflow: hidden` on the root body to prevent window-edge scrollbars.
- Use `Box` with `flexGrow: 1` and `overflow: auto` for the main content areas.
