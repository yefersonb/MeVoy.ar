// SOLO en desarrollo (localhost). En prod/hosting NO lo incluyas.
if (location.hostname === "localhost") {
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = "3a9ab3ee-e944-4822-8485-932f5fa9e1bc";
}

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./testRules";

// ⬇️ importa tu provider del contexto de usuario
import { UserProvider } from "./contexts/UserContext"; // si falla, probá: import UserProvider from "./contexts/UserContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <App />
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
