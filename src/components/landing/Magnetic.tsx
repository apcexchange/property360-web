"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import React, { useRef } from "react";

interface Props {
  children: React.ReactNode;
  /** Maximum cursor-attraction distance in px. Default 14. */
  strength?: number;
  className?: string;
}

/**
 * Wraps a child element so it leans subtly toward the cursor on hover —
 * the kind of refined micro-interaction you find on Linear, Stripe, Vercel.
 * Spring-damped so it returns smoothly when the cursor leaves.
 */
export function Magnetic({ children, strength = 14, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    // Normalize by the element's half-extent so the pull scales with size,
    // then clamp to `strength`.
    const nx = Math.max(-1, Math.min(1, dx / (rect.width / 2)));
    const ny = Math.max(-1, Math.min(1, dy / (rect.height / 2)));
    x.set(nx * strength);
    y.set(ny * strength);
  }

  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: sx, y: sy }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
