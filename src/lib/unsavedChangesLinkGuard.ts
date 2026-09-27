import { useEffect, useRef } from "react";

export interface GuardedLinkClick {
  defaultPrevented: boolean;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export interface GuardedLinkAnchor {
  href: string;
  target: string;
  hasDownload: boolean;
}

/**
 * Returns the in-app path a plain left click on this link would open, or null
 * when the click leaves the app, opens a new tab or window, downloads, or
 * stays on the current URL. Only those in-app navigations need a
 * leave-page prompt; `beforeunload` covers the rest.
 */
export function getGuardedInAppNavigationTarget(
  click: GuardedLinkClick,
  anchor: GuardedLinkAnchor,
  currentUrl: string,
): string | null {
  if (
    click.defaultPrevented ||
    click.button !== 0 ||
    click.metaKey ||
    click.ctrlKey ||
    click.shiftKey ||
    click.altKey
  ) {
    return null;
  }
  const target = anchor.target.trim().toLowerCase();
  if ((target && target !== "_self") || anchor.hasDownload || !anchor.href) {
    return null;
  }

  let destination: URL;
  let current: URL;
  try {
    current = new URL(currentUrl);
    destination = new URL(anchor.href, current);
  } catch {
    return null;
  }
  if (destination.origin !== current.origin) {
    return null;
  }
  if (
    destination.pathname === current.pathname &&
    destination.search === current.search
  ) {
    return null;
  }
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

/**
 * Intercepts in-app link clicks (sidebar, header, breadcrumbs) while `enabled`
 * and hands the destination to `onBlocked` instead of navigating. The app uses
 * BrowserRouter, which has no `useBlocker`, so this listens in the capture
 * phase before React Router's `<Link>` handler runs.
 */
export function useUnsavedChangesLinkGuard(
  enabled: boolean,
  onBlocked: (path: string) => void,
): void {
  const onBlockedRef = useRef(onBlocked);
  useEffect(() => {
    onBlockedRef.current = onBlocked;
  }, [onBlocked]);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") {
      return undefined;
    }
    const handleClick = (event: MouseEvent) => {
      const origin = event.target instanceof Element ? event.target : null;
      const anchor = origin?.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }
      const path = getGuardedInAppNavigationTarget(
        event,
        {
          href: anchor.href,
          target: anchor.target,
          hasDownload: anchor.hasAttribute("download"),
        },
        window.location.href,
      );
      if (!path) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onBlockedRef.current(path);
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [enabled]);
}
