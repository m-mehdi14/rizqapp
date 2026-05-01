import React from "react";
import { View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { PlusCircle } from "phosphor-react-native";
import { colors } from "../theme/tokens";
import { useAppStore } from "../store/useAppStore";
import { HomeScreen } from "../screens/home/HomeScreen";
import { NotificationsScreen } from "../screens/home/NotificationsScreen";
import { AiChatScreen, AiMainScreen, RizqScoreScreen } from "../screens/ai/AiScreens";
import { CommitteeDashboardScreen } from "../screens/committeeDashboard/CommitteeDashboardScreen";
import { CommitteesHubScreen } from "../screens/committees/CommitteesHubScreen";
import { CreateKametiSuccessScreen } from "../screens/createKameti/CreateKametiSuccessScreen";
import { CreateKametiWizardScreen } from "../screens/createKameti/CreateKametiWizardScreen";
import { JoinKametiSuccessScreen } from "../screens/joinKameti/JoinKametiSuccessScreen";
import { JoinKametiWizardScreen } from "../screens/joinKameti/JoinKametiWizardScreen";
import {
  PayContributionScreen,
  LatePaymentScreen,
  OverduePaymentScreen,
  PayoutNotificationScreen,
  PayoutClaimScreen,
  PostPayoutScreen,
} from "../screens/payments/PaymentScreens";
import {
  ProfileMainScreen,
  SettingsMainScreen,
  ProLandingScreen,
  ProPaymentConfirmedScreen,
  ProRenewalScreen,
} from "../screens/profile/ProfileScreens";
import {
  SettingsAboutScreen,
  SettingsCommunityScreen,
  SettingsHubScreen,
  SettingsKycStatusScreen,
  SettingsNomineeScreen,
  SettingsNotificationsScreen,
  SettingsPreferencesScreen,
  SettingsProfileScreen,
  SettingsSecurityScreen,
  SettingsSupportScreen,
  SettingsWalletManagementScreen,
} from "../screens/settings/SettingsScreens";
import {
  EdgeCasesScreen,
  ManagerVoteScreen,
  Onboarding01SplashScreen,
  Onboarding02WelcomeScreen,
  Onboarding03CommitteeScreen,
  Onboarding04SafetyScreen,
  OnboardingAuthScreen,
  Onboarding05PhoneScreen,
  Onboarding06OtpScreen,
  Onboarding07KycScreen,
  Onboarding08KycPendingScreen,
  Onboarding09NomineeScreen,
  Onboarding10WalletSetupScreen,
  Onboarding11ProfileScreen,
  Onboarding12StartScreen,
  WelfarePoolScreen,
  tabIcons,
} from "../screens/pivot/PivotScreens";
import {
  WalletDepositScreen,
  WalletDetailScreen,
  WalletHistoryScreen,
  WalletMainScreen,
} from "../screens/wallet/WalletScreens";

export type AuthStackParamList = {
  Onboarding01: undefined;
  Onboarding02: undefined;
  Onboarding03: undefined;
  Onboarding04: undefined;
  OnboardingAuth: undefined;
  Onboarding05: undefined;
  Onboarding06: undefined;
  Onboarding07: undefined;
  Onboarding08: undefined;
  Onboarding09: undefined;
  Onboarding10: undefined;
  Onboarding11: undefined;
  Onboarding12: undefined;
};

export type CommitteesStackParamList = {
  CommitteesHub: undefined;
  CreateCommittee: undefined;
  CreateCommitteeSuccess: { inviteLink: string; committeeId?: string; inviteCode?: string };
  JoinCommittee: { inviteCode?: string } | undefined;
  JoinCommitteeSuccess: { committeeId?: string } | undefined;
  MemberDashboard: { committeeId?: string } | undefined;
  ManagerDashboard: { committeeId?: string } | undefined;
  PayContribution: { committeeId?: string } | undefined;
  LatePayment: { committeeId?: string } | undefined;
  OverduePayment: { committeeId?: string } | undefined;
  PayoutNotification: { committeeId?: string } | undefined;
  PayoutClaim: { committeeId?: string } | undefined;
  PostPayout: { committeeId?: string } | undefined;
  EdgeCases: undefined;
  WelfarePool: undefined;
  ManagerVote: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  CommitteesTab: undefined;
  CreateTab: undefined;
  AITab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const CommitteesStack = createNativeStackNavigator<CommitteesStackParamList>();
const CreateFlowStack = createNativeStackNavigator<CommitteesStackParamList>();
const HomeStack = createNativeStackNavigator();
const AIStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeTabIcon = tabIcons.home;
const CommitteesTabIcon = tabIcons.committees;
const AiTabIcon = tabIcons.ai;
const ProfileTabIcon = tabIcons.profile;

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

type TabBarIconProps = {
  color: string;
  size: number;
  focused: boolean;
};

function makeTabIcon(Icon: React.ComponentType<{ color: string; size: number; weight: "regular" }>) {
  return ({ color, size, focused }: TabBarIconProps) => (
    <TabIcon
      color={color}
      active={focused}
      icon={<Icon color={color} size={size ?? 24} weight="regular" />}
    />
  );
}

const homeTabBarIcon = makeTabIcon(HomeTabIcon);
const committeesTabBarIcon = makeTabIcon(CommitteesTabIcon);
const aiTabBarIcon = makeTabIcon(AiTabIcon);
const profileTabBarIcon = makeTabIcon(ProfileTabIcon);
const createTabBarIcon = ({ focused }: { focused: boolean }) => (
  <View style={[styles.plusWrap, focused && styles.plusWrapOn]}>
    <PlusCircle color={colors.textInverse} size={30} weight="fill" />
  </View>
);

/** Must be reused everywhere `tabBarStyle` is overridden — `undefined` resets to OS default (full-width bar). */
const FLOATING_TAB_BAR_STYLE = {
  position: "absolute" as const,
  marginHorizontal: 20,
  marginBottom: 16,
  borderRadius: 32,
  backgroundColor: "rgba(13,27,46,0.92)",
  borderTopWidth: 0,
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.08)",
  height: 68,
  paddingTop: 8,
};

function CommitteesStackNav() {
  return (
    <CommitteesStack.Navigator screenOptions={{ headerShown: false }}>
      <CommitteesStack.Screen name="CommitteesHub" component={CommitteesHubScreen} />
      <CommitteesStack.Screen name="CreateCommittee" component={CreateKametiWizardScreen} />
      <CommitteesStack.Screen
        name="CreateCommitteeSuccess"
        component={CreateKametiSuccessScreen}
      />
      <CommitteesStack.Screen name="JoinCommittee" component={JoinKametiWizardScreen} />
      <CommitteesStack.Screen
        name="JoinCommitteeSuccess"
        component={JoinKametiSuccessScreen}
      />
      <CommitteesStack.Screen name="MemberDashboard" component={CommitteeDashboardScreen} />
      <CommitteesStack.Screen name="ManagerDashboard" component={CommitteeDashboardScreen} />
      <CommitteesStack.Screen name="PayContribution" component={PayContributionScreen} />
      <CommitteesStack.Screen name="LatePayment" component={LatePaymentScreen} />
      <CommitteesStack.Screen name="OverduePayment" component={OverduePaymentScreen} />
      <CommitteesStack.Screen name="PayoutNotification" component={PayoutNotificationScreen} />
      <CommitteesStack.Screen name="PayoutClaim" component={PayoutClaimScreen} />
      <CommitteesStack.Screen name="PostPayout" component={PostPayoutScreen} />
      <CommitteesStack.Screen name="EdgeCases" component={EdgeCasesScreen} />
      <CommitteesStack.Screen name="WelfarePool" component={WelfarePoolScreen} />
      <CommitteesStack.Screen name="ManagerVote" component={ManagerVoteScreen} />
    </CommitteesStack.Navigator>
  );
}

function AIStackNav() {
  return (
    <AIStack.Navigator screenOptions={{ headerShown: false }}>
      <AIStack.Screen name="AiMain" component={AiMainScreen} />
      <AIStack.Screen name="AiChat" component={AiChatScreen} />
      <AIStack.Screen name="RizqScore" component={RizqScoreScreen} />
    </AIStack.Navigator>
  );
}

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} />
    </HomeStack.Navigator>
  );
}

