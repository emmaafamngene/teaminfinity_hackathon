"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { MarketState } from "@/lib/marketplace";
import type { Role } from "@/lib/security";
import { api } from "@/lib/api-client";
export type AccountUser = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  blocked: boolean;
  created_at?: string;
  account_kind?: "student" | "vendor";
};
type MarketContext = {
  state: MarketState;
  user: AccountUser | null;
  ready: boolean;
  error: string;
  refresh: () => Promise<void>;
  mutate: (path: string, method: string, body?: unknown) => Promise<boolean>;
};
const Context = createContext<MarketContext | null>(null);
export function MarketProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MarketState>({
    vendors: [],
    products: [],
    history: [],
    saved: [],
  });
  const [user, setUser] = useState<AccountUser | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  async function refresh() {
    try {
      const result = await api<{
        state: MarketState;
        user: AccountUser | null;
      }>("/api/market");
      setState(result.state);
      setUser(result.user);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the marketplace.",
      );
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  async function mutate(path: string, method: string, body?: unknown) {
    try {
      await api(path, method, body);
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save changes.");
      return false;
    }
  }
  return (
    <Context.Provider value={{ state, user, ready, error, refresh, mutate }}>
      {children}
    </Context.Provider>
  );
}
export function useMarket() {
  const context = useContext(Context);
  if (!context) throw new Error("MarketProvider required");
  return context;
}
