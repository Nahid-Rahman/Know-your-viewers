import type { Rarity } from "@/components/common/rarity-badge";

export type TrustBadge = { icon: string; title: string; description: string };
export type GameCategory = { icon: string; tag: string; title: string; description: string };
export type RewardPoolItem = { label: string; sub: string; rarity: Rarity };
export type FaqItem = { q: string; a: string };
export type NavLink = { href: string; label: string };
export type IconLabel = { icon: string; label: string };
export type TitledStep = { title: string; description: string };
export type InfoCard = { icon: string; title: string; description: string };

export type NavContent = { links: NavLink[]; ctaLabel: string };
export type FooterContent = { links: NavLink[]; copyrightText: string; disclaimerText: string };

export type AboutContent = {
  pageTitle: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtext: string;
  liveBadges: string[];
  whatIsEyebrow: string;
  whatIsTitle: string;
  whatIsDescription: string;
  howItWorksEyebrow: string;
  howItWorksTitle: string;
  steps: TitledStep[];
  infoRequiredEyebrow: string;
  infoRequiredTitle: string;
  infoRequiredDescription: string;
  requiredFields: string[];
  statFieldsTotalValue: string;
  statFieldsTotalLabel: string;
  statSensitiveDataValue: string;
  statSensitiveDataLabel: string;
  safetyEyebrow: string;
  safetyTitle: string;
  safetyDescription: string;
  neverCollected: string[];
};

export type SupportContent = {
  pageTitle: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtext: string;
  infoCards: InfoCard[];
  formFooterText: string;
  bottomTrustText: string;
};

export type TermsContent = {
  pageTitle: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtext: string;
  heroBadges: string[];
  section1Eyebrow: string;
  section1Title: string;
  section1Description: string;
  summaryItems: string[];
  section2Eyebrow: string;
  section2Title: string;
  section2Description: string;
  infoWeUse: IconLabel[];
  safetyNoticeEyebrow: string;
  safetyNoticeTitle: string;
  safetyNoticeDescription: string;
  neverCollect: string[];
  section4Eyebrow: string;
  section4Title: string;
  section4Description: string;
  sampleResponseCode: string;
  ctaTitle: string;
  ctaDescription: string;
};

export type DebriefContent = {
  heroLabel: string;
  title: string;
  introParagraph: string;
  simulatedElementsTitle: string;
  simulatedElements: string[];
  dataUsageTitle: string;
  dataUsageParagraph: string;
  choiceTitle: string;
  choiceParagraph: string;
  grantedMessage: string;
  declinedMessage: string;
  footerContactText: string;
};

export type EntryReceivedContent = {
  badgeText: string;
  title: string;
  subtext: string;
  resultLabel: string;
  resultCaption: string;
  submittedDetailsLabel: string;
  trustItems: string[];
};

export type SiteContentValues = {
  siteName: string;
  siteDescription: string;
  heroHeadline: string;
  heroSubtext: string;
  claimedCount: string;
  countdownSeconds: number;
  trustBadges: TrustBadge[];
  gameCategories: GameCategory[];
  rewardPool: RewardPoolItem[];
  gameTypeOptions: string[];
  watchFrequencyOptions: string[];
  faqItems: FaqItem[];
  navContent: NavContent;
  footerContent: FooterContent;
  aboutContent: AboutContent;
  supportContent: SupportContent;
  termsContent: TermsContent;
  debriefContent: DebriefContent;
  entryReceivedContent: EntryReceivedContent;
};

