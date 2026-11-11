import { NLPAnalysisResult, EvidenceReference, RiskCategory } from './types';

/**
 * Normalizes text across English, Tamil, Hindi with leetspeak/obfuscation dismantling
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  // 1. Unicode NFKC normalization
  let normalized = text.normalize('NFKC');

  // 2. De-obfuscate common leetspeak tricks (e.g. 0TP -> otp, p@ssword -> password)
  normalized = normalized
    .replace(/\b0tp\b/gi, 'otp')
    .replace(/p[@a]ssw[o0]rd/gi, 'password')
    .replace(/[@a]cc[o0]unt/gi, 'account')
    .replace(/c[vV][vV]/gi, 'cvv')
    .replace(/w[hH][aA]ts[aA]pp/gi, 'whatsapp')
    .replace(/t[eE]l[eE]gr[aA]m/gi, 'telegram');

  // 3. Normalize extra spaces & newlines
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

interface ThreatPattern {
  id: string;
  category: string;
  description: string;
  regex: RegExp;
  baseScore: number;
  reasonTemplate: string;
}

const THREAT_PATTERNS: ThreatPattern[] = [
  // 1. OTP, PIN, Password & Credential Harvesting
  {
    id: 'CREDENTIAL_HARVESTING',
    category: 'Credential Phishing',
    description: 'Solicitation of one-time password (OTP), PIN, CVV, or passwords',
    regex: /\b(otp|one[-\s]time[-\s]password|verification\s*code|login\s*pin|password|debit\s*card\s*cvv|cvv\s*code|bank\s*password|aadhar\s*otp)\b|पासवर्ड|ओटीपी|सत्यापन\s*कोड|पिन|सीवीवी|கடவுச்சொல்|ஒருமுறை\s*கடவுச்சொல்|ஓடிபி|ரகசிய\s*எண்/i,
    baseScore: 45,
    reasonTemplate: 'Legitimate marketplaces and escrow agents never request passwords, PINs, CVVs, or OTPs from counter-parties.',
  },
  // 2. Payment Manipulation & Off-Platform Fee Evasion
  {
    id: 'FEE_EVASION_DIRECT_PAYMENT',
    category: 'Off-Platform Payment Evasion',
    description: 'Soliciting direct UPI, Zelle, Western Union, or external payment to bypass escrow',
    regex: /\b(save\s*commission|without\s*commission|no\s*fee|avoid\s*commission|save\s*tax|12%\s*tax|platform\s*fee|bypass\s*commission|direct\s*upi|gpay\s*directly|phonepe|western\s*union|wire\s*transfer|wire\s*\$|zelle|friends\s*&\s*family)\b|வெளிப்புற\s*இணைப்பு|நேரடியாக\s*பணம்|தளத்திற்கு\s*வெளியே|வங்கி\s*பரிமாற்றம்|கூகுள்\s*பே\s*மூலம்|எஸ்க்ரோ\s*கட்டணம்\s*தேவையில்லை|வரி\s*சேமிப்பு|கமிஷன்\s*இல்லாமல்|கமிஷன்\s*மிச்சமாகும்|கமிஷன்|कमीशन\s*बचाएं|बिना\s*किसी\s*कमीशन|टैक्स\s*बचत|सीधे\s*पैसे|सीधा\s*भुगतान|फोनपे|बैंक\s*ट्रांसफर/i,
    baseScore: 35,
    reasonTemplate: 'Coercing buyers into off-platform wire transfers voids all TrustBridge Escrow safeguard protections.',
  },
  // 3. Platform Authority / Support Impersonation
  {
    id: 'SUPPORT_IMPERSONATION',
    category: 'Impersonation',
    description: 'Impersonating TrustBridge support, administrator, or compliance security team',
    regex: /\b(from\s*trustbridge|trustbridge\s*support|admin\s*team|security\s*team|official\s*agent|compliance\s*officer|refund\s*department)\b|டிரஸ்ட்பிரிட்ஜ்\s*அட்மின்|டிரஸ்ட்பிரிட்ஜ்\s*ஆதரவு|ட்ரிபூனல்|பாதுகாப்பு\s*குழு|பாதுகாப்பு\s*அதிகாரி|ट्रस्टब्रिज\s*सिक्यूरिटी|ट्रस्टब्रिज\s*सपोर्ट|अधिकारी/i,
    baseScore: 35,
    reasonTemplate: 'Asserting official administrative or security authority within a peer-to-peer marketplace chat.',
  },
  // 4. Coercive Urgency & False Ultimatums
  {
    id: 'COERCIVE_URGENCY',
    category: 'Urgency Manipulation',
    description: 'High psychological urgency, rapid cancellation ultimatums, or account threats',
    regex: /\b(urgently|immediately|within\s*10\s*minutes|within\s*5\s*minutes|now\s*or\s*cancel|right\s*away|offer\s*expire|hurry|account\s*suspended|account\s*blocked|or\s*i\s*call\s*police)\b|உடனடியாக|10\s*நிமிடங்களில்|சலுகை\s*ரத்து|இப்போதே|கணக்கு\s*முடக்கப்பட்டுவிட்டது|तुरंत|10\s*मिनट\s*में|ऑफर\s*रद्द|खाता\s*ब्लॉक/i,
    baseScore: 25,
    reasonTemplate: 'Artificial time pressure is a classic social engineering manipulation designed to prevent claim verification.',
  },
  // 5. Channel Diversion
  {
    id: 'CHANNEL_DIVERSION',
    category: 'Channel Diversion',
    description: 'Attempting to divert communication off-platform to unmonitored WhatsApp/Telegram',
    regex: /\b(whatsapp|telegram|signal|call\s*me\s*at|message\s*privately)\b|வாட்ஸ்அப்|டெலிகிராம்|व्हाट्सएप|टेलीग्राम/i,
    baseScore: 25,
    reasonTemplate: 'Moving communication off-platform removes the legally binding chat audit log required for escrow dispute arbitration.',
  },
  // 6. Fake Payment Acknowledgement / Overpayment Reversal Lures
  {
    id: 'FAKE_PAYMENT_OVERPAYMENT',
    category: 'Payment Fraud',
    description: 'Fake payment receipts, unverified transfer claims, or overpayment reversal lures',
    regex: /\b(already\s*paid|screenshot\s*confirmation|overpayment|instant\s*reversal|connect\s*your\s*debit\s*card)\b|கூடுதல்\s*பணம்|திரும்பப்\s*பெற|एस्क्रो\s*में.*भेज\s*दिए|रिफंड\s*पाने/i,
    baseScore: 30,
    reasonTemplate: 'Falsified payment proofs combined with external links or credential demands indicate advance fee extortion.',
  },
  // 7. Advance Fee & Investment Lures
  {
    id: 'ADVANCE_FEE_LURE',
    category: 'Advance Fee Fraud',
    description: 'Guaranteed massive discount, investment return, or prize redemption lure',
    regex: /\b(guaranteed\s*profit|20%\s*discount|discount|double\s*your\s*money|instant\s*cashback|claim\s*lottery)\b|பரிசு|डबल\s*पैसे|छूट|20%\s*डिस्काउंट|डिस्काउंट/i,
    baseScore: 20,
    reasonTemplate: 'Unrealistic discounts offered conditional on bypassing platform escrow protections.',
  },
];

/**
 * Executes NLP-based scam analysis with multilingual support
 */
