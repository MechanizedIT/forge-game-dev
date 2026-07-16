import { useCallback, useEffect, useState } from "react";

function readHash(): string {
  const value = window.location.hash.replace(/^#/, "");
  return value.startsWith("/") ? value : "/forge";
}

export function useForgeRouter() {
  const [path, setPath] = useState(readHash);
  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, "", window.location.pathname + "#/forge");
    const update = () => setPath(readHash());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const navigate = useCallback((next: string, replace = false) => {
    const url = window.location.pathname + "#" + next;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    setPath(next);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);
  return { navigate, path };
}

export function routeParts(path: string): string[] {
  return path.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
}

