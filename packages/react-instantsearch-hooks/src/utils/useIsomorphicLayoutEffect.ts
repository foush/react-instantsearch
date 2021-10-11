import { useEffect, useLayoutEffect } from 'react';

// React currently throws a warning when using `useLayoutEffect` on the server.
// To get around it, we can conditionally use `useEffect` on the server (no-op)
// and use `useLayoutEffect` in the browser.
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
