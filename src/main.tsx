import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { AuthGate } from "./app/AuthGate";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <AuthGate>{(auth) => <App {...auth} />}</AuthGate>
    </HashRouter>
  </StrictMode>,
);