function CreateFlowStackNav() {
  return (
    <CreateFlowStack.Navigator screenOptions={{ headerShown: false }}>
      <CreateFlowStack.Screen name="CreateCommittee" component={CreateKametiWizardScreen} />
      <CreateFlowStack.Screen
        name="CreateCommitteeSuccess"
        component={CreateKametiSuccessScreen}
      />
    </CreateFlowStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileMainScreen} />
      <ProfileStack.Screen name="SettingsMain" component={SettingsMainScreen} />
      <ProfileStack.Screen name="SettingsHub" component={SettingsHubScreen} />
      <ProfileStack.Screen name="SettingsProfile" component={SettingsProfileScreen} />
      <ProfileStack.Screen name="SettingsKycStatus" component={SettingsKycStatusScreen} />
      <ProfileStack.Screen name="SettingsNominee" component={SettingsNomineeScreen} />
      <ProfileStack.Screen name="SettingsWalletManagement" component={SettingsWalletManagementScreen} />
      <ProfileStack.Screen name="SettingsNotifications" component={SettingsNotificationsScreen} />
      <ProfileStack.Screen name="SettingsPreferences" component={SettingsPreferencesScreen} />
      <ProfileStack.Screen name="SettingsSecurity" component={SettingsSecurityScreen} />
      <ProfileStack.Screen name="SettingsCommunity" component={SettingsCommunityScreen} />
      <ProfileStack.Screen name="SettingsSupport" component={SettingsSupportScreen} />
      <ProfileStack.Screen name="SettingsAbout" component={SettingsAboutScreen} />
      <ProfileStack.Screen name="WalletMain" component={WalletMainScreen} />
      <ProfileStack.Screen name="WalletDeposit" component={WalletDepositScreen} />
      <ProfileStack.Screen name="WalletHistory" component={WalletHistoryScreen} />
      <ProfileStack.Screen name="WalletDetail" component={WalletDetailScreen} />
      <ProfileStack.Screen name="ProLanding" component={ProLandingScreen} />
      <ProfileStack.Screen
        name="ProPaymentConfirmed"
        component={ProPaymentConfirmedScreen}
      />
      <ProfileStack.Screen name="ProRenewal" component={ProRenewalScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: FLOATING_TAB_BAR_STYLE,
        tabBarActiveTintColor: colors.brandGreen,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="HomeTab"
        component={HomeStackNav}
        options={{
          title: "Home",
          tabBarIcon: homeTabBarIcon,
        }}
      />
      <Tabs.Screen
        name="CommitteesTab"
        component={CommitteesStackNav}
        options={{
          title: "Committees",
          tabBarIcon: committeesTabBarIcon,
        }}
      />
      <Tabs.Screen
        name="CreateTab"
        component={CreateFlowStackNav}
        options={{
          title: "",
          tabBarIcon: createTabBarIcon,
          popToTopOnBlur: true,
          unmountOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="AITab"
        component={AIStackNav}
        options={({ route }) => {
          const focusedRoute = getFocusedRouteNameFromRoute(route) ?? "AiMain";
          const shouldHideTabBar = focusedRoute === "AiChat";
          return {
            title: "Rizq AI",
            tabBarIcon: aiTabBarIcon,
            tabBarStyle: shouldHideTabBar ? { display: "none" } : FLOATING_TAB_BAR_STYLE,
          };
        }}
      />
      <Tabs.Screen
        name="ProfileTab"
        component={ProfileStackNav}
        options={{
          title: "Profile",
          tabBarIcon: profileTabBarIcon,
        }}
      />
    </Tabs.Navigator>
  );
}

function AuthFlow() {
  const authToken = useAppStore((s) => s.authToken);
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);
  return (
    <AuthStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={authToken ? (hasCompletedOnboarding ? "OnboardingAuth" : "Onboarding05") : "OnboardingAuth"}
    >
      <AuthStack.Screen name="Onboarding01" component={Onboarding01SplashScreen} />
      <AuthStack.Screen name="Onboarding02" component={Onboarding02WelcomeScreen} />
      <AuthStack.Screen name="Onboarding03" component={Onboarding03CommitteeScreen} />
      <AuthStack.Screen name="Onboarding04" component={Onboarding04SafetyScreen} />
      <AuthStack.Screen name="OnboardingAuth" component={OnboardingAuthScreen} />
      <AuthStack.Screen name="Onboarding05" component={Onboarding05PhoneScreen} />
      <AuthStack.Screen name="Onboarding06" component={Onboarding06OtpScreen} />
      <AuthStack.Screen name="Onboarding07" component={Onboarding07KycScreen} />
      <AuthStack.Screen name="Onboarding08" component={Onboarding08KycPendingScreen} />
      <AuthStack.Screen name="Onboarding09" component={Onboarding09NomineeScreen} />
      <AuthStack.Screen name="Onboarding10" component={Onboarding10WalletSetupScreen} />
      <AuthStack.Screen name="Onboarding11" component={Onboarding11ProfileScreen} />
      <AuthStack.Screen name="Onboarding12" component={Onboarding12StartScreen} />
    </AuthStack.Navigator>
  );
}

export function RootNavigator() {
  const authToken = useAppStore((s) => s.authToken);
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!authToken || !hasCompletedOnboarding ? (
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
