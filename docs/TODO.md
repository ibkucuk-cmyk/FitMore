# Fitbit Classic - Project Roadmap & TODO List

This checklist tracks the engineering tasks required to launch **Fitbit Classic** in production.

---

## 🚀 Phase 1: Google Health API & Live Sync (Highest Priority)
- [ ] **Register Developer App**: Set up a developer project in the **Google Cloud Console** and enable the Google Health API.
- [ ] **Google OAuth 2.0 Integration**:
  - [ ] Add a "Connect Fitbit/Google Health" button in the navigation header.
  - [ ] Implement browser redirect logic using Google OAuth 2.0 Client-Side Implicit Flow.
  - [ ] Create redirect handler in `app.js` to parse, store (`localStorage`), and strip the Google `access_token` from URL hashes.
- [ ] **Hydrate State from Google Health API Endpoints**:
  - [ ] Map legacy metrics to Google Health API data type bundles.
  - [ ] Fetch Daily Steps, Burned Calories, and Distance from Google Health.
  - [ ] Fetch Sleep Summary & Sleep Stages details.
  - [ ] Fetch Logged Foods and logged workouts to automatically hydrate state.
  - [ ] Manage Google OAuth token expiration & re-consent prompts.


---

## 🎨 Phase 2: UI Modularity & Animation Polish
- [ ] **Drag & Drop Reordering**: Integrate simple vanilla drag-and-drop handles on dashboard tiles so users can easily sort their grid.
- [ ] **Vibrant Goal Celebrations**: Trigger SVG ring scaling and standard particle/confetti visual animations when steps or active minutes goals are achieved.
- [ ] **Theme Switcher**: Introduce a toggle for "True Legacy Light Mode" and "Premium Cyberpunk Dark Mode".

---

## 💎 Phase 3: Premium Legacy Pack & CSV Exports
- [ ] **CSV / PDF Data Exporters**: Integrate a utility download button to compile current browser state data into fully structured Excel CSV files.
- [ ] **Mood & Stress Score Visuals**: Create custom interactive SVG graph representations tracking EDA scores week-over-week.
- [ ] **Premium Upgrade Gateway**: Integrate a simple frontend payment screen using **Stripe Payment Links** to unlock Premium Lifetime access keys.

---

## 🌐 Phase 4: Production Deployment & Launch
- [ ] **Free Hosting Setup**: Deploy the production assets directly onto **Vercel** or **GitHub Pages**.
- [ ] **Open-Source Repository**: Create a public repository on GitHub showing the client-only structure.
- [ ] **Reddit Launch**: Publish a highly formatted release announcement detailing the "Zero AI Slop / 100% Free & Private" dashboard on `r/fitbit`.
