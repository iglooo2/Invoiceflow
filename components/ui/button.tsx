import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-[13px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#a94c1d]",
        secondary: "bg-accent text-accent-foreground hover:bg-[#173c36]",
        outline: "border border-border bg-transparent hover:bg-muted",
        ghost: "hover:bg-muted",
        destructive: "bg-destructive text-white hover:bg-[#911c14]",
        soft: "border border-black/5 bg-white text-foreground shadow-[0_14px_36px_-18px_rgba(28,25,23,0.42)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_40px_-16px_rgba(28,25,23,0.48)]",
      },
      size: {
        default:
          "h-[var(--btn-height-touch)] min-h-[var(--btn-height-touch)] px-[var(--btn-px)] sm:h-[var(--btn-height)] sm:min-h-[var(--btn-height)]",
        sm: "h-[var(--btn-height-sm)] min-h-[var(--btn-height-sm)] px-2.5 text-xs",
        lg: "h-[var(--btn-height-lg)] min-h-[var(--btn-height-lg)] px-4",
        icon: "size-[var(--btn-height-touch)] min-h-[var(--btn-height-touch)] p-0 sm:size-[var(--btn-height)] sm:min-h-[var(--btn-height)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export const btnRowClass = "btn-row";

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
