import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-600",
  {
    variants: {
      variant: {
        default: "bg-[#163f32] text-white hover:bg-[#285b47]",
        outline: "border border-[#dce2d4] bg-white hover:bg-[#edf2e4]",
        ghost: "hover:bg-[#edf2e4]",
      },
      size: { default: "h-11 px-5", sm: "h-9 px-3 text-xs", icon: "size-10" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-ui="button"
      data-variant={variant || "default"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
