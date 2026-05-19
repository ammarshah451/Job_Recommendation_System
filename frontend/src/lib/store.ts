import { create } from "zustand";
import type { Recommendation, AiInsight } from "./types";

interface AppStore {
  userId: string;
  recommendations: Recommendation[];
  selectedJobId: string | number | null;
  aiInsight: AiInsight | null;
  activeFilters: string[];
  isLoading: boolean;
  savedJobIds: (string | number)[];
  cmdPaletteOpen: boolean;
  toastMessage: string | null;

  setUserId: (id: string) => void;
  setRecommendations: (recs: Recommendation[]) => void;
  selectJob: (id: string | number | null) => void;
  setAiInsight: (insight: AiInsight) => void;
  toggleFilter: (filter: string) => void;
  setLoading: (v: boolean) => void;
  toggleSaveJob: (id: string | number) => void;
  setCmdPaletteOpen: (v: boolean) => void;
  setToast: (msg: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  // Demo user with history-derived skills; will be replaced by the logged-in user
  // id once Supabase Auth lands. See IMPROVEMENTS.md.
  userId: "100",
  recommendations: [],
  selectedJobId: null,
  aiInsight: null,
  activeFilters: ["All"],
  isLoading: false,
  savedJobIds: [],
  cmdPaletteOpen: false,
  toastMessage: null,

  setUserId: (id) => set({ userId: id }),
  setRecommendations: (recs) => set({ recommendations: recs }),
  selectJob: (id) => set({ selectedJobId: id }),
  setAiInsight: (insight) => set({ aiInsight: insight }),
  toggleFilter: (filter) =>
    set((s) => ({
      activeFilters:
        filter === "All"
          ? ["All"]
          : s.activeFilters.includes(filter)
          ? s.activeFilters.filter((f) => f !== filter && f !== "All")
          : [...s.activeFilters.filter((f) => f !== "All"), filter],
    })),
  setLoading: (v) => set({ isLoading: v }),
  toggleSaveJob: (id) =>
    set((s) => ({
      savedJobIds: s.savedJobIds.includes(id)
        ? s.savedJobIds.filter((x) => x !== id)
        : [...s.savedJobIds, id],
    })),
  setCmdPaletteOpen: (v) => set({ cmdPaletteOpen: v }),
  setToast: (msg) => set({ toastMessage: msg }),
}));
