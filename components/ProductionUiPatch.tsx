"use client";

import { useEffect } from "react";
import type { UserRole } from "@/types/quote";

type SessionResponse = {
  ok?: boolean;
  user?: {
    role?: UserRole;
  } | null;
};

function findTab(label: string) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".tabs .tab-button"));
  return buttons.find((button) => button.textContent?.trim() === label) ?? null;
}

function hideRulesTab() {
  const rulesButton = findTab("Reglas de precio");
  if (!rulesButton) return;

  const wasActive = rulesButton.classList.contains("active");
  rulesButton.style.display = "none";

  if (wasActive) {
    const quoteButton = findTab("Nueva cotización");
    quoteButton?.click();
  }
}

function patchUsersTab(role: UserRole | null) {
  const securityButton = findTab("Seguridad / roles") ?? findTab("Usuarios");
  if (!securityButton) return;

  if (role === "admin") {
    securityButton.style.display = "";
    securityButton.textContent = "Usuarios";
    securityButton.setAttribute("aria-label", "Administrar usuarios");
    securityButton.dataset.productionUsersTab = "true";
    return;
  }

  securityButton.style.display = "none";
}

export function ProductionUiPatch() {
  useEffect(() => {
    let cancelled = false;
    let role: UserRole | null = null;

    function applyPatch() {
      if (cancelled) return;
      hideRulesTab();
      patchUsersTab(role);
    }

    async function loadRole() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as SessionResponse;

        if (!cancelled && response.ok && data.ok && data.user?.role) {
          role = data.user.role.toLowerCase() as UserRole;
        }
      } catch {
        role = null;
      } finally {
        applyPatch();
      }
    }

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const button = target.closest<HTMLButtonElement>("button[data-production-users-tab='true']");
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      window.location.assign("/users");
    }

    const observer = new MutationObserver(applyPatch);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("click", handleClick, true);

    void loadRole();
    applyPatch();

    return () => {
      cancelled = true;
      observer.disconnect();
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