export const DEFAULT_SITE_CONTENT: SiteContentValues = {
  siteName: "LiveDrop Arena",
  siteDescription:
    "Academic research prototype studying livestream gaming recruitment and disclosure behaviour.",
  heroHeadline: "UNLOCK\nYOUR\n**VIEWER DROP**\nTODAY!",
  heroSubtext:
    "Spin the reward roll for a chance to unlock exclusive viewer bonuses before the event closes. Verified event access. No password required.",
  claimedCount: "247,000+",
  countdownSeconds: 23 * 3600 + 48 * 60 + 21,
  trustBadges: [],
  gameCategories: [],
  rewardPool: [],
  gameTypeOptions: [],
  watchFrequencyOptions: [],
  faqItems: [],
  navContent: {
    links: [
      { href: "/#spin", label: "Spin & Win" },
      { href: "/#how-it-works", label: "How It Works" },
      { href: "/#faq", label: "FAQ" },
      { href: "/support", label: "Support" },
    ],
    ctaLabel: "Try Your Luck",
  },
  footerContent: {
    links: [
      { href: "/about", label: "About" },
      { href: "/support", label: "Contact" },
      { href: "/terms", label: "Terms" },
      { href: "/terms#privacy", label: "Privacy" },
      { href: "/#faq", label: "FAQ" },
      { href: "/support", label: "Support" },
    ],
    copyrightText: "© 2026 LiveDrop Arena",
    disclaimerText:
      "LiveDrop Arena is an independent viewer reward event platform. Not affiliated with any official game publisher or streaming platform. For entertainment purposes only.",
  },
  aboutContent: {
    pageTitle: "About the Event",
    heroEyebrow: "ABOUT THE EVENT",
    heroTitle: "Viewer Rewards,\n**Made Simple.**",
    heroSubtext:
      "LiveDrop Arena is a livestream viewer reward event interface where participants can spin for a viewer drop and submit one contact method for follow-up verification.",
    liveBadges: ["EVENT LIVE", "FREE TO JOIN", "NO ACCOUNT NEEDED"],
    whatIsEyebrow: "WHAT IS LIVEDROP ARENA?",
    whatIsTitle: "What is LiveDrop Arena?",
    whatIsDescription:
      "LiveDrop Arena is designed for livestream audiences who want to join a short viewer reward event. The experience is simple: explore the event, spin the reward roll, and submit basic follow-up details.",
    howItWorksEyebrow: "HOW IT WORKS",
    howItWorksTitle: "How the event works",
    steps: [
      { title: "Choose a Reward Pool", description: "Open the reward event and review the featured drop categories before you roll." },
      { title: "Spin the Reward Roll", description: "Hit SPIN and watch the carousel land on your viewer reward result." },
      { title: "Submit for Follow-up", description: "Provide your email or phone so the admin team can contact you after verification." },
    ],
    infoRequiredEyebrow: "INFORMATION REQUIRED",
    infoRequiredTitle: "Only basic follow-up details",
    infoRequiredDescription:
      "We only collect the minimum information needed to process your reward drop and follow up with you.",
    requiredFields: [
      "Email or phone number",
      "Stream nickname",
      "Favourite game type",
      "Livestream watching frequency",
      "Reward result",
      "Response code",
    ],
    statFieldsTotalValue: "6",
    statFieldsTotalLabel: "Fields Total",
    statSensitiveDataValue: "0",
    statSensitiveDataLabel: "Sensitive Data",
    safetyEyebrow: "SAFETY & TRUST",
    safetyTitle: "Your account details are never required",
    safetyDescription:
      "LiveDrop Arena does not require passwords, OTPs, payment details, game account login, national ID, full address, or account connection permissions.",
    neverCollected: ["Passwords", "OTP Codes", "Payment Info", "Game Login", "National ID", "Full Address"],
  },
  supportContent: {
    pageTitle: "Contact Support",
    heroEyebrow: "CONTACT SUPPORT",
    heroTitle: "Need help with\n**your viewer drop?**",
    heroSubtext:
      "Send a short support request about your viewer drop entry. Our team will contact you regarding the next process after verification.",
    infoCards: [
      { icon: "📄", title: "Entry Follow-up", description: "Use your response code if you need help checking the status of your viewer drop entry." },
      { icon: "✓", title: "Reward Verification", description: "Reward results are saved with the entry and reviewed before the team contacts the participant." },
      { icon: "🛡", title: "Safe Support", description: "Support will never ask for your password, OTP, payment details, or game account login." },
    ],
    formFooterText: "Our team will contact you using the provided email or phone number.",
    bottomTrustText: "✓ No password   ✓ No OTP   ✓ No payment   ✓ No game login   ✓ No account connection",
  },
  termsContent: {
    pageTitle: "Terms & Privacy",
    heroEyebrow: "TERMS & PRIVACY",
    heroTitle: "Clear rules.\n**Safe participation.**",
    heroSubtext:
      "This page explains what information is used for viewer drop follow-up and what information is never required.",
    heroBadges: ["🔒 NO PAYMENT REQUIRED", "◯ NO LOGIN NEEDED", "◎ TRANSPARENT POLICY"],
    section1Eyebrow: "SECTION 01",
    section1Title: "Event Terms Summary",
    section1Description:
      "LiveDrop Arena is a viewer reward event interface. Reward availability may vary by campaign, reward pool, and verification status. Submitting an entry does not require payment or account login.",
    summaryItems: [
      "One viewer entry can be submitted through the event form",
      "Reward results are saved for follow-up verification",
      "The team may contact the participant using the provided email or phone number",
      "Final reward processing may depend on campaign rules and verification",
    ],
    section2Eyebrow: "SECTION 02",
    section2Title: "Information We Use",
    section2Description:
      "Only basic follow-up information is used to contact the participant and verify the viewer entry.",
    infoWeUse: [
      { icon: "✉", label: "Email or phone number" },
      { icon: "☆", label: "Stream nickname" },
      { icon: "⚡", label: "Favourite game type" },
      { icon: "◎", label: "Livestream watching frequency" },
      { icon: "✓", label: "Reward result" },
      { icon: "◯", label: "Response code" },
      { icon: "☆", label: "Campaign / session identifiers" },
    ],
    safetyNoticeEyebrow: "SAFETY NOTICE",
    safetyNoticeTitle: "We never ask for **sensitive account details**",
    safetyNoticeDescription:
      "LiveDrop Arena does not require passwords, OTPs, payment card information, wallet PINs, game account login, national ID, full address, or account connection permissions.",
    neverCollect: [
      "Password",
      "OTP",
      "Payment card or wallet PIN",
      "Game account login",
      "National ID",
      "Full address",
      "Account connection or token access",
    ],
    section4Eyebrow: "SECTION 04",
    section4Title: "Follow-up Contact",
    section4Description:
      "After entry submission, our team may contact the participant regarding the next process after verification. Participants should use their response code when asking about their entry.",
    sampleResponseCode: "LDA-8K42",
    ctaTitle: "Ready to participate?",
    ctaDescription: "Head back to the event to submit your viewer entry or reach out if you need help.",
  },
  debriefContent: {
    heroLabel: "Research Debrief",
    title: "Thank you — here is what this study was actually about.",
    introParagraph:
      "You just took part in an academic research study on trust and disclosure behaviour in livestream gaming recruitment. Some details were withheld until now because revealing them earlier would have changed how you responded — the standard practice for this kind of research, always disclosed afterward.",
    simulatedElementsTitle: "What was simulated on the previous pages",
    simulatedElements: [
      "The countdown timer did not represent a real deadline.",
      "The \"247,000+ players\" and \"12.4K viewers\" figures were illustrative, not live counts.",
      "The reward roll outcome was not random for the purposes of this study.",
      "\"100% Official\" and similar authority badges described the study interface, not a real publisher programme.",
    ],
    dataUsageTitle: "What we will do with your information",
    dataUsageParagraph:
      "Your response code links your session data (which screens you saw, whether you spun, whether you submitted contact details) for analysis in aggregate only. If you provided an email or phone number, it is encrypted and stored separately from your behavioural data, and is used only to contact you if you asked a support question — never for marketing.",
    choiceTitle: "Your choice now",
    choiceParagraph:
      "You can choose whether the data from this session is used in the study. This will not affect any reward follow-up you were told about.",
    grantedMessage:
      "Thank you. Your session data will be included in the study, in aggregate with other participants' data.",
    declinedMessage:
      "Understood. Any contact details you submitted have been queued for deletion, and your behavioural data will be excluded from analysis.",
    footerContactText: "Questions about this study? Contact the research team, quoting your response code.",
  },
  entryReceivedContent: {
    badgeText: "Entry Confirmed",
    title: "Submission Received",
    subtext: "Your viewer drop entry has been recorded successfully. Our team will contact you regarding the next process after verification.",
    resultLabel: "Your Viewer Drop Result",
    resultCaption: "Result saved for follow-up verification.",
    submittedDetailsLabel: "Submitted Details",
    trustItems: ["No password", "No OTP", "No payment", "No game login", "No account connection"],
  },
};
