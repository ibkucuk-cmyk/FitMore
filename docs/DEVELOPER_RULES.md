# Fitbit Classic - Developer Rules & Coding Standards

Welcome to the **Fitbit Classic** development team. To ensure this legacy-style web app remains exceptionally premium, lightning-fast, and secure, all contributors must strictly adhere to the rules outlined below.

---

## 1. Technical Stack Constraints
- **Core Structure**: Pure semantic HTML5 only. Do not introduce modern heavy frameworks (React, Angular, Vue) unless explicitly mandated in the architecture. Keep it lightweight.
- **Styling**: Vanilla CSS only. 
  - **Tailwind CSS**: STRICTLY PROHIBITED unless requested by the user.
  - **External Libraries**: Only use visual CDNs (e.g. FontAwesome for icons, Chart.js for data graphing).
- **Logic**: Vanilla ES6+ Javascript. Keep client-side operations clean, modular, and performant.

---

## 2. Directory Layout & Organization
All files must reside in their appropriate directories:
- `/` (Root): App entry points (`index.html`, `style.css`, `app.js`).
- `/docs/`: All architecture, business, and roadmap markdown files.
- `/assets/`: Local images, logos, or static media assets (if any).

---

## 3. CSS Coding Style
- **HSL Theming**: Use the established HSL/Hex variables defined in `:root`. Never write hardcoded hex or rgb values inside components.
- **BEM Naming**: Use clean, descriptive naming conventions (e.g. `.metric-card`, `.card-header`, `.btn-primary`).
- **Glassmorphism**: Use the standard layout variables:
  ```css
  background: var(--bg-dark-card);
  backdrop-filter: blur(16px);
  border: 1px solid var(--card-border);
  ```
- **Mobile First**: All structural modules must be fully responsive using CSS Flexbox or CSS Grid. Check breakpoints at `768px` and `480px`.

---

## 4. JS Coding Style & State Guard
- **State Integrity**: All application variables must be synchronized with the master `appState` object.
- **Data Persistence**: Always call `saveState()` (which writes to `localStorage`) after any mutation to steps, sleep, food, caffeine, water, or visible tiles.
- **Zero Framework Dependency**: Do not import helper packages (like Lodash or jQuery). Rely entirely on native browser web APIs.

---

## 5. Security & Privacy Rules
- **Direct Client Sync**: Fitbit OAuth access tokens must be stored exclusively inside the client's browser session or `localStorage`. 
- **Zero Third-Party Leaks**: Under no circumstances should personal health records (PHI) be sent to external tracking servers or third-party analytics. 
- **Privacy First**: Ensure the app is entirely ad-tracker free to match the "Anti-Google Health / Privacy-focused" market positioning.
