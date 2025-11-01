"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useState, useRef, useEffect } from "react";

interface ThemeToggleProps {
  collapsed?: boolean;
  position?: "sidebar" | "auth-page";
}

export default function ThemeToggle({
  collapsed = false,
  position = "sidebar",
}: ThemeToggleProps) {
  const { theme, setTheme, actualTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getThemeIcon = () => {
    if (theme === "system") {
      return <Monitor className="w-5 h-5 text-on-brand" />;
    }
    return actualTheme === "dark" ? (
      <Moon className="w-5 h-5 text-on-brand" />
    ) : (
      <Sun className="w-5 h-5 text-on-brand" />
    );
  };

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  if (collapsed) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`transition-colors ${
            position === "auth-page"
              ? "bg-card/80 backdrop-blur-sm shadow-sm hover:bg-card text-primary"
              : "p-3 hover:bg-brand-hover rounded"
          }`}
          title="Theme"
        >
          {getThemeIcon()}
        </button>

        {isOpen && (
          <div
            className={`absolute bg-card shadow-lg py-1 pl-4 min-w-[120px] z-[9999] ${
              position === "auth-page"
                ? "right-0 top-full mt-2"
                : "left-full top-0 ml-4"
            }`}
          >
            {themes.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => {
                    setTheme(t.value);
                    setIsOpen(false);
                  }}
                  className={`w-full py-2 text-left flex items-center gap-2 hover:bg-hover text-sm ${
                    theme === t.value
                      ? "!text-accent-text"
                      : "!text-primary"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-brand-hover transition-colors text-left"
      >
        {getThemeIcon()}
        <span className="text-sm text-on-brand">Theme</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-card shadow-lg w-full z-50">
          {themes.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                onClick={() => {
                  setTheme(t.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-hover text-sm ${
                  theme === t.value ? "!text-accent-text" : "!text-primary"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
