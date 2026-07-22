"use client";

import { useCallback, useEffect, useState } from "react";
import type { CommLogEntry, Vendor } from "./types";
import { SEED_BUDGET, SEED_VENDORS } from "./seed";

const VENDORS_KEY = "crm.vendors.v1";
const BUDGET_KEY = "crm.budget.v1";

function loadVendors(): Vendor[] {
  if (typeof window === "undefined") return SEED_VENDORS;
  try {
    const raw = window.localStorage.getItem(VENDORS_KEY);
    if (!raw) return SEED_VENDORS;
    return JSON.parse(raw) as Vendor[];
  } catch {
    return SEED_VENDORS;
  }
}

function loadBudget(): number {
  if (typeof window === "undefined") return SEED_BUDGET;
  const raw = window.localStorage.getItem(BUDGET_KEY);
  return raw ? Number(raw) : SEED_BUDGET;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Single hook that owns all CRM state. Hydrates from localStorage after mount
 * (SSR renders the seed to keep markup stable), then persists every change.
 */
export function useCrm() {
  const [vendors, setVendors] = useState<Vendor[]>(SEED_VENDORS);
  const [budget, setBudget] = useState<number>(SEED_BUDGET);
  const [hydrated, setHydrated] = useState(false);

  // Intentional post-mount hydration: SSR + first client render use the seed
  // (stable markup), then we sync from localStorage. This is the sanctioned
  // exception to set-state-in-effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVendors(loadVendors());
    setBudget(loadBudget());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(VENDORS_KEY, JSON.stringify(vendors));
  }, [vendors, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(BUDGET_KEY, String(budget));
  }, [budget, hydrated]);

  const addVendor = useCallback((vendor: Omit<Vendor, "id" | "createdAt" | "log">) => {
    const created: Vendor = {
      ...vendor,
      id: uid("v"),
      createdAt: new Date().toISOString().slice(0, 10),
      log: [],
    };
    setVendors((prev) => [created, ...prev]);
    return created.id;
  }, []);

  const updateVendor = useCallback((id: string, patch: Partial<Vendor>) => {
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }, []);

  const deleteVendor = useCallback((id: string) => {
    setVendors((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const addLogEntry = useCallback((vendorId: string, entry: Omit<CommLogEntry, "id">) => {
    setVendors((prev) =>
      prev.map((v) =>
        v.id === vendorId
          ? { ...v, log: [{ ...entry, id: uid("l") }, ...v.log] }
          : v,
      ),
    );
  }, []);

  const resetToSeed = useCallback(() => {
    setVendors(SEED_VENDORS);
    setBudget(SEED_BUDGET);
  }, []);

  return {
    vendors,
    budget,
    hydrated,
    setBudget,
    addVendor,
    updateVendor,
    deleteVendor,
    addLogEntry,
    resetToSeed,
  };
}
