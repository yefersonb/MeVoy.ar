import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./appCheckDebug";           // ensures debug token is set before App is imported
import App from "./App";
import AdminWorkspace from "./components/admin/AdminWorkspace";
import AdminGuard from "./components/admin/AdminGuard";
import { UserProvider } from "./contexts/UserContext";
import { ToastProvider } from "./contexts/ToastContext";
import { UserCardProvider } from "./contexts/UserCardContext";
import { ThemeProvider } from "./contexts/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <UserProvider>
        <ToastProvider>
          <ThemeProvider>
            <UserCardProvider>
              <Routes>
                <Route path="/admin/*" element={<AdminGuard><AdminWorkspace /></AdminGuard>} />
                <Route path="/*" element={<App />} />
              </Routes>
            </UserCardProvider>
          </ThemeProvider>
        </ToastProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
