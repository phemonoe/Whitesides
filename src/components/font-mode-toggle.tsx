"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "paper-reader-font-mode";
const BODY_CLASS = "font-forgetica";

const getSavedFontMode = () =>
  typeof window !== "undefined" &&
  window.localStorage.getItem(STORAGE_KEY) === "forgetica";

export function FontModeToggle() {
  const [isReady, setIsReady] = useState(false);
  const [isForgetica, setIsForgetica] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsForgetica(getSavedFontMode());
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    document.body.classList.toggle(BODY_CLASS, isForgetica);
    window.localStorage.setItem(STORAGE_KEY, isForgetica ? "forgetica" : "default");
  }, [isForgetica, isReady]);

  useEffect(() => {
    return () => {
      document.body.classList.remove(BODY_CLASS);
    };
  }, []);

  return (
    <button
      type="button"
      className={`font-mode-toggle${isForgetica ? " is-active" : ""}`}
      aria-label="Toggle Sans Forgetica font"
      aria-pressed={isReady && isForgetica}
      suppressHydrationWarning
      title="Toggle Sans Forgetica font"
      onClick={() => {
        setIsReady(true);
        setIsForgetica((current) => !current);
      }}
    >
      SF
    </button>
  );
}
