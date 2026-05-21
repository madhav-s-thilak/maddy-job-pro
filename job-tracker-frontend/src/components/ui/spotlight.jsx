/**
 * Spotlight — subtle radial gradient that follows the mouse cursor.
 * Adapted from ibelick's spotlight for CRA (no TypeScript, relative imports).
 * Usage: place inside a `position: relative; overflow: hidden` parent.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { cn } from '../../lib/utils';

export function Spotlight({ className, size = 320, springOptions = { bounce: 0 } }) {
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [parentEl, setParentEl] = useState(null);

  const mouseX = useSpring(0, springOptions);
  const mouseY = useSpring(0, springOptions);

  const left = useTransform(mouseX, (x) => `${x - size / 2}px`);
  const top  = useTransform(mouseY, (y) => `${y - size / 2}px`);

  useEffect(() => {
    if (containerRef.current) {
      const parent = containerRef.current.parentElement;
      if (parent) {
        parent.style.position = 'relative';
        parent.style.overflow = 'hidden';
        setParentEl(parent);
      }
    }
  }, []);

  const onMouseMove = useCallback(
    (e) => {
      if (!parentEl) return;
      const { left: pLeft, top: pTop } = parentEl.getBoundingClientRect();
      mouseX.set(e.clientX - pLeft);
      mouseY.set(e.clientY - pTop);
    },
    [mouseX, mouseY, parentEl]
  );

  useEffect(() => {
    if (!parentEl) return;
    parentEl.addEventListener('mousemove', onMouseMove);
    parentEl.addEventListener('mouseenter', () => setIsHovered(true));
    parentEl.addEventListener('mouseleave', () => setIsHovered(false));
    return () => {
      parentEl.removeEventListener('mousemove', onMouseMove);
      parentEl.removeEventListener('mouseenter', () => setIsHovered(true));
      parentEl.removeEventListener('mouseleave', () => setIsHovered(false));
    };
  }, [parentEl, onMouseMove]);

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'pointer-events-none absolute rounded-full blur-2xl transition-opacity duration-300',
        'bg-gradient-radial from-blue-400/10 via-blue-500/5 to-transparent',
        isHovered ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{ width: size, height: size, left, top }}
    />
  );
}

/**
 * StaticSpotlight — CSS-only, no framer-motion, for hero sections.
 * Based on Aceternity's spotlight SVG variant.
 */
export function StaticSpotlight({ className, fill = 'white' }) {
  return (
    <svg
      className={cn(
        'animate-spotlight pointer-events-none absolute z-[1]',
        'h-[169%] w-[138%] lg:w-[84%] opacity-0',
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
    >
      <g filter="url(#spotlight-filter)">
        <ellipse
          cx="1924.71" cy="273.501" rx="1924.71" ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill}
          fillOpacity="0.18"
        />
      </g>
      <defs>
        <filter id="spotlight-filter" x="0.86" y="0.84"
          width="3785.16" height="2840.26"
          filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur" />
        </filter>
      </defs>
    </svg>
  );
}
