"use client";

import { useState } from "react";
import { Check, FileText, Folder, Home, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const PALETTE = [
  { id: "cream", label: "Cream", hex: "#F4EFE6" },
  { id: "terracotta", label: "Terracotta", hex: "#C4784A" },
  { id: "forest", label: "Forest green", hex: "#2D4A3E" },
  { id: "sage", label: "Sage", hex: "#7D9A78" },
  { id: "porcelain", label: "Porcelain", hex: "#FFFDF9" },
] as const;

const TEMPLATES = [
  {
    id: "minimalist-invoice",
    name: "Minimalist Invoice",
    kind: "Invoice",
    studio: "Studio North",
    client: "Hearth Goods",
    heading: "Invoice",
    lines: [
      ["Visual identity system", "1", "$2,400"],
      ["Logo suite", "1", "$1,200"],
      ["Brand guidelines", "1", "$850"],
    ],
    total: "$4,450",
  },
  {
    id: "creative-proposal",
    name: "Creative Proposal",
    kind: "Proposal",
    studio: "Hearthside Co",
    client: "Northlight",
    heading: "Creative Proposal",
    lines: [
      ["Discovery & direction", "—", "Incl."],
      ["Campaign system", "1", "$3,200"],
      ["Launch kit", "1", "$900"],
    ],
    total: "$4,100",
  },
  {
    id: "studio-billing",
    name: "Studio Billing",
    kind: "Invoice",
    studio: "Studio North",
    client: "Hearth Goods",
    heading: "Billing",
    lines: [
      ["Monthly retainer", "12", "$1,500"],
      ["Async art direction", "1", "$200"],
      ["Rush weekend hours", "2", "$250"],
    ],
    total: "$1,950",
  },
  {
    id: "brand-identity-proposal",
    name: "Brand Identity Proposal",
    kind: "Proposal",
    studio: "IF Studio",
    client: "Hearth Goods",
    heading: "Brand Identity",
    lines: [
      ["Mark & wordmark", "—", "Incl."],
      ["Color + type system", "—", "Incl."],
      ["Guidelines PDF", "1", "$4,800"],
    ],
    total: "$4,800",
  },
] as const;

type TemplateId = (typeof TEMPLATES)[number]["id"];
type SwatchId = (typeof PALETTE)[number]["id"];

export function StudioProduct() {
  const [selectedId, setSelectedId] = useState<TemplateId>("minimalist-invoice");
  const [swatchId, setSwatchId] = useState<SwatchId>("terracotta");
  const accent = PALETTE.find((swatch) => swatch.id === swatchId)?.hex ?? "#C4784A";

  return (
    <div className="studio-monitor mx-auto w-full min-w-0 max-w-[920px]">
      <div className="studio-monitor-bezel">
        <div className="studio-monitor-camera" aria-hidden />
        <div className="studio-monitor-screen">
          <div className="flex min-h-0 sm:min-h-[420px] md:min-h-[520px]">
            <aside className="hidden w-12 shrink-0 flex-col items-center gap-5 border-r border-[#ece6dc] bg-[#fbf8f3] py-4 sm:flex">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                IF
              </span>
              <nav className="flex flex-1 flex-col items-center justify-between text-[#9a9186]" aria-label="Product preview">
                <span className="flex flex-col items-center gap-4">
                  <Home className="h-4 w-4" aria-hidden />
                  <FileText className="h-4 w-4 text-foreground" aria-hidden />
                  <Folder className="h-4 w-4" aria-hidden />
                </span>
                <Settings className="h-4 w-4" aria-hidden />
              </nav>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col bg-[#fffdf9]">
              <header className="flex items-center gap-2 border-b border-[#ece6dc] px-4 py-3 sm:px-5">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground sm:hidden">
                  IF
                </span>
                <p className="text-[13px] font-medium tracking-tight text-foreground">Templates gallery</p>
              </header>

              <div id="templates" className="scroll-mt-24 flex-1 px-3 py-3 sm:px-5 sm:py-4">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                  {TEMPLATES.map((template) => {
                    const selected = template.id === selectedId;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedId(template.id)}
                        className="min-w-0 text-left"
                        aria-pressed={selected}
                      >
                        <MiniDocument
                          template={template}
                          selected={selected}
                          accent={accent}
                        />
                        <span className="mt-2 block truncate text-center text-[11px] text-muted-foreground sm:text-xs">
                          {template.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <section className="border-t border-[#ece6dc] bg-[#fffdf9] px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="font-display text-xl tracking-tight text-foreground sm:text-2xl">
                      Your Brand Identity
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                      Custom logo and color palette
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#ece6dc] bg-white px-3 py-1.5 shadow-[0_8px_24px_-16px_rgba(28,25,23,0.45)]">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
                        IF
                      </span>
                      <span className="text-xs font-medium">Custom Logo</span>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Color palette
                      </p>
                      <div className="flex items-center gap-2" role="listbox" aria-label="Brand color palette">
                        {PALETTE.map((swatch) => {
                          const active = swatch.id === swatchId;
                          return (
                            <button
                              key={swatch.id}
                              type="button"
                              role="option"
                              aria-selected={active}
                              aria-label={swatch.label}
                              title={swatch.label}
                              onClick={() => setSwatchId(swatch.id)}
                              className={cn(
                                "h-6 w-6 rounded-full border shadow-sm transition-transform",
                                active ? "scale-110 ring-2 ring-foreground/20" : "hover:scale-105",
                              )}
                              style={{
                                backgroundColor: swatch.hex,
                                borderColor: swatch.id === "porcelain" || swatch.id === "cream" ? "#e4ddd2" : swatch.hex,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniDocument({
  template,
  selected,
  accent,
}: {
  template: (typeof TEMPLATES)[number];
  selected: boolean;
  accent: string;
}) {
  const badgeColor = accent === "#FFFDF9" || accent === "#F4EFE6" ? "#2D4A3E" : accent;
  return (
    <div
      className={cn(
        "relative flex aspect-[3/4] flex-col overflow-hidden rounded-lg bg-[#faf6f0] p-2.5 text-left transition-shadow",
        selected ? "pb-8" : "ring-1 ring-[#ece6dc] shadow-[0_10px_24px_-18px_rgba(28,25,23,0.55)]",
      )}
      style={
        selected
          ? { boxShadow: `0 0 0 2px ${accent}, 0 12px 28px -16px rgba(28,25,23,0.45)` }
          : undefined
      }
    >
      <span className="mb-2 block h-0.5 w-7 rounded-full" style={{ backgroundColor: selected ? accent : "#d9d0c4" }} />
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
            {template.studio}
          </p>
          <p className="mt-0.5 font-display text-[12px] leading-tight tracking-tight">{template.heading}</p>
        </div>
        <p className="max-w-[46%] truncate text-right text-[8px] text-muted-foreground">{template.client}</p>
      </div>
      <div className="mt-2 flex justify-between text-[7px] uppercase tracking-[0.12em] text-muted-foreground">
        <span>Description</span>
        <span>Amount</span>
      </div>
      <div className="mt-1 flex-1 space-y-1.5 border-t border-[#ece6dc] pt-1.5">
        {template.lines.map(([label, qty, amount]) => (
          <div key={label} className="grid grid-cols-[1fr_auto] items-baseline gap-2 text-[8px] leading-3 text-[#6b6258]">
            <span className="truncate">
              {label}
              <span className="ml-1 text-[7px] text-[#b0a89e]">{qty === "—" ? "" : `×${qty}`}</span>
            </span>
            <span>{amount}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-[#ece6dc] pt-1.5 text-[9px] font-medium">
        <span>Total</span>
        <span>{template.total}</span>
      </div>
      {selected ? (
        <span
          className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.12em] shadow-sm"
          style={{ color: badgeColor }}
        >
          <Check className="h-2.5 w-2.5" aria-hidden />
          Selected
        </span>
      ) : null}
    </div>
  );
}
