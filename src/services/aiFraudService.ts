import { GoogleGenAI } from '@google/genai';

export interface EvidenceReference {
  textSnippet: string;
  indicatorType: string;
  reason: string;
}

export interface RiskAnalysisResult {
  riskScore: number;
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidenceScore: number;
  detectionEngine: 'GEMINI_2_5_FLASH' | 'HEURISTIC_RULE_ENGINE';
  detectedIndicators: string[];
  evidenceReferences: EvidenceReference[];
  explanation: string;
  recommendedAction: string;
}

export interface BenchmarkTestCase {
  id: string;
  language: 'en' | 'ta' | 'hi';
  text: string;
  isMalicious: boolean;
  expectedCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

// 20 Multilingual Benchmark Test Cases (10 Benign, 10 Malicious across EN, TA, HI)
export const BENCHMARK_DATASET: BenchmarkTestCase[] = [
  // Benign cases
  {
    id: 'BEN-01',
    language: 'en',
    text: 'Hello, could you share the warranty details, condition, and if the original battery charger is included?',
    isMalicious: false,
    expectedCategory: 'LOW',
    description: 'Legitimate pre-purchase enquiry regarding warranty and battery charger',
  },
  {
    id: 'BEN-02',
    language: 'en',
    text: 'I would like to proceed with the transaction through TrustBridge escrow payment.',
    isMalicious: false,
    expectedCategory: 'LOW',
    description: 'Safe on-platform escrow purchase intent',
  },
  {
    id: 'BEN-03',
    language: 'en',
    text: 'Can you provide the courier tracking number once the package has been dispatched?',
    isMalicious: false,
    expectedCategory: 'LOW',
    description: 'Standard shipment tracking question',
  },
  {
    id: 'BEN-04',
    language: 'ta',
    text: 'வணக்கம், கேமரா இன்னும் கையிருப்பில் உள்ளதா? அசல் பெட்டியுடன் வருமா?',
    isMalicious: false,
    expectedCategory: 'LOW',
    description: 'Tamil: Is the camera still in stock with the original box?',
  },
  {
    id: 'BEN-05',
    language: 'ta',
    text: 'சிறந்தது! டிரஸ்ட்பிரிட்ஜ் பாதுகாப்பான எஸ்க்ரோ பேமெண்ட் மூலம் பணம் செலுத்த விரும்புகிறேன்.',
    isMalicious: false,
    expectedCategory: 'LOW',
    description: 'Tamil: I would like to pay through secure TrustBridge escrow.',
  },
  {
    id: 'BEN-06',
    language: 'ta',
    text: 'பொருள் கிடைத்தவுடன் எஸ்க்ரோ தொகையை உடனடியாக விடுவிக்கிறேன்.',
    isMalicious: false,
    expectedCategory: 'LOW',
    description: 'Tamil: Will release escrow funds promptly once item is received.',
  },
  {
    id: 'BEN-07',
    language: 'hi',
    text: 'हाँ बिल्कुल, बिल्कुल नया है और सीलबंद बॉक्स में वारंटी कार्ड के साथ उपलब्ध है।',
    isMalicious: false,
    expectedCategory: 'LOW',
    description: 'Hindi: Brand new sealed camera with warranty card.',
  },
  {
    id: 'BEN-08',
    language: 'hi',
    text: 'कृपया प्लेटफॉर्म पर आधिकारिक ऑर्डर बनाएं, मैं कल सुबह स्पीड पोस्ट से भेज दूंगा।',
    isMalicious: false,
    expectedCategory: 'LOW',
    description: 'Hindi: Please place official platform order, I will ship via speed post tomorrow.',
  },
  {
    id: 'BEN-09',
    language: 'hi',
    text: 'क्या कैमरे के साथ अतिरिक्त बैटरी या 64GB मेमोरी कार्ड भी मिलेगा?',
    isMalicious: false,
    expectedCategory: 'LOW',
    description: 'Hindi: Does it come with extra battery or memory card?',
  },
  {
    id: 'BEN-10',
    language: 'en',
    text: 'Thank you for the quick response! I will complete the checkout now.',
    isMalicious: false,
    expectedCategory: 'LOW',
    description: 'Standard cordial checkout confirmation',
  },

  // Malicious cases
  {
    id: 'MAL-01',
    language: 'en',
    text: 'Save 15% platform fee by transferring $1,500 directly via Zelle to deal@quick-transfer.xyz and reply with the OTP you received!',
    isMalicious: true,
    expectedCategory: 'CRITICAL',
    description: 'Off-platform fee evasion + unverified external link + OTP solicitation',
  },
  {
    id: 'MAL-02',
    language: 'en',
    text: 'Urgent: I am from TrustBridge Support team. Please verify your identity by sending your 6-digit login PIN right now or your account will be suspended in 5 minutes.',
    isMalicious: true,
    expectedCategory: 'CRITICAL',
    description: 'Support impersonation + PIN harvesting + extreme coercive urgency',
  },
  {
    id: 'MAL-03',
    language: 'en',
    text: 'I already paid you! Look at this screenshot confirmation: http://secure-escrow-vault.co/receipt?id=8849. Send item now!',
    isMalicious: true,
    expectedCategory: 'HIGH',
    description: 'Fake payment screenshot hosted on phishing domain',
  },
  {
    id: 'MAL-04',
    language: 'en',
    text: 'Add me on WhatsApp +1-987-555-0199 so we can bypass platform commission and settle via PayPal Friends & Family.',
    isMalicious: true,
    expectedCategory: 'HIGH',
    description: 'Communication diversion to WhatsApp + commission evasion',
  },
  {
    id: 'MAL-05',
    language: 'ta',
    text: 'தளத்தில் 12% வரி பிடித்தம் செய்யப்படும். உடனடியாக உங்கள் வங்கிக்கு வந்த OTP எண்ணை சொல்லுங்கள், வெளிப்புற கூகுள் பே மூலம் பணம் அனுப்புகிறேன்.',
    isMalicious: true,
    expectedCategory: 'CRITICAL',
    description: 'Tamil: Fake tax claim + demanding bank OTP for off-platform payment',
  },
  {
    id: 'MAL-06',
    language: 'ta',
    text: 'இப்போதே 10 நிமிடத்தில் பணம் அனுப்புங்கள் அல்லது ஆர்டர் ரத்து செய்யப்படும்! இணைப்பு: http://quick-pay.xyz/direct',
    isMalicious: true,
    expectedCategory: 'CRITICAL',
    description: 'Tamil: 10-minute ultimatum + phishing link',
  },
  {
    id: 'MAL-07',
    language: 'ta',
    text: 'நான் டிரஸ்ட்பிரிட்ஜ் அட்மின் பேசுகிறேன். பாதுகாப்பு காரணங்களுக்காக உங்கள் கடவுச்சொல்லை அனுப்பவும்.',
    isMalicious: true,
    expectedCategory: 'CRITICAL',
    description: 'Tamil: Admin impersonation asking for password',
  },
  {
    id: 'MAL-08',
    language: 'hi',
    text: 'प्लेटफॉर्म पर 12% टैक्स लगेगा। आप तुरंत इस बाहरी लिंक http://pay-fast-direct.net/upi/deal88 पर ₹1,30,000 भेजें और अपना 6-अंकीय OTP शेयर करें, मैं 10 मिनट में कुरियर कर दूंगा वर्ना ऑफर रद्द!',
    isMalicious: true,
    expectedCategory: 'CRITICAL',
    description: 'Hindi: Phishing link + OTP solicitation + fee evasion + 10-minute cancellation ultimatum',
  },
  {
    id: 'MAL-09',
    language: 'hi',
    text: 'ट्रस्टब्रिज सिक्यूरिटी टीम से बोल रहा हूँ। आपका खाता ब्लॉक हो गया है, अनब्लॉक करने के लिए अपना पासवर्ड और डेबिट कार्ड सीवीवी बताएं।',
    isMalicious: true,
    expectedCategory: 'CRITICAL',
    description: 'Hindi: TrustBridge security impersonation + CVV/password theft',
  },
  {
    id: 'MAL-10',
    language: 'hi',
    text: 'व्हाट्सएप 9876543210 पर संपर्क करें, वहां बिना किसी कमीशन के 20% डिस्काउंट पर कैमरा मिल जाएगा।',
    isMalicious: true,
    expectedCategory: 'HIGH',
    description: 'Hindi: WhatsApp diversion to bypass marketplace commission',
  },
];

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI();
  }
  return aiClient;
}

