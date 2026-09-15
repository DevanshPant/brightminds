import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Router-aware anchor handling: scrolls to `#section` after a route change
 * (e.g. arriving at `/#courses` from another page), and to the top otherwise.
 */
const ScrollToHash = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) return;

    // Wait one frame so the target section is mounted.
    const timer = window.setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [pathname, hash]);

  return null;
};

export default ScrollToHash;
