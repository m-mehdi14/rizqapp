import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { colors } from "./theme/tokens";
import { RootNavigator } from "./navigation/RootNavigator";
import { useBackendSync } from "./hooks/useBackendSync";
import { useAuthSessionBootstrap } from "./hooks/useAuthSessionBootstrap";
import { usePhantomWallet } from "./hooks/usePhantomWallet";

const queryClient = new QueryClient();

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
  // Keep Phantom deep-link listeners active app-wide (not only on specific screens).
  usePhantomWallet();
  useBackendSync();
  if (!ready) return null;
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgBase} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
