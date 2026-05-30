"use client";
import { useId, useRef } from "react";

export type TabItem = { id: string; label: string; count?: number };

/**
 * Accessible tab bar implementing the WAI-ARIA tabs pattern: role="tablist",
 * roving arrow-key navigation, and aria-controls/aria-selected wiring. Render
 * the matching panel with <TabPanel> for progressive disclosure of dense pages.
 */
export function Tabs({
  tabs,
  active,
  onChange,
  className = "",
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const baseId = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    const tab = tabs[next];
    onChange(tab.id);
    refs.current[tab.id]?.focus();
  }

  return (
    <div role="tablist" aria-label="Secties" className={`flex gap-1 border-b border-slate-200 ${className}`}>
      {tabs.map((tab, i) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => { refs.current[tab.id] = el; }}
            role="tab"
            id={`${baseId}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-t ${
              selected
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span className={`ml-2 text-xs rounded-full px-1.5 py-0.5 ${selected ? "bg-primary-100 text-primary-700" : "bg-slate-100 text-slate-500"}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Pair with <Tabs>; uses the same base id scheme is not required — pass ids explicitly. */
export function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: boolean;
  children: React.ReactNode;
}) {
  if (!active) return null;
  return (
    <div role="tabpanel" aria-labelledby={`tab-${id}`} id={`panel-${id}`} tabIndex={0} className="focus:outline-none">
      {children}
    </div>
  );
}
