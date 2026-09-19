"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Home, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoField({
  initialUrl,
  label,
  removeLabel,
}: {
  initialUrl?: string;
  label: string;
  removeLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(initialUrl || "");
  const [clear, setClear] = useState(false);

  return (
    <div>
      <p className="mb-3 text-sm font-medium">{label}</p>
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="grid h-28 w-48 place-items-center rounded-2xl bg-muted/70"
        >
          {preview && !clear ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="max-h-28 max-w-48 object-contain" />
          ) : (
            <span className="grid place-items-center text-accent">
              <Home className="h-16 w-16" strokeWidth={1.25} />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Studio mark</span>
            </span>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          name="logoFile"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setClear(false);
            const reader = new FileReader();
            reader.onload = () => setPreview(String(reader.result || ""));
            reader.readAsDataURL(file);
          }}
        />
        <input type="hidden" name="clearLogo" value={clear ? "on" : "off"} />
        {preview && !clear ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={removeLabel}
            onClick={() => {
              setClear(true);
              setPreview("");
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function DocumentDrop({
  name,
  label,
  buttonLabel,
  icon,
  fileName,
  clearName,
}: {
  name: string;
  label: string;
  buttonLabel: string;
  icon: ReactNode;
  fileName?: string;
  clearName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState(fileName || "");
  const [clear, setClear] = useState(false);
  return (
    <div className="grid gap-2">
      <p className="text-sm">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-20 items-center justify-center gap-2 rounded-xl border-2 border-primary/70 text-sm font-semibold uppercase tracking-[0.14em] text-primary"
      >
        {icon}
        {picked && !clear ? picked : buttonLabel}
      </button>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setClear(false);
          setPicked(file?.name || "");
        }}
      />
      <input type="hidden" name={clearName} value={clear ? "on" : "off"} />
      {picked && !clear ? (
        <button
          type="button"
          className="text-left text-xs text-muted-foreground underline"
          onClick={() => {
            setClear(true);
            setPicked("");
            if (inputRef.current) inputRef.current.value = "";
          }}
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}
