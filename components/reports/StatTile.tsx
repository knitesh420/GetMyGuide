"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import CountUp from "@/components/animations/CountUp";
import { EASE_OUT } from "@/lib/motion";

interface StatTileProps {
  label: string;
  /** A number counts up on scroll; a string is rendered as-is. */
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  /** Rendered immediately before a numeric value, e.g. "₹". */
  prefix?: string;
  /** Decimal places when `value` is a number. */
  decimals?: number;
  /** Index in a grid — staggers the entrance. */
  index?: number;
}

export function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  prefix,
  decimals,
  index = 0,
}: StatTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.4), ease: EASE_OUT }}
      whileHover={{ y: -4 }}
    >
      <Card className="h-full transition-shadow duration-300 hover:shadow-lg">
        <CardContent className="flex items-center justify-between py-5">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight">
              {typeof value === "number" ? (
                <CountUp to={value} prefix={prefix} decimals={decimals} />
              ) : (
                value
              )}
            </p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          {Icon && (
            <motion.div
              className="rounded-full bg-primary/10 p-3"
              whileHover={{ scale: 1.1, rotate: -8 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Icon className="h-5 w-5 text-primary" />
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
