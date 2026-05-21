/**
 * Merge Tailwind class names — handles strings, objects, and falsy values.
 * Replaces clsx + tailwind-merge without adding dependencies.
 */
export function cn(...inputs) {
  return inputs
    .flatMap((input) => {
      if (!input) return [];
      if (typeof input === 'string') return [input];
      if (typeof input === 'object' && !Array.isArray(input))
        return Object.entries(input)
          .filter(([, v]) => Boolean(v))
          .map(([k]) => k);
      if (Array.isArray(input)) return input.filter(Boolean);
      return [];
    })
    .join(' ');
}
