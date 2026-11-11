import { GoogleGenAI } from '@google/genai';
import {
  EvidenceReference,
  RiskAnalysisResult,
  BenchmarkTestCase,
  BenchmarkReport,
} from '../../../shared/types';
import { runUnifiedFraudAnalysis } from './unifiedRiskEngine';
import { analyzeUrls } from './urlIntelligence';
import { getModelMetadata } from './mlClassifier';

export { runUnifiedFraudAnalysis } from './unifiedRiskEngine';
export { analyzeUrls } from './urlIntelligence';
export { getModelMetadata } from './mlClassifier';
export * from './types';

// 30 Multilingual Benchmark Test Cases (15 Benign, 15 Malicious across EN, TA, HI)
export const BENCHMARK_DATASET: BenchmarkTestCase[] = [
  // 15 Legitimate / Benign Cases
  {
    id: 'BEN-01',
    language: 'en',
    text: 'Hello, could you share the warranty details, condition, and if the original battery charger is included?',
    isMalicious: false,
    threatType: 'BENIGN_INQUIRY',
    expectedCategory: 'LOW',
    description: 'Legitimate pre-purchase enquiry regarding warranty and battery charger',
  },
  {
    id: 'BEN-02',
    language: 'en',
    text: 'I would like to proceed with the transaction through TrustBridge escrow payment.',
    isMalicious: false,
    threatType: 'BENIGN_ESCROW',
    expectedCategory: 'LOW',
    description: 'Safe on-platform escrow purchase intent',
  },
  {
    id: 'BEN-03',
    language: 'en',
    text: 'Can you provide the courier tracking number once the package has been dispatched?',
    isMalicious: false,
    threatType: 'BENIGN_SHIPPING',
    expectedCategory: 'LOW',
    description: 'Standard shipment tracking question',
  },
  {
    id: 'BEN-04',
    language: 'en',
    text: 'Do you offer a small bundle discount if I buy both the 50mm lens and camera body together on TrustBridge?',
    isMalicious: false,
    threatType: 'BENIGN_NEGOTIATION',
    expectedCategory: 'LOW',
    description: 'Standard on-platform price negotiation with legitimate platform intent',
  },
  {
    id: 'BEN-05',
    language: 'en',
    text: 'Thank you for the quick response! I will complete the checkout now via the official order button.',
    isMalicious: false,
    threatType: 'BENIGN_CHECKOUT',
    expectedCategory: 'LOW',
    description: 'Standard cordial checkout confirmation',
  },
  {
    id: 'BEN-06',
    language: 'ta',
    text: 'வணக்கம், கேமரா இன்னும் கையிருப்பில் உள்ளதா? அசல் பெட்டியுடன் வருமா?',
    isMalicious: false,
    threatType: 'BENIGN_INQUIRY',
    expectedCategory: 'LOW',
    description: 'Tamil: Is the camera still in stock with the original box?',
  },
  {
    id: 'BEN-07',
    language: 'ta',
    text: 'சிறந்தது! டிரஸ்ட்பிரிட்ஜ் பாதுகாப்பான எஸ்க்ரோ பேமெண்ட் மூலம் பணம் செலுத்த விரும்புகிறேன்.',
    isMalicious: false,
    threatType: 'BENIGN_ESCROW',
    expectedCategory: 'LOW',
    description: 'Tamil: I would like to pay through secure TrustBridge escrow.',
  },
  {
    id: 'BEN-08',
    language: 'ta',
    text: 'பொருள் கிடைத்தவுடன் எஸ்க்ரோ தொகையை உடனடியாக விடுவிக்கிறேன்.',
    isMalicious: false,
    threatType: 'BENIGN_RELEASE',
    expectedCategory: 'LOW',
    description: 'Tamil: Will release escrow funds promptly once item is received.',
  },
  {
    id: 'BEN-09',
    language: 'ta',
    text: 'கொரியர் ரசீது எண்ணை ஆர்டர் விவரப் பக்கத்தில் பதிவேற்றம் செய்ய முடியுமா?',
    isMalicious: false,
    threatType: 'BENIGN_SHIPPING',
    expectedCategory: 'LOW',
    description: 'Tamil: Can you upload the courier tracking number to the order page?',
  },
  {
    id: 'BEN-10',
    language: 'ta',
    text: 'பொருளின் உத்தரவாத காலம் எத்தனை மாதங்கள் செல்லுபடியாகும்?',
    isMalicious: false,
    threatType: 'BENIGN_WARRANTY',
    expectedCategory: 'LOW',
    description: 'Tamil: How many months is the warranty valid?',
  },
  {
    id: 'BEN-11',
    language: 'hi',
    text: 'हाँ बिल्कुल, बिल्कुल नया है और सीलबंद बॉक्स में वारंटी कार्ड के साथ उपलब्ध है।',
    isMalicious: false,
    threatType: 'BENIGN_CONFIRMATION',
    expectedCategory: 'LOW',
    description: 'Hindi: Brand new sealed camera with warranty card.',
  },
  {
    id: 'BEN-12',
    language: 'hi',
    text: 'कृपया प्लेटफॉर्म पर आधिकारिक ऑर्डर बनाएं, मैं कल सुबह स्पीड पोस्ट से भेज दूंगा।',
    isMalicious: false,
    threatType: 'BENIGN_ORDER',
    expectedCategory: 'LOW',
    description: 'Hindi: Please place official platform order, I will ship via speed post tomorrow.',
  },
  {
    id: 'BEN-13',
    language: 'hi',
    text: 'क्या कैमरे के साथ अतिरिक्त बैटरी या 64GB मेमोरी कार्ड भी मिलेगा?',
    isMalicious: false,
    threatType: 'BENIGN_INQUIRY',
    expectedCategory: 'LOW',
    description: 'Hindi: Does it come with extra battery or memory card?',
  },
  {
    id: 'BEN-14',
    language: 'hi',
    text: 'मैं ट्रस्टब्रिज सुरक्षित भुगतान से पैसे जमा कर रहा हूँ, कृपया पार्सल तैयार रखें।',
    isMalicious: false,
    threatType: 'BENIGN_ESCROW',
    expectedCategory: 'LOW',
    description: 'Hindi: Depositing money via secure TrustBridge escrow, please prepare parcel.',
  },
  {
    id: 'BEN-15',
    language: 'hi',
    text: 'डिलीवरी का अनुमानित समय क्या होगा? क्या यह 3 दिनों में मुंबई पहुंच जाएगा?',
    isMalicious: false,
    threatType: 'BENIGN_SHIPPING',
    expectedCategory: 'LOW',
    description: 'Hindi: Estimated delivery timeline for Mumbai.',
  },

  // 15 Malicious / Threat Cases
  {
    id: 'MAL-01',
    language: 'en',
    text: 'Save 15% platform fee by transferring $1,500 directly via Zelle to deal@quick-transfer.xyz and reply with the OTP you received!',
    isMalicious: true,
    threatType: 'OTP_AND_FEE_EVASION',
    expectedCategory: 'CRITICAL',
    description: 'Off-platform fee evasion + unverified external link + OTP solicitation',
  },
  {
    id: 'MAL-02',
    language: 'en',
    text: 'Urgent: I am from TrustBridge Support team. Please verify your identity by sending your 6-digit login PIN right now or your account will be suspended in 5 minutes.',
    isMalicious: true,
    threatType: 'SUPPORT_IMPERSONATION',
    expectedCategory: 'CRITICAL',
    description: 'Support impersonation + PIN harvesting + extreme coercive urgency',
  },
  {
    id: 'MAL-03',
    language: 'en',
    text: 'I already paid you! Look at this screenshot confirmation: http://secure-escrow-vault.co/receipt?id=8849. Send item now or I call police!',
    isMalicious: true,
    threatType: 'PHISHING_LINK_FAKE_PAYMENT',
    expectedCategory: 'HIGH',
    description: 'Fake payment confirmation hosted on phishing domain with intimidation',
  },
  {
    id: 'MAL-04',
    language: 'en',
    text: 'Add me on WhatsApp +1-987-555-0199 so we can bypass platform commission and settle via PayPal Friends & Family.',
    isMalicious: true,
    threatType: 'CHANNEL_DIVERSION',
    expectedCategory: 'HIGH',
    description: 'Communication diversion to WhatsApp + commission evasion',
  },
  {
    id: 'MAL-05',
    language: 'en',
    text: 'Refund Department Notice: We detected an overpayment of $200. Click http://refund-trustbridge.net/claim to connect your debit card CVV for instant reversal.',
    isMalicious: true,
    threatType: 'REFUND_CREDENTIAL_FRAUD',
    expectedCategory: 'CRITICAL',
    description: 'Overpayment refund fraud + CVV card phishing link',
  },
  {
    id: 'MAL-06',
    language: 'ta',
    text: 'தளத்தில் 12% வரி பிடித்தம் செய்யப்படும். உடனடியாக உங்கள் வங்கிக்கு வந்த OTP எண்ணை சொல்லுங்கள், வெளிப்புற கூகுள் பே மூலம் பணம் அனுப்புகிறேன்.',
    isMalicious: true,
    threatType: 'OTP_AND_FEE_EVASION',
    expectedCategory: 'CRITICAL',
    description: 'Tamil: Fake tax claim + demanding bank OTP for off-platform payment',
  },
  {
    id: 'MAL-07',
    language: 'ta',
    text: 'இப்போதே 10 நிமிடத்தில் பணம் அனுப்புங்கள் அல்லது ஆர்டர் ரத்து செய்யப்படும்! இணைப்பு: http://quick-pay.xyz/direct',
    isMalicious: true,
    threatType: 'PHISHING_LINK_URGENCY',
    expectedCategory: 'CRITICAL',
    description: 'Tamil: 10-minute ultimatum + phishing link',
  },
  {
    id: 'MAL-08',
    language: 'ta',
    text: 'நான் டிரஸ்ட்பிரிட்ஜ் அட்மின் பேசுகிறேன். பாதுகாப்பு காரணங்களுக்காக உங்கள் கடவுச்சொல்லை அனுப்பவும்.',
    isMalicious: true,
    threatType: 'SUPPORT_IMPERSONATION',
    expectedCategory: 'CRITICAL',
    description: 'Tamil: Admin impersonation asking for password',
  },
  {
    id: 'MAL-09',
    language: 'ta',
    text: 'வாட்ஸ்அப் எண் 9876543210-ல் தொடர்பு கொள்ளவும். எஸ்க்ரோ கட்டணம் தேவையில்லை, நேரடியாக கூகுள் பே மூலம் பணம் அனுப்பலாம்.',
    isMalicious: true,
    threatType: 'CHANNEL_DIVERSION',
    expectedCategory: 'HIGH',
    description: 'Tamil: WhatsApp diversion + avoiding escrow commission',
  },
  {
    id: 'MAL-10',
    language: 'ta',
    text: 'உங்கள் கணக்கில் தவறுதலாக கூடுதல் பணம் சேர்ந்துவிட்டது. திரும்பப் பெற இந்த போலி இணைப்பை http://reversal-pay.net திறக்கவும்.',
    isMalicious: true,
    threatType: 'REFUND_FRAUD',
    expectedCategory: 'HIGH',
    description: 'Tamil: Accidental overpayment refund phishing link',
  },
  {
    id: 'MAL-11',
    language: 'hi',
    text: 'प्लेटफॉर्म पर 12% टैक्स लगेगा। आप तुरंत इस बाहरी लिंक http://pay-fast-direct.net/upi/deal88 पर ₹1,30,000 भेजें और अपना 6-अंकीय OTP शेयर करें, मैं 10 मिनट में कुरियर कर दूंगा वर्ना ऑफर रद्द!',
    isMalicious: true,
    threatType: 'MULTI_VECTOR_EXTORTION',
    expectedCategory: 'CRITICAL',
    description: 'Hindi: Phishing link + OTP solicitation + fee evasion + 10-minute cancellation ultimatum',
  },
  {
    id: 'MAL-12',
    language: 'hi',
    text: 'ट्रस्टब्रिज सिक्यूरिटी टीम से बोल रहा हूँ। आपका खाता ब्लॉक हो गया है, अनब्लॉक करने के लिए अपना पासवर्ड और डेबिट कार्ड सीवीवी बताएं।',
    isMalicious: true,
    threatType: 'SUPPORT_IMPERSONATION',
    expectedCategory: 'CRITICAL',
    description: 'Hindi: TrustBridge security impersonation + CVV/password theft',
  },
  {
    id: 'MAL-13',
    language: 'hi',
    text: 'व्हाट्सएप 9876543210 पर संपर्क करें, वहां बिना किसी कमीशन के 20% डिस्काउंट पर कैमरा मिल जाएगा।',
    isMalicious: true,
    threatType: 'CHANNEL_DIVERSION',
    expectedCategory: 'HIGH',
    description: 'Hindi: WhatsApp diversion to bypass marketplace commission',
  },
  {
    id: 'MAL-14',
    language: 'hi',
    text: 'मैंने एस्क्रो में ₹1,50,000 भेज दिए हैं। रसीद देखने और पुष्टि के लिए http://fake-escrow-ack.co पर क्लिक करें और पिन डालें।',
    isMalicious: true,
    threatType: 'PHISHING_LINK_FAKE_PAYMENT',
    expectedCategory: 'CRITICAL',
    description: 'Hindi: Fake escrow receipt with PIN harvesting link',
  },
  {
    id: 'MAL-15',
    language: 'hi',
    text: 'रिफंड पाने के लिए तुरंत अपना बैंक पासवर्ड और आधार ओटीपी शेयर करें वरना रिफंड रद्द कर दिया जाएगा।',
    isMalicious: true,
    threatType: 'REFUND_CREDENTIAL_FRAUD',
    expectedCategory: 'CRITICAL',
    description: 'Hindi: Refund cancellation threat demanding bank password and Aadhaar OTP',
  },
];

