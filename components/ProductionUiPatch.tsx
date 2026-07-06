"use client";

import { useEffect } from "react";
import type { UserRole } from "@/types/quote";

type SessionResponse = {
  ok?: boolean;
  user?: {
    role?: UserRole;
  } | null;
};

function patchSecurityTab(role: UserRole | null) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".tabs .tab-button"));
  const securityButton = buttons.find((button) => button.textContent?.trim() === "Seguridad / roles");

  if (!securityButton) return;

  if (role !== "admin") {
    securityButton.style.display = "none";
    return;
  }

  securityButton.style.display = "";
  securityButton.textContent = "Usuarios";
  securityButton.setAttribute("aria-label", "Administrar usuarios");
  securityButton.dataset.productionUsersTab = "true";
}

export function ProductionUiPatch() {
  useEffect(() => {
    let cancelled = false;
    let role: UserRole | null = null;

    function applyPatch() {
      if (cancelled) return;
      patchSecurityTab(role);
    }

    async function loadRole() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as SessionResponse;

        if (!cancelled && response.ok && data.ok && data.user?.role) {
          role = data.user.role.toLowerCase() as UserRole;
          applyPatch();
        }
      } catch {
        role = null;
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
