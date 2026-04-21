import React from "react";
import { View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  House,
  Target,
  Sparkle,
  Wallet,
  PlusCircle,
} from "phosphor-react-native";
import { colors } from "../theme/tokens";
import { useAppStore } from "../store/useAppStore";
import { SplashScreen } from "../screens/SplashScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { ConnectWalletScreen } from "../screens/ConnectWalletScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { GoalsHomeScreen } from "../screens/GoalsHomeScreen";
import { CreateGoalScreen } from "../screens/CreateGoalScreen";
import { GoalDetailScreen } from "../screens/GoalDetailScreen";
import { PredictionPoolScreen } from "../screens/PredictionPoolScreen";
import { AICoachingScreen } from "../screens/AICoachingScreen";
import { WalletScreen } from "../screens/WalletScreen";

export type AuthStackParamList = {
  Splash: undefined;
  Welcome: undefined;
  ConnectWallet: undefined;
};

export type GoalsStackParamList = {
  GoalsHome: undefined;
  GoalDetail: { goalId: string };
  PredictionPool: { goalId: string };
  ShareInvite: { goalId: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  GoalsTab: undefined;
  CreateTab: undefined;
  CoachTab: undefined;
  WalletTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const GoalsStack = createNativeStackNavigator<GoalsStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function TabIcon({
  icon,
  color,
  active,
}: {
  icon: React.ReactNode;
  color: string;
  active: boolean;
}) {
  return (
    <View style={styles.tabIconWrap}>
      {icon}
      {active ? <View style={[styles.tabDot, { backgroundColor: color }]} /> : null}
    </View>
  );
}

function GoalsStackNav() {
  return (
    <GoalsStack.Navigator screenOptions={{ headerShown: false }}>
      <GoalsStack.Screen name="GoalsHome" component={GoalsHomeScreen} />
      <GoalsStack.Screen name="GoalDetail" component={GoalDetailScreen} />
      <GoalsStack.Screen name="PredictionPool" component={PredictionPoolScreen} />
    </GoalsStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          marginHorizontal: 20,
          marginBottom: 16,
          borderRadius: 32,
          backgroundColor: "rgba(13,27,46,0.92)",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
          height: 68,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.brandGreen,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              color={color}
              active={focused}
              icon={<House color={color} size={size ?? 24} weight="regular" />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="GoalsTab"
        component={GoalsStackNav}
        options={{
          title: "Goals",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              color={color}
              active={focused}
              icon={<Target color={color} size={size ?? 24} weight="regular" />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="CreateTab"
        component={CreateGoalScreen}
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <View style={[styles.plusWrap, focused && styles.plusWrapOn]}>
              <PlusCircle color={colors.textInverse} size={30} weight="fill" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="CoachTab"
        component={AICoachingScreen}
        options={{
          title: "AI Coach",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              color={color}
              active={focused}
              icon={<Sparkle color={color} size={size ?? 24} weight="regular" />}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="WalletTab"
        component={WalletScreen}
        options={{
          title: "Wallet",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              color={color}
              active={focused}
              icon={<Wallet color={color} size={size ?? 24} weight="regular" />}
            />
          ),
        }}
      />
    </Tabs.Navigator>
  );
}

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="ConnectWallet" component={ConnectWalletScreen} />
    </AuthStack.Navigator>
  );
}

export function RootNavigator() {
  const wallet = useAppStore((s) => s.wallet);

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!wallet ? (
        <RootStack.Screen name="Auth" component={AuthFlow} />
      ) : (
        <RootStack.Screen name="Main" component={MainTabs} />
      )}
    </RootStack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: { alignItems: "center", justifyContent: "center" },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  plusWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "rgba(0,230,118,0.8)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
  },
  plusWrapOn: {
    backgroundColor: colors.brandGreenDim,
  },
});
