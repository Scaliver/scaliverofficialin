import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Trustpilot?: { loadFromElement: (el: HTMLElement, sync?: boolean) => void };
  }
}

/**
 * Live Trustpilot reviews carousel.
 * Set VITE_TRUSTPILOT_BUSINESSUNIT_ID in Project Settings → Environment to display
 * verified live reviews. Until set, a link to the Trustpilot profile is shown.
 */
const TrustpilotWidget = () => {
  const ref = useRef<HTMLDivElement>(null);
  const businessUnitId = import.meta.env.VITE_TRUSTPILOT_BUSINESSUNIT_ID as string | undefined;

  useEffect(() => {
    if (ref.current && window.Trustpilot) {
      window.Trustpilot.loadFromElement(ref.current, true);
    }
  }, []);

  if (!businessUnitId) {
    return (
      <a
        href="https://www.trustpilot.com/review/scaliverofficial.in"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-[11px] text-muted-foreground hover:text-primary transition-colors"
      >
        ★ See live reviews on Trustpilot
      </a>
    );
  }

  return (
    <div
      ref={ref}
      className="trustpilot-widget"
      data-locale="en-US"
      data-template-id="53aa8912dec7e10d38f59f36"
      data-businessunit-id={businessUnitId}
      data-style-height="140px"
      data-style-width="100%"
      data-theme="dark"
    >
      <a
        href="https://www.trustpilot.com/review/scaliverofficial.in"
        target="_blank"
        rel="noopener noreferrer"
      >
        Trustpilot
      </a>
    </div>
  );
};

export default TrustpilotWidget;