export function analyzeMessageNLP(content: string, senderRole: string): NLPAnalysisResult {
  const normalized = normalizeText(content);
  const lower = normalized.toLowerCase();

  const indicators: string[] = [];
  const evidence: EvidenceReference[] = [];
  const detectedThreatTypes: string[] = [];
  let score = 5; // Base benign score

  // Check positive safety intent: explicit request to complete transaction through TrustBridge escrow
  // Strictly ensure it does not include fake maintenance excuses or off-platform wire diversions
  const hasLegitimateEscrowIntent =
    /through trustbridge|via trustbridge|pay\s*through\s*trustbridge|டிரஸ்ட்பிரிட்ஜ்.*எஸ்க்ரோ|டிரஸ்ட்பிரிட்ஜ்\s*தளத்திலேயே|ट्रस्टब्रिज.*भुगतान|सुरक्षित\s*एस्क्रो/i.test(
      normalized
    ) && !/maintenance|broken|down|western\s*union|wire|cancel/i.test(normalized);

  for (const pattern of THREAT_PATTERNS) {
    // If pattern is support impersonation, skip if sender is legitimately support/admin/system
    if (
      pattern.id === 'SUPPORT_IMPERSONATION' &&
      (senderRole === 'support' || senderRole === 'admin' || senderRole === 'system')
    ) {
      continue;
    }

    const match = normalized.match(pattern.regex);
    if (match) {
      score += pattern.baseScore;
      indicators.push(pattern.description);
      detectedThreatTypes.push(pattern.category);
      evidence.push({
        textSnippet: match[0],
        indicatorType: pattern.id,
        reason: pattern.reasonTemplate,
      });
    }
  }

  // Compound synergy: Channel diversion + Fee evasion/Discount is a severe signature
  if (
    detectedThreatTypes.includes('Channel Diversion') &&
    (detectedThreatTypes.includes('Off-Platform Payment Evasion') || detectedThreatTypes.includes('Advance Fee Fraud'))
  ) {
    score += 15;
    indicators.push('Compound Threat: Off-platform communication diversion combined with fee evasion lure');
  }

  // Mitigate false positives: if legitimate on-platform escrow intent is explicitly affirmed
  // and no critical credential phishing or external links exist
  if (
    hasLegitimateEscrowIntent &&
    !detectedThreatTypes.includes('Credential Phishing') &&
    !detectedThreatTypes.includes('Channel Diversion')
  ) {
    score = Math.min(score, 10);
  }

  const finalScore = Math.min(Math.max(score, 0), 100);
  const category: RiskCategory =
    finalScore >= 80 ? 'CRITICAL' : finalScore >= 60 ? 'HIGH' : finalScore >= 30 ? 'MEDIUM' : 'LOW';

  return {
    score: finalScore,
    category,
    confidence: indicators.length > 0 ? 0.95 : 0.98,
    indicators: indicators.length > 0 ? indicators : ['No anomalous NLP fraud patterns identified'],
    evidence,
    normalizedText: normalized,
    detectedThreatTypes,
  };
}