// Independent Holdout Evaluation Dataset (Separate 20 independently-labelled cases never used for rule tuning)
export const INDEPENDENT_HOLDOUT_DATASET: BenchmarkTestCase[] = [
  // Benign Holdout (10 Cases across EN, TA, HI)
  {
    id: 'HOLD-BEN-01',
    language: 'en',
    text: 'Could you please confirm if the seller invoice is included in the package for tax purposes?',
    isMalicious: false,
    threatType: 'BENIGN_INVOICE',
    expectedCategory: 'LOW',
    description: 'Enquiring about commercial tax invoice on platform',
  },
  {
    id: 'HOLD-BEN-02',
    language: 'en',
    text: 'I have funded the TrustBridge escrow balance for the MacBook. Please share shipping status once booked.',
    isMalicious: false,
    threatType: 'BENIGN_ESCROW',
    expectedCategory: 'LOW',
    description: 'Legitimate notification of escrow funding',
  },
  {
    id: 'HOLD-BEN-03',
    language: 'en',
    text: 'What are the dimensions and weight of the parcel? Need to ensure my building mailroom accepts it.',
    isMalicious: false,
    threatType: 'BENIGN_SPECS',
    expectedCategory: 'LOW',
    description: 'Package dimension query',
  },
  {
    id: 'HOLD-BEN-04',
    language: 'ta',
    text: 'பொருளின் தற்போதைய நிலை குறித்த புதிய புகைப்படங்களை அனுப்ப இயலுமா?',
    isMalicious: false,
    threatType: 'BENIGN_PHOTOS',
    expectedCategory: 'LOW',
    description: 'Tamil: Can you send latest photos of the product condition?',
  },
  {
    id: 'HOLD-BEN-05',
    language: 'ta',
    text: 'டிரஸ்ட்பிரிட்ஜ் தளத்திலேயே முழு ஆர்டரையும் பூர்த்தி செய்வோம். அது இருவருக்கும் பாதுகாப்பானது.',
    isMalicious: false,
    threatType: 'BENIGN_ESCROW',
    expectedCategory: 'LOW',
    description: 'Tamil: We will complete full order on TrustBridge, safe for both of us.',
  },
  {
    id: 'HOLD-BEN-06',
    language: 'ta',
    text: 'சென்னையில் நேரடி பார்சல் டெலிவரி செய்ய எத்தனை நாட்கள் ஆகும்?',
    isMalicious: false,
    threatType: 'BENIGN_SHIPPING',
    expectedCategory: 'LOW',
    description: 'Tamil: How many days for parcel delivery in Chennai?',
  },
  {
    id: 'HOLD-BEN-07',
    language: 'hi',
    text: 'क्या पैकेज के साथ मूल जीएसटी बिल और निर्माता की वारंटी पुस्तिका मिलेगी?',
    isMalicious: false,
    threatType: 'BENIGN_WARRANTY',
    expectedCategory: 'LOW',
    description: 'Hindi: Will original GST bill and manufacturer warranty booklet be included?',
  },
  {
    id: 'HOLD-BEN-08',
    language: 'hi',
    text: 'मैं कल दोपहर आधिकारिक ऑर्डर प्लेस करूंगा, कृपया उत्पाद सुरक्षित रखें।',
    isMalicious: false,
    threatType: 'BENIGN_RESERVATION',
    expectedCategory: 'LOW',
    description: 'Hindi: I will place official order tomorrow afternoon, please hold product.',
  },
  {
    id: 'HOLD-BEN-09',
    language: 'hi',
    text: 'सुरक्षित एस्क्रो भुगतान के बिना कोई भी लेनदेन नहीं किया जाएगा।',
    isMalicious: false,
    threatType: 'BENIGN_ESCROW_AFFIRM',
    expectedCategory: 'LOW',
    description: 'Hindi: No transaction will be done without secure escrow payment.',
  },
  {
    id: 'HOLD-BEN-10',
    language: 'en',
    text: 'Does this mechanical keyboard support Bluetooth 5.0 and multi-device switching?',
    isMalicious: false,
    threatType: 'BENIGN_INQUIRY',
    expectedCategory: 'LOW',
    description: 'Hardware feature enquiry',
  },

  // Malicious Holdout (10 Cases across EN, TA, HI)
  {
    id: 'HOLD-MAL-01',
    language: 'en',
    text: 'Official notice: TrustBridge escrow is having maintenance. Wire $850 immediately via Western Union to agent.id@quick-wire.top or purchase cancelled in 5 minutes!',
    isMalicious: true,
    threatType: 'MAINTENANCE_LURE_EXTORTION',
    expectedCategory: 'CRITICAL',
    description: 'Fake maintenance excuse + Western Union diversion + 5-minute ultimatum',
  },
  {
    id: 'HOLD-MAL-02',
    language: 'en',
    text: 'Your payment was held by security team. Text your 6-digit SMS OTP right now to +1-800-555-0144 to unfreeze.',
    isMalicious: true,
    threatType: 'SECURITY_SMS_OTP',
    expectedCategory: 'CRITICAL',
    description: 'Security team impersonation demanding SMS OTP',
  },
  {
    id: 'HOLD-MAL-03',
    language: 'en',
    text: 'I already transferred the cash! Click http://unverified-fast-ack.xyz/release-now to enter your net banking password and collect funds.',
    isMalicious: true,
    threatType: 'BANKING_PASSWORD_PHISHING',
    expectedCategory: 'CRITICAL',
    description: 'Fake cash transfer phishing for online banking password',
  },
  {
    id: 'HOLD-MAL-04',
    language: 'en',
    text: 'Let us skip the 10% platform fee. Ping me on Telegram @deal_fast_direct and transfer via Google Pay.',
    isMalicious: true,
    threatType: 'TELEGRAM_FEE_EVASION',
    expectedCategory: 'HIGH',
    description: 'Telegram diversion + fee evasion',
  },
  {
    id: 'HOLD-MAL-05',
    language: 'ta',
    text: 'பாதுகாப்பு குழு: உங்கள் வங்கி கணக்கு முடக்கப்பட்டுவிட்டது. உடனடியாக 6 இலக்க கடவுச்சொல்லை அனுப்பவும் அல்லது 10 நிமிடத்தில் சலுகை ரத்து!',
    isMalicious: true,
    threatType: 'PASSWORD_URGENCY',
    expectedCategory: 'CRITICAL',
    description: 'Tamil: Fake bank account block + demanding password + 10-minute ultimatum',
  },
  {
    id: 'HOLD-MAL-06',
    language: 'ta',
    text: 'வெளிப்புற கூகுள் பே மூலம் உடனடியாக பணம் அனுப்புங்கள். தளம் 15% வரி பிடிக்கும். இணைப்பு: http://quick-escrow-claim.net',
    isMalicious: true,
    threatType: 'FEE_EVASION_PHISHING',
    expectedCategory: 'CRITICAL',
    description: 'Tamil: Fee evasion claim + phishing link',
  },
  {
    id: 'HOLD-MAL-07',
    language: 'ta',
    text: 'டெலிகிராம் மூலம் பேசலாம். தளத்திற்கு வெளியே நேரடியாக பணம் செலுத்துங்கள், கமிஷன் மிச்சமாகும்.',
    isMalicious: true,
    threatType: 'TELEGRAM_DIVERSION',
    expectedCategory: 'HIGH',
    description: 'Tamil: Telegram shift + direct payment to avoid commission',
  },
  {
    id: 'HOLD-MAL-08',
    language: 'hi',
    text: 'तुरंत इस लिंक http://secure-trustbridge-claim.top पर क्लिक करें और अपना बैंक पासवर्ड और डेबिट कार्ड सीवीवी दर्ज करें वर्ना खाता ब्लॉक!',
    isMalicious: true,
    threatType: 'DECEPTIVE_DOMAIN_CVV',
    expectedCategory: 'CRITICAL',
    description: 'Hindi: Deceptive subdomain (.top) + CVV/bank password theft + block threat',
  },
  {
    id: 'HOLD-MAL-09',
    language: 'hi',
    text: 'प्लेटफॉर्म टैक्स से बचने के लिए सीधे मेरे फोनपे 9876543210 पर ₹80,000 भेजें और बैंक ओटीपी साझा करें।',
    isMalicious: true,
    threatType: 'PHONEPE_OTP_THEFT',
    expectedCategory: 'CRITICAL',
    description: 'Hindi: Tax evasion + direct payment + bank OTP harvesting',
  },
  {
    id: 'HOLD-MAL-10',
    language: 'hi',
    text: 'टेलीग्राम पर संपर्क करें, वहां बिना किसी कमीशन के 20% डिस्काउंट मिलेगा।',
    isMalicious: true,
    threatType: 'TELEGRAM_COMMISSION_DISCOUNT',
    expectedCategory: 'HIGH',
    description: 'Hindi: Telegram diversion with commission evasion discount',
  },
];

