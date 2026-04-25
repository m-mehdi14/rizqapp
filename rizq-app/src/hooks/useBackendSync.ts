import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchCommittees,
  fetchSessionCommittees,
  fetchWalletUsdcBalance,
  linkWalletToSession,
  registerUser,
} from "../api/rizqApi";
import { useAppStore } from "../store/useAppStore";

export function useBackendSync() {
  const wallet = useAppStore((s) => s.wallet);
  const authToken = useAppStore((s) => s.authToken);
  const displayName = useAppStore((s) => s.displayName);
  const username = useAppStore((s) => s.username);
  const setUserId = useAppStore((s) => s.setUserId);
  const setCommittees = useAppStore((s) => s.setCommittees);
  const setBalance = useAppStore((s) => s.setBalance);

  const committeesQuery = useQuery({
    queryKey: authToken ? ["committees-session", authToken] : ["committees", wallet],
    queryFn: async () => {
      if (authToken) return await fetchSessionCommittees(authToken);
      return await fetchCommittees(wallet as string);
    },
    enabled: !!authToken || !!wallet,
    refetchInterval: 15000,
  });
  const walletUsdcQuery = useQuery({
    queryKey: ["wallet-usdc", wallet],
    queryFn: async () => fetchWalletUsdcBalance(wallet as string),
    enabled: !!wallet,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!wallet) return;
    if (authToken) {
      linkWalletToSession({ token: authToken, wallet })
        .then((user) => setUserId(user.id))
        .catch(() => undefined);
      return;
    }
    registerUser({
      wallet,
      username: username || undefined,
      displayName: displayName || undefined,
    })
      .then((user) => {
        setUserId(user.id);
      })
      .catch(() => undefined);
  }, [authToken, displayName, setUserId, username, wallet]);

  useEffect(() => {
    if (!committeesQuery.data) return;
    setCommittees(committeesQuery.data);
  }, [committeesQuery.data, setCommittees]);

  useEffect(() => {
    if (typeof walletUsdcQuery.data !== "number") return;
    setBalance(Math.round(walletUsdcQuery.data * 1_000_000));
  }, [setBalance, walletUsdcQuery.data]);

  return committeesQuery;
}
