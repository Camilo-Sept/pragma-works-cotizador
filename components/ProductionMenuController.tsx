"use client";

import { useEffect } from "react";
import type { UserRole } from "@/types/quote";

type SessionResponse = {
  ok?: boolean;
  user?: {
    role?: UserRole;
  } | null;
};

export function ProductionMenuController() {
  useEffect(() => {
    let active = true;

    async function loadRole() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await response.json()) as SessionResponse;
        const role = data.ok && data.user?.role ? data.user.role.toLowerCase() : "";

        if (active) {
          document.body.dataset.appRole = role;
        }
      } catch {
        if (active) {
          document.body.dataset.appRole = "";
        }
      }
    }

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const button = target.closest<HTMLButtonElement>(".tabs .tab-button");
      if (!button) return;

      if (button.textContent?.trim() === "Seguridad / roles") {
        event.preventDefault();
        event.stopPropagation();
        window.location.assign("/users");
      }
    }

    document.addEventListener("click", handleClick, true);
    void loadRole();

    return () => {
      active = false;
      delete document.body.dataset.appRole;
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
