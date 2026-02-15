# The Open-Lovable Builder 🚀

> **Build software at the speed of thought. Own the engine.**

The Open-Lovable Builder is an open-source, browser-based "Full-Stack IDE" designed to bridge the gap between AI code generation and visual manipulation. Unlike standard chat-bots, this project implements a **Visual-to-Code** engine that allows users to interact directly with the live preview, programmatically updating the underlying source code (AST) in real-time.

Running entirely in the browser using **WebContainers**, it eliminates server costs and keeps your code local and secure.

![Project Status](https://img.shields.io/badge/Status-Phase_3_Active-success)
![Tech Stack](https://img.shields.io/badge/Stack-React_|_Vite_|_WebContainers-blue)

---

## 🌟 The "Killer Feature": Visual-to-Code
Most AI builders are "Chat-Only." You ask for a change, wait 10 seconds, and hope it works.
We are building a **Bi-Directional Engine**:
1.  **X-Ray Overlay**: Hover over any element in the live preview to identify its component structure.
2.  **Click-to-Jump**: Click an element to instantly scroll the code editor to that exact line (AST-powered location).
3.  **Inspector Panel**: Edit Tailwind classes visually (e.g., change `bg-blue-500` to `bg-red-500`) and watch the source code rewrite itself instantly.

## 🛠️ Tech Stack
* **Core**: React + TypeScript + Vite
* **Runtime**: [WebContainers API](https://webcontainers.io/) (Node.js in the browser)
* **Editor**: Monaco Editor (VS Code core)
* **AST Engine**: Babel (Parser/Generator/Traverse) for safe code manipulation.
* **Styling**: Tailwind CSS

## ⚡ Getting Started

### Prerequisites
* Node.js 18+
* A modern browser (Chrome/Edge recommended for WebContainer support)

### Installation
1.  **Clone the repository**
    ```bash
    git clone [https://github.com/your-username/open-lovable-builder.git](https://github.com/your-username/open-lovable-builder.git)
    cd open-lovable-builder
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the Development Server**
    ```bash
    npm run dev
    ```
    *Open http://localhost:5173 to see the builder.*

### Deployment (Render/Vercel)
**Critical:** WebContainers require the site to be served in a "Secure Context" with specific COOP/COEP headers.
* We use a custom `server.js` (Express) to serve these headers in production.
* **Build Command:** `npm install && npm run build`
* **Start Command:** `npm start` (Runs `node server.js`)

## 🗺️ Roadmap & Vision

### ✅ Phase 1: The Foundation 
- [x] WebContainer integration (Boot React/Vite in browser).
- [x] Split-pane layout (Monaco Editor + Live Preview).
- [x] Bi-directional communication (iframe <-> host).

### 🚧 Phase 2: The Visual Engine
- [x] **The Scanner**: Hover overlay to highlight DOM elements.
- [x] **The Surgeon**: Click-to-locate code (AST traversal).
- [x] **The Inspector**: Visual panel to edit Tailwind classes.
- [ ] **Drag-and-Drop**: Resizing and moving elements via mouse interactions.

### 🔮 Phase 3: The Brain 
- [ ] **Google Jules Integration**: Connect the Chat Interface to a real LLM.
- [ ] **Context Awareness**: Feed the current file tree and AST to the AI for accurate edits.
- [ ] **File Management**: Create/Delete files and directories via the UI.

### 🚀 Phase 4: Production Ready
- [ ] **Supabase Integration**: One-click backend scaffolding.
- [ ] **Project Export**: Download as ZIP or push to GitHub.

## 📂 Architecture Overview

```mermaid
graph TD
    User[User] -->|Interacts| UI[Main UI (Host)]
    UI -->|Edits Code| Editor[Monaco Editor]
    UI -->|Mounts Files| WC[WebContainer (In-Browser Node)]
    
    subgraph "Visual Engine"
        Overlay[Preview Overlay] -->|Scans| Iframe[Preview Iframe]
        Iframe -->|PostMessage| Overlay
        Overlay -->|Selects Element| AST[AST Engine (Babel)]
        AST -->|Locates Line #| Editor
        Inspector[Inspector Panel] -->|Updates Props| AST
        AST -->|Writes Code| WC
    end
    
    WC -->|Serves App| Iframe