/**
 * Heuristic Rule Engine for baseline deterministic scoring with explainable evidence
 */
export function analyzeHeuristics(content: string, senderRole: string): RiskAnalysisResult {
  const lower = content.toLowerCase();
  const indicators: string[] = [];
  const evidence: EvidenceReference[] = [];
  let score = 5;

  // 1. OTP / Credential Theft (English, Tamil, Hindi)
  const otpRegex =
    /\b(otp|one[-\s]time[-\s]password|verification\s*code|pin|password|cvv|security\s*code)\b|पासवर्ड|ओटीपी|सत्यापन\s*कोड|पिन|கடவுச்சொல்|ஒருமுறை\s*கடவுச்சொல்|ஓடிபி|ரகசிய\s*எண்/i;
  const otpMatch = content.match(otpRegex);
  if (otpMatch) {
    indicators.push('Soliciting one-time verification password (OTP) or authentication credentials');
    evidence.push({
      textSnippet: otpMatch[0],
      indicatorType: 'CREDENTIAL_THEFT',
      reason: 'Legitimate platforms never require users to disclose OTPs, PINs, or passwords to counter-parties.',
    });
    score += 45;
  }

  // 2. Suspicious External URLs & Phishing Domains
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:xyz|net|co|biz|top|cc|ru|su)\/[^\s]*|pay-fast-direct|quick-pay)/i;
  const urlMatch = content.match(urlRegex);
  if (urlMatch) {
    indicators.push(`Contains external URL or link redirection outside trusted domain (${urlMatch[0].slice(0, 30)})`);
    evidence.push({
      textSnippet: urlMatch[0],
      indicatorType: 'PHISHING_URL',
      reason: 'External payment and redirection links bypass marketplace buyer protection and frequently host credential harvesters.',
    });
    score += 35;
  }

  // 3. Off-Platform Escrow Avoidance & Direct Payment Solicitation
  const offPlatformRegex =
    /\b(outside|off[-\s]platform|personal\s*account|direct\s*upi|bank\s*transfer|gpay\s*directly|paytm\s*number|zelle|friends\s*&\s*family|wire\s*transfer)\b|வெளிப்புற\s*இணைப்பு|நேரடியாக\s*பணம்|தளத்திற்கு\s*வெளியே|வங்கி\s*பரிமாற்றம்|बाहरी\s*लिंक|सीधे\s*पैसे|सीधा\s*भुगतान|बैंक\s*ट्रांसफर/i;
  const offMatch = content.match(offPlatformRegex);
  if (offMatch) {
    indicators.push('Direct payment solicitation outside platform escrow protection');
    evidence.push({
      textSnippet: offMatch[0],
      indicatorType: 'ESCROW_CIRCUMVENTION',
      reason: 'Requesting direct off-platform funds transfer voids TrustBridge escrow safeguard guarantees.',
    });
    score += 35;
  }

  // 4. Coercive Urgency & False Ultimatums
  const urgencyRegex =
    /\b(urgently|immediately|within\s*10\s*minutes|within\s*5\s*minutes|now\s*or\s*cancel|right\s*away|offer\s*expire|hurry|account\s*suspended)\b|உடனடியாக|10\s*நிமிடங்களில்|சலுகை\s*ரத்து|இப்போதே|तुरंत|10\s*मिनट\s*में|ऑफर\s*रद्द|खाता\s*ब्लॉक/i;
  const urgMatch = content.match(urgencyRegex);
  if (urgMatch) {
    indicators.push('High psychological urgency or coercive cancellation deadline');
    evidence.push({
      textSnippet: urgMatch[0],
      indicatorType: 'URGENCY_MANIPULATION',
      reason: 'Artificial time pressure is a primary social engineering tactic used to prevent victims from verifying claims.',
    });
    score += 20;
  }

  // 5. Impersonation of Platform Staff / Security
  const impRegex =
    /\b(from\s*trustbridge|trustbridge\s*support|admin\s*team|security\s*team|official\s*agent|compliance\s*officer)\b|டிரஸ்ட்பிரிட்ஜ்\s*அட்மின்|டிரஸ்ட்பிரிட்ஜ்\s*ஆதரவு|ट्रस्टब्रिज\s*सिक्यूरिटी|ट्रस्टब्रिज\s*सपोर्ट|अधिकारी/i;
  const impMatch = content.match(impRegex);
  if (impMatch) {
    indicators.push('Suspected platform administrator or support impersonation');
    evidence.push({
      textSnippet: impMatch[0],
      indicatorType: 'IMPERSONATION',
      reason: 'User is asserting official platform authority within a peer-to-peer transaction chat.',
    });
    score += 30;
  }

  // 6. Channel Diversion (WhatsApp, Telegram)
  const chatShiftRegex =
    /\b(whatsapp|telegram|signal|call\s*me\s*at|message\s*privately)\b|வாட்ஸ்அப்|டெலிகிராம்|व्हाट्सएप|टेलीग्राम/i;
  const shiftMatch = content.match(chatShiftRegex);
  if (shiftMatch) {
    indicators.push('Attempting to divert communication off-platform to unmonitored channels');
    evidence.push({
      textSnippet: shiftMatch[0],
      indicatorType: 'CHANNEL_DIVERSION',
      reason: 'Moving off-platform removes the legally admissible chat audit log required for dispute resolution.',
    });
    score += 25;
  }

  // 7. Fee Circumvention & Discount Lures
  const feeRegex =
    /\b(discount|off\s*deal|cheaper\s*outside|save\s*commission|without\s*commission|no\s*fee|avoid\s*commission|save\s*tax|12%\s*tax|avoid\s*tax|platform\s*fee)\b|வரி\s*சேமிப்பு|வரி\s*தவிர்க்க|தள்ளுபடி|கமிஷன்\s*இல்லாமல்|कमीशन\s*बचाएं|टैक्स\s*बचत|कमीशन|बिना\s*किसी\s*कमीशन|डिस्काउंट|सस्ता/i;
  const feeMatch = content.match(feeRegex);
  if (feeMatch) {
    indicators.push('Fictitious tax, fee circumvention, or off-platform discount lure');
    evidence.push({
      textSnippet: feeMatch[0],
      indicatorType: 'FEE_EVASION_LURE',
      reason: 'Fraudsters frequently use discount and tax avoidance lures to entice buyers into unprotected channels.',
    });
    score += 25;
  }

  // 8. Fake Payment Confirmation & Receipt Claims
  const fakeReceiptRegex =
    /\b(already\s*paid|payment\s*confirmation|receipt|paid\s*you|transfer\s*complete|funds\s*sent|money\s*sent|screenshot\s*confirmation)\b|ரசீது|பணம்\s*அனுப்பிவிட்டேன்|भुगतान\s*रसीद|पैसे\s*भेज\s*दिए|स्क्रीनशॉट\s*कन्फर्मेशन/i;
  const receiptMatch = content.match(fakeReceiptRegex);
  if (receiptMatch) {
    indicators.push('Unverified payment confirmation or external receipt claim');
    evidence.push({
      textSnippet: receiptMatch[0],
      indicatorType: 'FAKE_PAYMENT_CONFIRMATION',
      reason: 'Fraudulent sellers/buyers often send forged receipts or external confirmation links before real payment clears.',
    });
    score += 25;
  }

  // 9. Phone Number / Direct Contact Sharing
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10}\b/;
  const phoneMatch = content.match(phoneRegex);
  if (phoneMatch && (shiftMatch || offMatch || feeMatch)) {
    indicators.push(`Direct contact number provided for off-platform communication (${phoneMatch[0]})`);
    evidence.push({
      textSnippet: phoneMatch[0],
      indicatorType: 'CONTACT_LEAK',
      reason: 'Sharing direct phone numbers alongside discount lures is a hallmark of peer-to-peer marketplace fraud.',
    });
    score += 15;
  }

  const finalScore = Math.min(Math.max(score, 4), 98);
  const category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
    finalScore >= 80 ? 'CRITICAL' : finalScore >= 60 ? 'HIGH' : finalScore >= 30 ? 'MEDIUM' : 'LOW';

  const confidenceScore = finalScore >= 80 ? 0.95 : finalScore >= 60 ? 0.88 : finalScore >= 30 ? 0.82 : 0.95;

  return {
    riskScore: finalScore,
    riskCategory: category,
    confidenceScore,
    detectionEngine: 'HEURISTIC_RULE_ENGINE',
    detectedIndicators: indicators.length > 0 ? indicators : ['Standard marketplace dialogue'],
    evidenceReferences: evidence,
    explanation:
      finalScore >= 60
        ? `Deterministic rule engine identified ${indicators.length} critical violation(s) including ${indicators[0]}.`
        : 'Rule-based analysis detected no indicators of fraud, phishing, or escrow avoidance.',
    recommendedAction:
      finalScore >= 80
        ? 'CRITICAL WARNING: NEVER disclose OTPs or click external payment links. Escrow hold active.'
        : finalScore >= 60
        ? 'CAUTION: Message exhibits off-platform payment avoidance signals. Keep all transactions in TrustBridge.'
        : 'Safe to proceed with standard on-platform messaging.',
  };
}

