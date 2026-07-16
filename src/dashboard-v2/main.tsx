import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import ForgeDashboard from "./ForgeDashboard.js";
import "./styles.css";
import "./forge-workspace/styles.css";

const root = document.getElementById("root");

if (!root) throw new Error("Forge v0.2 preview root element was not found.");

createRoot(root).render(
  <StrictMode>
    <ForgeDashboard />
  </StrictMode>,
);
