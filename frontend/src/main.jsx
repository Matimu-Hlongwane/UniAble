import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/global.css";
import { SettingsProvider } from "./context/settingsContext/SettingsContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SettingsProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    </SettingsProvider>
  </React.StrictMode>
);
