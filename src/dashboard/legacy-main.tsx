import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import LegacySampleApp from "./LegacySampleApp.js";
import "./styles.css";

const root = document.getElementById("root");

if (!root) throw new Error("Forge legacy sample root element was not found.");

createRoot(root).render(
  <StrictMode>
    <LegacySampleApp />
  </StrictMode>,
);
