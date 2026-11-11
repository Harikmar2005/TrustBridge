export type LanguageCode = 'en' | 'ta' | 'hi';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  flag: string;
  native: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', flag: '🇬🇧', native: 'English' },
  { code: 'ta', label: 'Tamil', flag: '🇮🇳', native: 'தமிழ்' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳', native: 'हिन्दी' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const DICTIONARY = {
  // Navigation & Branding
  brandTagline: {
    en: 'Marketplace Trust & Resolution',
    ta: 'சந்தை நம்பிக்கை மற்றும் தீர்வு',
    hi: 'मार्केटप्लेस ट्रस्ट और विवाद समाधान',
  },
  buyerPortal: {
    en: 'Buyer Portal',
    ta: 'வாங்குபவர் தளம்',
    hi: 'क्रेता पोर्टल',
  },
  sellerPortal: {
    en: 'Seller Portal',
    ta: 'விற்பனையாளர் தளம்',
    hi: 'विक्रेता पोर्टल',
  },
  supportAgent: {
    en: 'Support Agent',
    ta: 'ஆதரவு முகவர்',
    hi: 'सपोर्ट एजेंट',
  },
  adminDashboard: {
    en: 'Admin Dashboard',
    ta: 'நிர்வாக கட்டுப்பாட்டகம்',
    hi: 'एडमिन डैशबोर्ड',
  },
  demoWalkthrough: {
    en: '11-Step Demo',
    ta: '11-படி நேரடி செயல்விளக்கம்',
    hi: '11-चरण लाइव डेमो',
  },
  nexconnConnected: {
    en: 'Nexconn Chat SDK: Connected (TLS)',
    ta: 'நெக்ஸ்கான் சாட் SDK: இணைக்கப்பட்டது (TLS)',
    hi: 'नेक्सकॉन चैट SDK: कनेक्टेड (TLS)',
  },

  // Chat Interface
  chatPlaceholder: {
    en: 'Type message in English...',
    ta: 'தமிழில் செய்தியை தட்டச்சு செய்யவும்...',
    hi: 'हिन्दी में संदेश टाइप करें...',
  },
  send: {
    en: 'Send',
    ta: 'அனுப்புக',
    hi: 'भेजें',
  },
  translatedMode: {
    en: 'Translated',
    ta: 'மொழிபெயர்ப்பு',
    hi: 'अनुवादित',
  },
  sideBySideMode: {
    en: 'Side-by-Side',
    ta: 'பக்கவாட்டு பார்வை',
    hi: 'आमने-सामने',
  },
  originalMode: {
    en: 'Original',
    ta: 'அசல்',
    hi: 'मूल संदेश',
  },
  translatedFrom: {
    en: 'Translated from {lang} via Nexconn Multilingual Protocol',
    ta: 'நெக்ஸ்கான் பன்மொழி நெறிமுறை மூலம் {lang} மொழியிலிருந்து மொழிபெயர்க்கப்பட்டது',
    hi: 'नेक्सकॉन बहुभाषी प्रोटोकॉल द्वारा {lang} से अनुवादित',
  },
  originalMessage: {
    en: 'Original Message ({lang})',
    ta: 'அசல் செய்தி ({lang})',
    hi: 'मूल संदेश ({lang})',
  },
  deliveredViaNexconn: {
    en: 'Delivered via Nexconn',
    ta: 'நெக்ஸ்கான் வழியாக விநியோகிக்கப்பட்டது',
    hi: 'नेक्सकॉन द्वारा वितरित',
  },
  deliveredViaEscrowDb: {
    en: 'Persisted to Escrow DB',
    ta: 'எஸ்க்ரோ தரவுத்தளத்தில் சேமிக்கப்பட்டது',
    hi: 'एस्क्रो डेटाबेस में सहेजा गया',
  },
  trustGuardActive: {
    en: 'TrustBridge Guard Active: All messages encrypted with Nexconn and analyzed by Gemini Sentinel.',
    ta: 'டிரஸ்ட்பிரிட்ஜ் பாதுகாப்பு செயலில் உள்ளது: அனைத்து செய்திகளும் நெக்ஸ்கான் மூலம் குறியாக்கம் செய்யப்பட்டு ஜெமினி சென்டினல் மூலம் ஆய்வு செய்யப்படுகின்றன.',
    hi: 'ट्रस्टब्रिज गार्ड सक्रिय: सभी संदेश नेक्सकॉन द्वारा एन्क्रिप्टेड और जेमिनी सेंटिनल द्वारा विश्लेषित हैं।',
  },
  searchChat: {
    en: 'Search chat...',
    ta: 'உரையாடலைத் தேடுக...',
    hi: 'चैट में खोजें...',
  },

  // Demo Chips
  demoChipLabel: {
    en: 'Demo Prompt Chips:',
    ta: 'மாதிரி தூண்டுதல் பொத்தான்கள்:',
    hi: 'डेमो प्रॉम्प्ट चिप्स:',
  },
  demoChipEnglish: {
    en: '[English] Request product information.',
    ta: '[ஆங்கிலம்] தயாரிப்பு விவரங்களைக் கேட்கவும்.',
    hi: '[अंग्रेजी] उत्पाद विवरण का अनुरोध करें।',
  },
  demoChipTamil: {
    en: '[Tamil] Ask camera inspection.',
    ta: '[தமிழ்] கேமரா நேரடி ஆய்வு கேட்கவும்.',
    hi: '[तमिल] कैमरा निरीक्षण का अनुरोध।',
  },
  demoChipHindi: {
    en: '[Hindi] Seller confirm bundle.',
    ta: '[இந்தி] விற்பனையாளர் தொகுப்பை உறுதிப்படுத்துதல்.',
    hi: '[हिन्दी] विक्रेता बंडल की पुष्टि करें।',
  },
  demoChipScam: {
    en: '[Scam Test] Trigger Scam Sentinel (OTP + External Link)',
    ta: '[மோசடி சோதனை] சென்டினல் எச்சரிக்கை (OTP + வெளிப்புற இணைப்பு)',
    hi: '[धोखाधड़ी परीक्षण] स्कैम सेंटिनल ट्रिगर (OTP + बाहरी लिंक)',
  },

  // AI Scam Sentinel
  scamWarningTitle: {
    en: 'Suspicious Communication Pattern Detected',
    ta: 'சந்தேகத்திற்கிடமான தொடர்பு முறை கண்டறியப்பட்டது',
    hi: 'संदिग्ध संचार पैटर्न का पता चला',
  },
  detectedSignals: {
    en: 'Explainable Detected Signals:',
    ta: 'விளக்கக்கூடிய கண்டறியப்பட்ட சமிக்ஞைகள்:',
    hi: 'पता लगाए गए स्पष्टीकरण संकेत:',
  },
  recommendedAction: {
    en: 'Recommended Safety Action:',
    ta: 'பரிந்துரைக்கப்பட்ட பாதுகாப்பு நடவடிக்கை:',
    hi: 'अनुशंसित सुरक्षा कार्रवाई:',
  },
  reportFalsePositive: {
    en: 'Report False Positive',
    ta: 'தவறான எச்சரிக்கை எனப் புகாரளி',
    hi: 'गलत सकारात्मक रिपोर्ट करें',
  },
  freezeEscrowRaiseDispute: {
    en: 'Freeze Escrow & Raise Dispute',
    ta: 'எஸ்க்ரோவை முடக்கி சர்ச்சையை எழுப்புக',
    hi: 'एस्क्रो फ्रीज करें और विवाद उठाएं',
  },

  // Buyer Portal
  activeTransaction: {
    en: 'Active Transaction',
    ta: 'செயலில் உள்ள பரிவர்த்தனை',
    hi: 'सक्रिय लेन-देन',
  },
  escrowActive: {
    en: 'ESCROW ACTIVE',
    ta: 'எஸ்க்ரோ செயலில் உள்ளது',
    hi: 'एस्क्रो सक्रिय',
  },
  myDisputes: {
    en: 'My Disputes',
    ta: 'எனது சர்ச்சைகள்',
    hi: 'मेरे विवाद',
  },
  trustSecurityProfile: {
    en: 'Trust & Security Profile',
    ta: 'நம்பிக்கை மற்றும் பாதுகாப்பு விவரம்',
    hi: 'ट्रस्ट और सुरक्षा प्रोफ़ाइल',
  },
  universalChat: {
    en: 'Universal Nexconn Chat',
    ta: 'உலகளாவிய நெக்ஸ்கான் உரையாடல்',
    hi: 'यूनिवर्सल नेक्सकॉन चैट',
  },

  // Seller Portal
  buyerEnquiries: {
    en: 'Buyer Enquiries (Nexconn)',
    ta: 'வாங்குபவர் விசாரணைகள் (நெக்ஸ்கான்)',
    hi: 'क्रेता पूछताछ (नेक्सकॉन)',
  },
  storeReputation: {
    en: 'Store Reputation',
    ta: 'கடை நற்பெயர்',
    hi: 'स्टोर प्रतिष्ठा',
  },
  pendingOrders: {
    en: 'Pending Order',
    ta: 'நிலுவையில் உள்ள ஆர்டர்',
    hi: 'लंबित ऑर्डर',
  },

  // Support Agent
  assignedCases: {
    en: 'Assigned Case Queue',
    ta: 'ஒதுக்கப்பட்ட வழக்கு வரிசை',
    hi: 'आवंटित केस कतार',
  },
  joinDisputeRoom: {
    en: 'Join Nexconn Dispute Room',
    ta: 'நெக்ஸ்கான் சர்ச்சை அறையில் இணைக',
    hi: 'नेक्सकॉन विवाद कक्ष में शामिल हों',
  },
  arbitrationRuling: {
    en: 'Trust Agent Arbitration Authority',
    ta: 'நம்பிக்கை முகவர் மத்தியஸ்த அதிகாரம்',
    hi: 'ट्रस्ट एजेंट मध्यस्थता प्राधिकरण',
  },
  enforceSettlement: {
    en: 'Enforce Settlement & Close Dispute',
    ta: 'முடிவைச் செயல்படுத்தி வழக்கை முடிக்கவும்',
    hi: 'निपटारा लागू करें और विवाद बंद करें',
  },

  // Dispute Categories
  suspectedFraud: {
    en: 'Suspected Fraud & Phishing',
    ta: 'சந்தேகத்திற்குரிய மோசடி மற்றும் ஃபிஷிங்',
    hi: 'संदिग्ध धोखाधड़ी और फ़िशिंग',
  },
  paymentIssue: {
    en: 'Payment & Escrow Discrepancy',
    ta: 'பணம் செலுத்துதல் மற்றும் எஸ்க்ரோ முரண்பாடு',
    hi: 'भुगतान और एस्क्रो विसंगति',
  },
  nonDelivery: {
    en: 'Non-Delivery of Item',
    ta: 'பொருள் வழங்கப்படாமை',
    hi: 'वस्तु की डिलीवरी न होना',
  },
  wrongProduct: {
    en: 'Damaged or Wrong Product',
    ta: 'சேதமடைந்த அல்லது தவறான தயாரிப்பு',
    hi: 'क्षतिग्रस्त या गलत उत्पाद',
  },
  refundRequest: {
    en: 'Escrow Refund Demand',
    ta: 'எஸ்க்ரோ பணத்தைத் திரும்பப்பெறும் கோரிக்கை',
    hi: 'एस्क्रो रिफंड मांग',
  },
  sellerMisconduct: {
    en: 'Seller Harassment or Coercion',
    ta: 'விற்பனையாளர் தொல்லை அல்லது அச்சுறுத்தல்',
    hi: 'विक्रेता उत्पीड़न या ज़बरदस्ती',
  },

  // Statuses
  statusOpen: {
    en: 'OPEN',
    ta: 'திறக்கப்பட்டது',
    hi: 'खुला है',
  },
  statusAssigned: {
    en: 'ASSIGNED',
    ta: 'ஒதுக்கப்பட்டது',
    hi: 'आवंटित',
  },
  statusInProgress: {
    en: 'IN PROGRESS',
    ta: 'செயலில் உள்ளது',
    hi: 'प्रगति पर है',
  },
  statusResolved: {
    en: 'RESOLVED',
    ta: 'தீர்க்கப்பட்டது',
    hi: 'हल हो गया',
  },
};

export type TranslationKey = keyof typeof DICTIONARY;

export function t(key: TranslationKey, lang: LanguageCode = DEFAULT_LANGUAGE, params?: Record<string, string>): string {
  const entry = DICTIONARY[key];
  if (!entry) return key;

  let text = entry[lang] || entry[DEFAULT_LANGUAGE] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }

  return text;
}
