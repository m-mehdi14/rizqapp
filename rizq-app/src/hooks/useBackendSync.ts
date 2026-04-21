import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchGoals, registerUser } from "../api/rizqApi";
import { useAppStore } from "../store/useAppStore";

export function useBackendSync() {
  const wallet = useAppStore((s) => s.wallet);
  const setGoals = useAppStore((s) => s.setGoals);
  const setBalance = useAppStore((s) => s.setBalance);

  const goalsQuery = useQuery({
    queryKey: ["goals", wallet],
    queryFn: async () => fetchGoals(wallet as string),
    enabled: !!wallet,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!wallet) return;
    registerUser(wallet).catch(() => undefined);
  }, [wallet]);

  useEffect(() => {
    if (!goalsQuery.data) return;
    setGoals(goalsQuery.data);
    const totalSaved = goalsQuery.data.reduce((acc, g) => acc + g.savedLamports, 0);
    setBalance(totalSaved);
  }, [goalsQuery.data, setBalance, setGoals]);

  return goalsQuery;
}