/**
 * Primary AI Fraud Analysis function powered by the Unified AI 2.0 Engine
 * Guarantees provenance transparency (never claims AI if basic rules were used)
 */
export async function analyzeMessageForRisk(
  content: string,
  senderRole: string,
  conversationContext?: string[]
): Promise<RiskAnalysisResult> {
  const unified = await runUnifiedFraudAnalysis(content, {
    senderRole,
    conversationContext,
    persist: false,
  });

  return {
    riskScore: unified.riskScore,
    riskCategory: unified.riskCategory,
    confidenceScore: unified.confidenceScore,
    detectionEngine: unified.detectionEngine as any,
    detectedIndicators: unified.detectedIndicators,
    evidenceReferences: unified.evidenceReferences,
    explanation: unified.explanation,
    recommendedAction: unified.recommendedAction,
  };
}

/**
 * Runs evaluation on a benchmark dataset and computes precision, recall, F1, accuracy, and confusion matrix
 */
export async function runBenchmarkEvaluation(dataset: BenchmarkTestCase[] = BENCHMARK_DATASET): Promise<BenchmarkReport> {
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  const categoryBreakdown: Record<string, { total: number; correctlyIdentified: number }> = {};
  const results = [];

  for (const tc of dataset) {
    const analysis = await analyzeMessageForRisk(tc.text, 'seller');
    const predictedMalicious = analysis.riskScore >= 60;

    let status: 'CORRECT' | 'FALSE_POSITIVE' | 'FALSE_NEGATIVE';
    if (tc.isMalicious && predictedMalicious) {
      truePositives++;
      status = 'CORRECT';
    } else if (!tc.isMalicious && !predictedMalicious) {
      trueNegatives++;
      status = 'CORRECT';
    } else if (!tc.isMalicious && predictedMalicious) {
      falsePositives++;
      status = 'FALSE_POSITIVE';
    } else {
      falseNegatives++;
      status = 'FALSE_NEGATIVE';
    }

    if (!categoryBreakdown[tc.threatType]) {
      categoryBreakdown[tc.threatType] = { total: 0, correctlyIdentified: 0 };
    }
    categoryBreakdown[tc.threatType].total++;
    if (status === 'CORRECT') {
      categoryBreakdown[tc.threatType].correctlyIdentified++;
    }

    results.push({
      id: tc.id,
      language: tc.language,
      text: tc.text,
      threatType: tc.threatType,
      isMalicious: tc.isMalicious,
      predictedScore: analysis.riskScore,
      predictedCategory: analysis.riskCategory,
      engine: analysis.detectionEngine,
      status,
    });
  }

  const totalCases = dataset.length;
  const benignCount = dataset.filter((c) => !c.isMalicious).length;
  const maliciousCount = dataset.filter((c) => c.isMalicious).length;

  const accuracy = (truePositives + trueNegatives) / totalCases;
  const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 1;
  const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 1;
  const falsePositiveRate = falsePositives + trueNegatives > 0 ? falsePositives / (falsePositives + trueNegatives) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    totalCases,
    benignCount,
    maliciousCount,
    accuracy: Math.round(accuracy * 100) / 100,
    precision: Math.round(precision * 100) / 100,
    recall: Math.round(recall * 100) / 100,
    falsePositiveRate: Math.round(falsePositiveRate * 100) / 100,
    f1Score: Math.round(f1Score * 100) / 100,
    confusionMatrix: {
      truePositives,
      trueNegatives,
      falsePositives,
      falseNegatives,
    },
    categoryBreakdown,
    results,
  };
}
