import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { colors } from "./theme/tokens";
import { RootNavigator } from "./navigation/RootNavigator";
import { useBackendSync } from "./hooks/useBackendSync";
import { useAuthSessionBootstrap } from "./hooks/useAuthSessionBootstrap";
import { usePushNotifications } from "./hooks/usePushNotifications";

const queryClient = new QueryClient();
const QUERY_CACHE_KEY = "rizq-query-cache-v1";

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bgBase,
    card: colors.bgSurface,
    text: colors.textPrimary,
    border: colors.bgElevated,
    primary: colors.brandGreen,
    notification: colors.brandPurple,
  },
};

function AppContent() {
  const { ready } = useAuthSessionBootstrap();
  useBackendSync();
  usePushNotifications();
  if (!ready) return null;
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgBase} />
      <RootNavigator />
    </NavigationContainer>
  );
}

function QueryCacheBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const raw = await AsyncStorage.getItem(QUERY_CACHE_KEY);
        if (raw) {
          const state = JSON.parse(raw);
          hydrate(queryClient, state);
        }
      } catch {
        // Ignore cache restoration errors and continue with fresh state.
      } finally {
        if (active) setReady(true);
      }
    };
    restore();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      const snapshot = dehydrate(queryClient, {
        shouldDehydrateQuery: (query) => query.state.status === "success",
      });
      AsyncStorage.setItem(QUERY_CACHE_KEY, JSON.stringify(snapshot)).catch(() => undefined);
    });
    return unsubscribe;
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <QueryCacheBootstrap>
          <AppContent />
        </QueryCacheBootstrap>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
