import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

const hideInitialLoader = () => {
  const loader = document.getElementById("initial-loader");
  if (loader) {
    loader.style.opacity = "0";
    loader.style.transition = "opacity 0.3s ease-out";
    setTimeout(() => loader.remove(), 300);
  }
};

createRoot(document.getElementById("root")!).render(<App />);
hideInitialLoader();
