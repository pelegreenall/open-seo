import * as React from "react";

export type ThemePreference = "system" | "light" | "dark";

const LIGHT_THEME_NAME = "openseo";
const DARK_THEME_NAME = "openseo-dark";

const THEME_STORAGE_KEY = "theme-preference";
const THEME_CHANGE_EVENT = "theme-preference-change";

function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
    return "system";
  } catch {
    return "system";
  }
}

function writeThemePreference(themePreference: ThemePreference) {
  try {
    if (themePreference === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    }
  } catch {
    // localStorage can be unavailable in private browsing or strict browser modes.
  }
}

function resolveThemeName(themePreference: ThemePreference): string {
  if (themePreference === "light") return LIGHT_THEME_NAME;
  if (themePreference === "dark") return DARK_THEME_NAME;

  // "system" — resolve from OS preference
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return DARK_THEME_NAME;
  }
  return LIGHT_THEME_NAME;
}

function applyThemePreference(themePreference: ThemePreference) {
  if (typeof document === "undefined") {
    return;
  }

  const resolved = resolveThemeName(themePreference);
  document.documentElement.setAttribute("data-theme", resolved);

  if (resolved === DARK_THEME_NAME) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function subscribeToThemePreference(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleThemeChange = () => {
    onStoreChange();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== THEME_STORAGE_KEY) {
      return;
    }

    onStoreChange();
  };

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMediaChange = () => {
    // Re-apply when OS preference changes so "system" mode stays in sync
    applyThemePreference(readThemePreference());
    onStoreChange();
  };

  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  window.addEventListener("storage", handleStorage);
  mediaQuery.addEventListener("change", handleMediaChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.removeEventListener("storage", handleStorage);
    mediaQuery.removeEventListener("change", handleMediaChange);
  };
}

export function useThemePreference() {
  const themePreference = React.useSyncExternalStore<ThemePreference>(
    subscribeToThemePreference,
    readThemePreference,
    () => "system",
  );

  React.useEffect(() => {
    applyThemePreference(themePreference);
  }, [themePreference]);

  const setThemePreference = React.useCallback(
    (nextThemePreference: ThemePreference) => {
      writeThemePreference(nextThemePreference);
      applyThemePreference(nextThemePreference);
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    },
    [],
  );

  return { themePreference, setThemePreference };
}

// --- Design Preference ---
export type DesignPreference = "classic" | "premium";

const DESIGN_STORAGE_KEY = "design-preference";
const DESIGN_CHANGE_EVENT = "design-preference-change";

function readDesignPreference(): DesignPreference {
  if (typeof window === "undefined") {
    return "classic";
  }

  try {
    const stored = window.localStorage.getItem(DESIGN_STORAGE_KEY);
    if (stored === "premium") {
      return "premium";
    }
    return "classic";
  } catch {
    return "classic";
  }
}

function writeDesignPreference(designPreference: DesignPreference) {
  try {
    window.localStorage.setItem(DESIGN_STORAGE_KEY, designPreference);
  } catch {}
}

function applyDesignPreference(designPreference: DesignPreference) {
  if (typeof document === "undefined") {
    return;
  }

  if (designPreference === "premium") {
    document.documentElement.classList.add("theme-premium");
  } else {
    document.documentElement.classList.remove("theme-premium");
  }
}

function subscribeToDesignPreference(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleDesignChange = () => {
    onStoreChange();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== DESIGN_STORAGE_KEY) {
      return;
    }
    onStoreChange();
  };

  window.addEventListener(DESIGN_CHANGE_EVENT, handleDesignChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(DESIGN_CHANGE_EVENT, handleDesignChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useDesignPreference() {
  const designPreference = React.useSyncExternalStore<DesignPreference>(
    subscribeToDesignPreference,
    readDesignPreference,
    () => "classic",
  );

  React.useEffect(() => {
    applyDesignPreference(designPreference);
  }, [designPreference]);

  const setDesignPreference = React.useCallback(
    (nextDesignPreference: DesignPreference) => {
      writeDesignPreference(nextDesignPreference);
      applyDesignPreference(nextDesignPreference);
      window.dispatchEvent(new Event(DESIGN_CHANGE_EVENT));
    },
    [],
  );

  return { designPreference, setDesignPreference };
}

export const themePreferenceInitScript = `(() => {
  try {
    var p = window.localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var t;
    if (p === "light") t = ${JSON.stringify(LIGHT_THEME_NAME)};
    else if (p === "dark") t = ${JSON.stringify(DARK_THEME_NAME)};
    else t = window.matchMedia("(prefers-color-scheme: dark)").matches ? ${JSON.stringify(DARK_THEME_NAME)} : ${JSON.stringify(LIGHT_THEME_NAME)};
    document.documentElement.setAttribute("data-theme", t);
    if (t === ${JSON.stringify(DARK_THEME_NAME)}) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");

    var d = window.localStorage.getItem(${JSON.stringify(DESIGN_STORAGE_KEY)});
    if (d === "premium") document.documentElement.classList.add("theme-premium");
    else document.documentElement.classList.remove("theme-premium");
  } catch {
    document.documentElement.setAttribute("data-theme", ${JSON.stringify(LIGHT_THEME_NAME)});
  }
})();`;

