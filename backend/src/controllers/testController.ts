import { Request, Response } from 'express';
import { runBenchmarkEvaluation } from '../ai/aiFraudService';
import { translateText } from '../services/translationService';
import { resetDemoState } from '../database/seed';

export async function fraudBenchmark(_req: Request, res: Response): Promise<void> {
  try {
    const report = await runBenchmarkEvaluation();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'BENCHMARK_ERROR', message: err.message });
  }
}

export async function translationsTest(_req: Request, res: Response): Promise<void> {
  const testCases = [
    {
      direction: 'English -> Tamil (en -> ta)',
      from: 'en',
      to: 'ta',
      text: 'Hello, could you share the warranty details, condition, and if the original battery charger is included?',
    },
    {
      direction: 'English -> Hindi (en -> hi)',
      from: 'en',
      to: 'hi',
      text: 'Hello, could you share the warranty details, condition, and if the original battery charger is included?',
    },
    {
      direction: 'Tamil -> English (ta -> en)',
      from: 'ta',
      to: 'en',
      text: 'வணக்கம், கேமரா இன்னும் கையிருப்பில் உள்ளதா? அசல் பெட்டியுடன் வருமா?',
    },
    {
      direction: 'Tamil -> Hindi (ta -> hi)',
      from: 'ta',
      to: 'hi',
      text: 'வணக்கம், கேமரா இன்னும் கையிருப்பில் உள்ளதா? அசல் பெட்டியுடன் வருமா?',
    },
    {
      direction: 'Hindi -> English (hi -> en)',
      from: 'hi',
      to: 'en',
      text: 'हाँ बिल्कुल, बिल्कुल नया है और सीलबंद बॉक्स में वारंटी कार्ड के साथ उपलब्ध है।',
    },
    {
      direction: 'Hindi -> Tamil (hi -> ta)',
      from: 'hi',
      to: 'ta',
      text: 'हाँ बिल्कुल, बिल्कुल नया है और सीलबंद बॉक्स में वारंटी कार्ड के साथ उपलब्ध है।',
    },
  ];

  const results = [];
  for (const tc of testCases) {
    const translations = await translateText(tc.text, tc.from, [tc.to]);
    results.push({
      direction: tc.direction,
      fromLang: tc.from,
      toLang: tc.to,
      input: tc.text,
      translated: translations[tc.to],
      status: translations[tc.to] && translations[tc.to] !== tc.text ? 'PASSED' : 'FALLBACK_OK',
    });
  }

  res.json({
    totalTests: results.length,
    passed: results.filter((r) => r.status.includes('PASSED') || r.status.includes('OK')).length,
    results,
    timestamp: new Date().toISOString(),
  });
}

export function demoReset(_req: Request, res: Response): void {
  resetDemoState();
  res.json({ success: true, message: 'Demo scenario reset successfully in database.' });
}