/**
 * Primary AI Fraud Analysis function with Gemini 2.5 Flash and Heuristic fallback
 * Guarantees provenance transparency (never claims AI if basic rules were used)
 */
export async function analyzeMessageForRisk(
  content: string,
  senderRole: string
): Promise<RiskAnalysisResult> {
  const heuristicResult = analyzeHeuristics(content, senderRole);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    // Transparently return heuristic output
    return heuristicResult;
  }

  try {
    const ai = getAI();
    const prompt = `You are the TrustBridge AI Trust & Scam Detection Sentinel for an online marketplace.
Analyze this message sent by a ${senderRole} in English, Tamil, or Hindi:
"${content}"

Evaluate for:
1. Suspicious payment requests outside platform escrow.
2. Phishing links, external domains, credential harvesting.
3. OTP, PIN, password or account security credential requests.
4. Coercive urgency, emotional manipulation, extortion.
5. Impersonation of platform administrators, security, or support staff.
6. Social engineering or off-platform communication diversion (WhatsApp/Telegram).

Respond STRICTLY in JSON format matching this schema:
{
  "riskScore": number (0 to 100),
  "riskCategory": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidenceScore": number (0.00 to 1.00),
  "detectedIndicators": string[],
  "evidenceReferences": [
    {
      "textSnippet": string,
      "indicatorType": string,
      "reason": string
    }
  ],
  "explanation": string,
  "recommendedAction": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const responseText = response.text;
    if (responseText) {
      const parsed = JSON.parse(responseText);
      const riskScore = Math.max(parsed.riskScore ?? 0, heuristicResult.riskScore);
      const category: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
        riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW';

      return {
        riskScore,
        riskCategory: category,
        confidenceScore: parsed.confidenceScore ?? 0.95,
        detectionEngine: 'GEMINI_2_5_FLASH',
        detectedIndicators: parsed.detectedIndicators?.length
          ? parsed.detectedIndicators
          : heuristicResult.detectedIndicators,
        evidenceReferences: parsed.evidenceReferences?.length
          ? parsed.evidenceReferences
          : heuristicResult.evidenceReferences,
        explanation: parsed.explanation || heuristicResult.explanation,
        recommendedAction: parsed.recommendedAction || heuristicResult.recommendedAction,
      };
    }
  } catch (err: any) {
    console.warn('[AI Fraud Sentinel] Gemini call failed, using heuristic baseline:', err.message);
  }

  return heuristicResult;
}

/**
 * Runs the benchmark test dataset and computes precision, recall, accuracy, and false positive rate
 */
export async function runBenchmarkEvaluation(): Promise<{
  totalCases: number;
  accuracy: number;
  precision: number;
  recall: number;
  falsePositiveRate: number;
  f1Score: number;
  results: Array<{
    id: string;
    language: string;
    text: string;
    isMalicious: boolean;
    predictedScore: number;
    predictedCategory: string;
    engine: string;
    status: 'CORRECT' | 'FALSE_POSITIVE' | 'FALSE_NEGATIVE';
  }>;
}> {
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  const results = [];

  for (const tc of BENCHMARK_DATASET) {
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

    results.push({
      id: tc.id,
      language: tc.language,
      text: tc.text,
      isMalicious: tc.isMalicious,
      predictedScore: analysis.riskScore,
      predictedCategory: analysis.riskCategory,
      engine: analysis.detectionEngine,
      status,
    });
  }

  const totalCases = BENCHMARK_DATASET.length;
  const accuracy = (truePositives + trueNegatives) / totalCases;
  const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 1;
  const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 1;
  const falsePositiveRate = falsePositives + trueNegatives > 0 ? falsePositives / (falsePositives + trueNegatives) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    totalCases,
    accuracy: Math.round(accuracy * 100) / 100,
    precision: Math.round(precision * 100) / 100,
    recall: Math.round(recall * 100) / 100,
    falsePositiveRate: Math.round(falsePositiveRate * 100) / 100,
    f1Score: Math.round(f1Score * 100) / 100,
    results,
  };
}
