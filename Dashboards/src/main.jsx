import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AccessibilityProvider } from "./hooks/useAccessibilityProfile.jsx";
import { SessionProvider } from "./auth/SessionContext.jsx";
import "./styles/tokens.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AccessibilityProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  </React.StrictMode>
);
