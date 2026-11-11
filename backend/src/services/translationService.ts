import { GoogleGenAI } from '@google/genai';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ta: 'Tamil',
  hi: 'Hindi',
};

const CURATED_TRANSLATIONS: Record<string, Record<string, string>> = {
  'Hello, could you share the warranty details, condition, and if the original battery charger is included?': {
    en: 'Hello, could you share the warranty details, condition, and if the original battery charger is included?',
    ta: 'வணக்கம், உத்தரவாத விவரங்கள், நிலை மற்றும் அசல் பேட்டரி சார்ஜர் சேர்க்கப்பட்டுள்ளதா என்பதைப் பகிர முடியுமா?',
    hi: 'नमस्ते, क्या आप वारंटी विवरण, स्थिति और क्या मूल बैटरी चार्जर शामिल है, साझा कर सकते हैं?',
  },
  'Hello, is the camera still in stock? Does it come with the original box?': {
    en: 'Hello, is the camera still in stock? Does it come with the original box?',
    ta: 'வணக்கம், கேமரா இன்னும் கையிருப்பில் உள்ளதா? அசல் பெட்டியுடன் வருமா?',
    hi: 'नमस्ते, क्या कैमरा अभी भी स्टॉक में है? क्या यह मूल बॉक्स के साथ आता है?',
  },
  'Great! I would like to pay through TrustBridge secure escrow payment.': {
    en: 'Great! I would like to pay through TrustBridge secure escrow payment.',
    ta: 'சிறந்தது! டிரஸ்ட்பிரிட்ஜ் பாதுகாப்பான எஸ்க்ரோ பேமெண்ட் மூலம் பணம் செலுத்த விரும்புகிறேன்.',
    hi: 'बहुत बढ़िया! मैं ट्रस्टब्रिज सुरक्षित एस्क्रो भुगतान के माध्यम से भुगतान करना चाहूंगी।',
  },
  'Yes absolutely, it is brand new and available in a sealed box with warranty card.': {
    en: 'Yes absolutely, it is brand new and available in a sealed box with warranty card.',
    ta: 'ஆம் நிச்சயமாக, இது புத்தம் புதியது மற்றும் உத்தரவாத அட்டையுடன் சீல் செய்யப்பட்ட பெட்டியில் கிடைக்கிறது.',
    hi: 'हाँ बिल्कुल, बिल्कुल नया है और सीलबंद बॉक्स में वारंटी कार्ड के साथ उपलब्ध है।',
  },
  'வணக்கம், கேமரா இன்னும் கையிருப்பில் உள்ளதா? அசல் பெட்டியுடன் வருமா?': {
    en: 'Hello, is the camera still in stock? Does it come with the original box?',
    ta: 'வணக்கம், கேமரா இன்னும் கையிருப்பில் உள்ளதா? அசல் பெட்டியுடன் வருமா?',
    hi: 'नमस्ते, क्या कैमरा अभी भी स्टॉक में है? क्या यह मूल बॉक्स के साथ आता है?',
  },
  'சிறந்தது! டிரஸ்ட்பிரிட்ஜ் பாதுகாப்பான எஸ்க்ரோ பேமெண்ட் மூலம் பணம் செலுத்த விரும்புகிறேன்.': {
    en: 'Great! I would like to pay through TrustBridge secure escrow payment.',
    ta: 'சிறந்தது! டிரஸ்ட்பிரிட்ஜ் பாதுகாப்பான எஸ்க்ரோ பேமெண்ட் மூலம் பணம் செலுத்த விரும்புகிறேன்.',
    hi: 'बहुत बढ़िया! मैं ट्रस्टब्रिज सुरक्षित एस्क्रो भुगतान के माध्यम से भुगतान करना चाहूंगी।',
  },
  'हाँ बिल्कुल, बिल्कुल नया है और सीलबंद बॉक्स में वारंटी कार्ड के साथ उपलब्ध है।': {
    en: 'Yes absolutely, it is brand new and available in a sealed box with warranty card.',
    ta: 'ஆம் நிச்சயமாக, இது புத்தம் புதியது மற்றும் உத்தரவாத அட்டையுடன் சீல் செய்யப்பட்ட பெட்டியில் கிடைக்கிறது.',
    hi: 'हाँ बिल्कुल, बिल्कुल नया है और सीलबंद बॉक्स में वारंटी कार्ड के साथ उपलब्ध है।',
  },
  'प्लेटफॉर्म पर 12% टैक्स लगेगा। आप तुरंत इस बाहरी लिंक http://pay-fast-direct.net/upi/deal88 पर ₹1,30,000 भेजें और अपना 6-अंकीय OTP शेयर करें, मैं 10 मिनट में कुरियर कर दूंगा वर्ना ऑफर रद्द!': {
    en: 'Platform will charge 12% tax. Send ₹1,30,000 immediately to this external link http://pay-fast-direct.net/upi/deal88 and share your 6-digit OTP, I will courier in 10 minutes otherwise deal cancelled!',
    ta: 'தளத்தில் 12% வரி விதிக்கப்படும். உடனடியாக இந்த வெளிப்புற இணைப்பு http://pay-fast-direct.net/upi/deal88 க்கு ₹1,30,000 அனுப்பி உங்கள் 6 இலக்க OTP-ஐ பகிரவும், 10 நிமிடங்களில் கூரியர் செய்கிறேன் இல்லையென்றால் சலுகை ரத்து!',
    hi: 'प्लेटफॉर्म पर 12% टैक्स लगेगा। आप तुरंत इस बाहरी लिंक http://pay-fast-direct.net/upi/deal88 पर ₹1,30,000 भेजें और अपना 6-अंकीय OTP शेयर करें, मैं 10 मिनट में कुरियर कर दूंगा वर्ना ऑफर रद्द!',
  },
};

let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAI) genAI = new GoogleGenAI();
  return genAI;
}

export async function translateText(
  text: string,
  fromLang: string,
  targetLangs: string[]
): Promise<Record<string, string>> {
  const translations: Record<string, string> = {};
  translations[fromLang] = text;

  const cleanKey = text.trim();
  if (CURATED_TRANSLATIONS[cleanKey]) {
    const cached = CURATED_TRANSLATIONS[cleanKey];
    for (const lang of targetLangs) {
      if (cached[lang]) translations[lang] = cached[lang];
    }
  }

  const missingLangs = targetLangs.filter((l) => !translations[l] || translations[l] === text);
  if (missingLangs.length > 0 && process.env.GEMINI_API_KEY) {
    try {
      const ai = getGenAI();
      const targetsStr = missingLangs.map((l) => `${l} (${LANGUAGE_NAMES[l] || l})`).join(', ');
      const prompt = `Translate the following marketplace chat message from ${LANGUAGE_NAMES[fromLang] || fromLang} into: ${targetsStr}.
Original text: "${text}"

Respond STRICTLY in JSON format with language codes as keys ("en", "ta", "hi"):
{
  "en": "...",
  "ta": "...",
  "hi": "..."
}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.1 },
      });
      if (response.text) {
        const parsed = JSON.parse(response.text);
        for (const [code, trans] of Object.entries(parsed)) {
          if (typeof trans === 'string' && trans.trim()) {
            translations[code] = trans.trim();
          }
        }
      }
    } catch (err) {
      console.warn('[Translation Service] Gemini translation notice:', err);
    }
  }

  for (const lang of targetLangs) {
    if (!translations[lang]) translations[lang] = text;
  }
  return translations;
}
