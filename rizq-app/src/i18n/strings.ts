export type Language = "english" | "urdu" | "both";

type Copy = {
  appTitle: string;
  appTagline: string;
  home: string;
  committees: string;
  ai: string;
  wallet: string;
  profile: string;
  startCommittee: string;
  joinCommittee: string;
  exploreFirst: string;
  kycRequired: string;
};

const english: Copy = {
  appTitle: "Rizq",
  appTagline: "Digital Kameti. On Solana.",
  home: "Home",
  committees: "Committees",
  ai: "Rizq AI",
  wallet: "Wallet",
  profile: "Profile",
  startCommittee: "Start a new committee",
  joinCommittee: "Join a committee",
  exploreFirst: "Explore first",
  kycRequired: "KYC verification is required to create or join committees.",
};

const urdu: Copy = {
  appTitle: "رزق",
  appTagline: "ڈیجیٹل کمیٹی، سولانا پر۔",
  home: "ہوم",
  committees: "کمیٹیاں",
  ai: "رزق اے آئی",
  wallet: "والیٹ",
  profile: "پروفائل",
  startCommittee: "نئی کمیٹی شروع کریں",
  joinCommittee: "کمیٹی جوائن کریں",
  exploreFirst: "پہلے دیکھیں",
  kycRequired: "کمیٹی بنانے یا جوائن کرنے کے لیے KYC لازمی ہے۔",
};

export function t(lang: Language): Copy {
  if (lang === "urdu") return urdu;
  if (lang === "both") {
    return {
      appTitle: `${english.appTitle} / ${urdu.appTitle}`,
      appTagline: `${english.appTagline} ${urdu.appTagline}`,
      home: `${english.home} / ${urdu.home}`,
      committees: `${english.committees} / ${urdu.committees}`,
      ai: `${english.ai} / ${urdu.ai}`,
      wallet: `${english.wallet} / ${urdu.wallet}`,
      profile: `${english.profile} / ${urdu.profile}`,
      startCommittee: `${english.startCommittee} / ${urdu.startCommittee}`,
      joinCommittee: `${english.joinCommittee} / ${urdu.joinCommittee}`,
      exploreFirst: `${english.exploreFirst} / ${urdu.exploreFirst}`,
      kycRequired: `${english.kycRequired} ${urdu.kycRequired}`,
    };
  }
  return english;
}
