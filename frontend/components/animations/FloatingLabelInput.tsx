"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";

type FloatingLabelInputProps = Omit<React.ComponentProps<"input">, "placeholder"> & {
  /** Sits inside the field, then floats to the border when it's in use. */
  label: string;
  /** Optional adornment rendered on the right (e.g. a show/hide toggle). */
  trailing?: React.ReactNode;
  containerClassName?: string;
};

/**
 * Text field whose label starts as the placeholder and animates up to the top
 * border once the field is focused or filled.
 *
 * Uses a real `<label htmlFor>` rather than a decorative span, so clicking the
 * label still focuses the input and screen readers get a proper name — the
 * animation is layered on top of correct markup, not a substitute for it.
 */
export const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  function FloatingLabelInput(
    { label, trailing, className, containerClassName, id, value, onFocus, onBlur, disabled, ...props },
    ref,
  ) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    const [focused, setFocused] = React.useState(false);
    // Controlled and uncontrolled both need to keep the label lifted once the
    // field has content, so track the value locally as well.
    const [hasValue, setHasValue] = React.useState(
      () => value != null && String(value).length > 0,
    );

    React.useEffect(() => {
      if (value != null) setHasValue(String(value).length > 0);
    }, [value]);

    const lifted = focused || hasValue;

    return (
      <div className={cn("relative", containerClassName)}>
        <input
          {...props}
          ref={ref}
          id={inputId}
          value={value}
          disabled={disabled}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            setHasValue(e.target.value.length > 0);
            onBlur?.(e);
          }}
          onChange={(e) => {
            setHasValue(e.target.value.length > 0);
            props.onChange?.(e);
          }}
          className={cn(
            "peer h-14 w-full rounded-xl border border-input bg-transparent px-3.5 pt-5 pb-1.5 text-base shadow-xs",
            "outline-none transition-[color,box-shadow,border-color] duration-200",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            trailing && "pr-11",
            className,
          )}
        />

        <motion.label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute left-3.5 origin-left text-muted-foreground",
            lifted && "font-medium",
            focused && "text-primary",
          )}
          initial={false}
          animate={{
            top: lifted ? 7 : 15,
            fontSize: lifted ? "0.7rem" : "1rem",
          }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
        >
          {label}
        </motion.label>

        {trailing && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
    );
  },
);
