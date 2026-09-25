# A2UI (Agent-to-UI) v0.9.1 — Automotive Digital Showroom & Test Drive Booking Demo

An interactive reference web application showcasing the open-source **[A2UI (Agent-to-User Interface) v0.9.1 specification](https://a2ui.org/specification/v0.9.1-a2ui/)** ([github.com/google/A2UI](https://github.com/google/A2UI)) in an enterprise automotive e-commerce scenario (**Apex Mobility — "Aria" Digital Showroom Assistant**).

---

## ✨ Key A2UI Capabilities Demonstrated

1. **Declarative JSON UI Envelopes (`createSurface`, `updateComponents`, `updateDataModel`)**:
   * The AI assistant (**Aria**) responds with both conversational text and structured A2UI v0.9.1 JSON envelopes—rendering interactive vehicle comparison cards, dynamic test-drive booking forms, and digital wallet passes without executing arbitrary LLM-generated HTML/JS.
2. **Official Open-Source `@a2ui/web_core` & `@a2ui/lit` Runtime**:
   * Built exclusively against the public npm packages `@a2ui/web_core` (`0.9.2`) and `@a2ui/lit` (`0.9.3`).
   * Includes a live toggle (**`🔬 Inspect Stock <a2ui-surface> Web Component`**) on every surface so you can switch on the fly between the **Apex Mobility Branded Component Catalog** and the **raw unstyled `<a2ui-surface>` Lit Web Component** from `@a2ui/lit`.
3. **Two-Way Data Binding (`sendDataModel: true` & JSON Pointers)**:
   * Every user interaction in the form (selecting trims, choosing dealerships, dragging the duration slider, typing contact details) updates the client-side `a2uiClientDataModel` via JSON Pointers (`/booking/dealerId`, `/driver/email`, etc.) and automatically attaches state context to the next conversational turn.
4. **In-Place Conversational UI Mutation (Turn 3)**:
   * When the user asks in chat to change the vehicle, dealership, and slot duration, the agent emits a lightweight `updateDataModel` JSON patch that mutates the mounted form in-place—preserving the user's already-typed name, email, and phone number.
5. **Slide-In "Behind the Curtains" Architecture Inspector**:
   * By default, the app opens in a clean, distraction-free Customer View.
   * Click **`⚡ Show "Behind the Curtains" ◀`** in the top header (or the right-edge pull tab) to slide in the live A2UI Inspector showing the 4-stage pipeline, live `a2uiClientDataModel` JSON state, interactive component tree spotlighting, and raw JSONL envelopes.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
* **Node.js** `>= 18` and `npm`
* **Python 3** (or any static HTTP server)

### 1. Install Public Dependencies & Rebuild the A2UI SDK Bundle
*(Note: A pre-built `a2ui_public_sdk.js` is already included for convenience, so you can also jump straight to Step 2.)*

```bash
npm install
npm run build
```

### 2. Start the Local Web Server
```bash
npm start
```
Then open **`http://localhost:8090`** in your browser.

---

## 📁 Repository Structure

```text
├── index.html                  # Main application layout (Customer Chat + Slide-in A2UI Inspector)
├── styles.css                  # Enterprise Cobalt Navy & Electric Cyan design system
├── app.js                      # 4-Turn conversational storyboard & A2UI surface orchestration
├── a2ui_public_sdk.js          # Browser bundle of public @a2ui/web_core/v0_9 & @a2ui/lit/v0_9
├── scripts/
│   └── bundle-a2ui-sdk.js      # Esbuild bundler script using public npm @a2ui packages
├── assets/                     # Unbadged generic commercial studio vehicle renders
│   ├── aero_gt_ev.jpg
│   ├── urban_crossover_ev.jpg
│   ├── horizon_suv_phev.jpg
│   └── touring_estate_phev.jpg
└── package.json                # Public npm dependencies (@a2ui/web_core, @a2ui/lit, esbuild)
```

## 📚 References
* **Official A2UI v0.9.1 Specification**: [https://a2ui.org/specification/v0.9.1-a2ui/](https://a2ui.org/specification/v0.9.1-a2ui/)
* **Official A2UI Open-Source Repository**: [https://github.com/google/A2UI](https://github.com/google/A2UI)
