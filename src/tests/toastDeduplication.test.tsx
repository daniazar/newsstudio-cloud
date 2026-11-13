import React, { act, useEffect } from "react";
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { ToastProvider, useToast } from "@/components/global/ToastContainer";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function SpamTestComponent({ count }: { count: number }) {
  const { toast } = useToast();

  useEffect(() => {
    for (let i = 0; i < count; i++) {
      toast("Resumed Inpaint Session", "Restored live job: Executive Sapphire Blue Blazer Dress", "info");
    }
  }, [count, toast]);

  return <div>Spam Test</div>;
}

function MultiDistinctComponent() {
  const { toast } = useToast();

  useEffect(() => {
    toast("Title 1", "Msg 1", "info");
    toast("Title 2", "Msg 2", "info");
    toast("Title 3", "Msg 3", "info");
    toast("Title 4", "Msg 4", "info");
    toast("Title 5", "Msg 5", "info");
    toast("Title 6", "Msg 6", "info");
  }, [toast]);

  return <div>Multi Distinct Test</div>;
}

describe("ToastContainer Anti-Bombardment & Deduplication", () => {
  it("deduplicates identical toast notifications so only 1 appears instead of spamming", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ToastProvider>
          <SpamTestComponent count={10} />
        </ToastProvider>
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    const titles = container.querySelectorAll("h4");
    const matching = Array.from(titles).filter((h4) => h4.textContent?.includes("Resumed Inpaint Session"));
    expect(matching).toHaveLength(1);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("caps maximum concurrent toasts to 4 to prevent vertical bombardment", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ToastProvider>
          <MultiDistinctComponent />
        </ToastProvider>
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    const cards = container.querySelectorAll("p");
    const titleCards = Array.from(cards).filter((p) => p.textContent?.includes("Title "));
    expect(titleCards.length).toBeLessThanOrEqual(4);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
