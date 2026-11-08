import bcrypt from 'bcryptjs';
import { db } from './index';

export function seedInitialDataIfEmpty(): void {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    return; // Already seeded
  }

  const defaultPasswordHash = bcrypt.hashSync('TrustBridge2026!', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, preferred_language, avatar, trust_score, phone, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProfile = db.prepare(`
    INSERT INTO user_profiles (user_id, business_name, verified, completed_orders, dispute_rate, account_age_days, trust_tier, verification_badges)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTxn = db.prepare(`
    INSERT INTO transactions (id, reference_number, buyer_id, seller_id, title, amount, currency, status, date, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertConv = db.prepare(`
    INSERT INTO conversations (id, type, nexconn_channel_id, buyer_id, seller_id, dispute_id, transaction_id, title, last_message_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMsg = db.prepare(`
    INSERT INTO messages (id, conversation_id, sender_id, sender_name, sender_role, content, language, translations_json, risk_score, risk_category, detected_indicators_json, recommended_action, detection_engine, confidence_score, is_flagged, is_false_positive, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDispute = db.prepare(`
    INSERT INTO disputes (id, reference_id, transaction_id, conversation_id, buyer_id, seller_id, assigned_agent_id, category, reason, status, priority, resolution_note, resolution_outcome, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEvidence = db.prepare(`
    INSERT INTO dispute_evidence (id, dispute_id, uploaded_by, file_url, file_name, file_size, mime_type, description, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO dispute_history (id, dispute_id, changed_by, from_status, to_status, action_taken, note, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTicket = db.prepare(`
    INSERT INTO support_tickets (id, ticket_number, dispute_id, conversation_id, requester_id, assigned_agent_id, title, summary, priority, status, category, created_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAlert = db.prepare(`
    INSERT INTO fraud_alerts (id, conversation_id, message_id, target_user_id, target_user_name, risk_score, category, indicators_json, severity, review_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details, ip_address, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedTransaction = db.transaction(() => {
    // 1. Users
    insertUser.run(
      'usr_buyer_1',
      'ananya.buyer@trustbridge.io',
      defaultPasswordHash,
      'Ananya Krishnan',
      'buyer',
      'ta',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      94,
      '+91 98765 43210',
      '2026-01-15T09:00:00Z',
      '2026-01-15T09:00:00Z'
    );
    insertProfile.run(
      'usr_buyer_1',
      null,
      1,
      18,
      '5.5%',
      295,
      'GOLD',
      JSON.stringify(['Govt ID Verified', 'Mobile OTP Verified', 'Payment Method Confirmed'])
    );

    insertUser.run(
      'usr_seller_1',
      'rajesh.seller@trustbridge.io',
      defaultPasswordHash,
      'Rajesh Sharma',
      'seller',
      'hi',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      68,
      '+91 91234 56789',
      '2026-02-10T14:20:00Z',
      '2026-02-10T14:20:00Z'
    );
    insertProfile.run(
      'usr_seller_1',
      'Sharma Electronics & Crafts',
      1,
      42,
      '14.2%',
      269,
      'STANDARD',
      JSON.stringify(['Business GST Verified', 'Mobile OTP Verified'])
    );

    insertUser.run(
      'usr_support_1',
      'maya.support@trustbridge.io',
      defaultPasswordHash,
      'Maya Patel (T&S Senior Agent)',
      'support',
      'en',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      99,
      '+91 80000 11223',
      '2025-08-01T10:00:00Z',
      '2025-08-01T10:00:00Z'
    );
    insertProfile.run(
      'usr_support_1',
      'TrustBridge Resolution Operations',
      1,
      340,
      '0%',
      462,
      'PLATINUM',
      JSON.stringify(['Official Certified Trust Specialist', 'Biometric Auth'])
    );

    insertUser.run(
      'usr_admin_1',
      'admin.lead@trustbridge.io',
      defaultPasswordHash,
      'David Vance (Chief Trust Officer)',
      'admin',
      'en',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      100,
      '+1 415 555 0199',
      '2025-01-01T00:00:00Z',
      '2025-01-01T00:00:00Z'
    );
    insertProfile.run(
      'usr_admin_1',
      'TrustBridge System Security',
      1,
      0,
      '0%',
      675,
      'PLATINUM',
      JSON.stringify(['Master Admin Certificate', 'Hardware Security Key'])
    );

    // 2. Transactions
    insertTxn.run(
      'txn_101',
      'TXN-2026-8849',
      'usr_buyer_1',
      'usr_seller_1',
      'Sony Alpha A7 IV Mirrorless Camera Kit',
      1850.0,
      'USD',
      'DISPUTED',
      '2026-11-04T12:00:00Z',
      'Consumer Electronics'
    );
    insertTxn.run(
      'txn_102',
      'TXN-2026-7731',
      'usr_buyer_1',
      'usr_seller_1',
      'DJI Mini 4 Pro Fly More Combo',
      890.0,
      'USD',
      'COMPLETED',
      '2026-10-18T15:30:00Z',
      'Drones & Robotics'
    );

    // 3. Conversations
    insertConv.run(
      'conv_direct_1',
      'direct',
      'nc_ch_buyer_seller_101',
      'usr_buyer_1',
      'usr_seller_1',
      null,
      'txn_101',
      'Sony Alpha A7 IV Purchase Enquiry',
      '2026-11-06T15:24:00Z',
      'active'
    );
    insertConv.run(
      'conv_dispute_1',
      'dispute_room',
      'nc_room_dsp_2026_901',
      'usr_buyer_1',
      'usr_seller_1',
      'dsp_901',
      'txn_101',
      'Dispute Room: TB-DSP-2026-901 (Sony A7 IV)',
      '2026-11-06T16:10:00Z',
      'active'
    );

    // 4. Messages
    insertMsg.run(
      'msg_01',
      'conv_direct_1',
      'usr_buyer_1',
      'Ananya Krishnan',
      'buyer',
      'வணக்கம், கேமரா இன்னும் கையிருப்பில் உள்ளதா? அசல் பெட்டியுடன் வருமா?',
      'ta',
      JSON.stringify({
        en: 'Hello, is the camera still in stock? Does it come with the original box?',
        hi: 'नमस्ते, क्या कैमरा अभी भी स्टॉक में है? क्या यह मूल बॉक्स के साथ आता है?',
        ta: 'வணக்கம், கேமரா இன்னும் கையிருப்பில் உள்ளதா? அசல் பெட்டியுடன் வருமா?',
      }),
      4,
      'LOW',
      JSON.stringify(['Standard pre-purchase question']),
      'Safe to respond through standard marketplace channel.',
      'HEURISTIC_RULE_ENGINE',
      0.95,
      0,
      0,
      '2026-11-06T14:10:00Z'
    );

    insertMsg.run(
      'msg_02',
      'conv_direct_1',
      'usr_seller_1',
      'Rajesh Sharma',
      'seller',
      'हाँ बिल्कुल, बिल्कुल नया है और सीलबंद बॉक्स में वारंटी कार्ड के साथ उपलब्ध है।',
      'hi',
      JSON.stringify({
        en: 'Yes absolutely, it is brand new and available in a sealed box with warranty card.',
        ta: 'ஆம் நிச்சயமாக, இது புத்தம் புதியது மற்றும் உத்தரவாத அட்டையுடன் சீல் செய்யப்பட்ட பெட்டியில் கிடைக்கிறது.',
        hi: 'हाँ बिल्कुल, बिल्कुल नया है और सीलबंद बॉक्स में वारंटी कार्ड के साथ उपलब्ध है।',
      }),
      6,
      'LOW',
      JSON.stringify(['Standard product confirmation']),
      'Standard transaction enquiry.',
      'HEURISTIC_RULE_ENGINE',
      0.92,
      0,
      0,
      '2026-11-06T14:14:00Z'
    );

    insertMsg.run(
      'msg_03',
      'conv_direct_1',
      'usr_buyer_1',
      'Ananya Krishnan',
      'buyer',
      'சிறந்தது! டிரஸ்ட்பிரிட்ஜ் பாதுகாப்பான எஸ்க்ரோ பேமெண்ட் மூலம் பணம் செலுத்த விரும்புகிறேன்.',
      'ta',
      JSON.stringify({
        en: 'Great! I would like to pay through TrustBridge secure escrow payment.',
        hi: 'बहुत बढ़िया! मैं ट्रस्टब्रिज सुरक्षित एस्क्रो भुगतान के माध्यम से भुगतान करना चाहूंगी।',
        ta: 'சிறந்தது! டிரஸ்ட்பிரிட்ஜ் பாதுகாப்பான எஸ்க்ரோ பேமெண்ட் மூலம் பணம் செலுத்த விரும்புகிறேன்.',
      }),
      5,
      'LOW',
      JSON.stringify(['Safe on-platform payment request']),
      'Encourage on-platform escrow.',
      'HEURISTIC_RULE_ENGINE',
      0.96,
      0,
      0,
      '2026-11-06T14:20:00Z'
    );

    insertMsg.run(
      'msg_04',
      'conv_direct_1',
      'usr_seller_1',
      'Rajesh Sharma',
      'seller',
      'प्लेटफॉर्म पर 12% टैक्स लगेगा। आप तुरंत इस बाहरी लिंक http://pay-fast-direct.net/upi/deal88 पर ₹1,30,000 भेजें और अपना 6-अंकीय OTP शेयर करें, मैं 10 मिनट में कुरियर कर दूंगा वर्ना ऑफर रद्द!',
      'hi',
      JSON.stringify({
        en: 'Platform will charge 12% tax. Send ₹1,30,000 immediately to this external link http://pay-fast-direct.net/upi/deal88 and share your 6-digit OTP, I will courier in 10 minutes otherwise deal cancelled!',
        ta: 'தளத்தில் 12% வரி விதிக்கப்படும். உடனடியாக இந்த வெளிப்புற இணைப்பு http://pay-fast-direct.net/upi/deal88 க்கு ₹1,30,000 அனுப்பி உங்கள் 6 இலக்க OTP-ஐ பகிரவும், 10 நிமிடங்களில் கூரியர் செய்கிறேன் இல்லையென்றால் சலுகை ரத்து!',
        hi: 'प्लेटफॉर्म पर 12% टैक्स लगेगा। आप तुरंत इस बाहरी लिंक http://pay-fast-direct.net/upi/deal88 पर ₹1,30,000 भेजें और अपना 6-अंकीय OTP शेयर करें, मैं 10 मिनट में कुरियर कर दूंगा वर्ना ऑफर रद्द!',
      }),
      94,
      'CRITICAL',
      JSON.stringify([
        'Suspicious off-platform external payment link (pay-fast-direct.net)',
        'Soliciting one-time password (OTP) / credential theft',
        'Artificial high urgency & coercive deal cancellation deadline (10 minutes)',
        'Off-platform payment avoidance / Fee circumvention tax claim',
      ]),
      'CRITICAL WARNING: Never send money outside TrustBridge or share OTPs. Transaction has been flagged for compliance review.',
      'GEMINI_2_5_FLASH',
      0.98,
      1,
      0,
      '2026-11-06T14:25:00Z'
    );

    // Dispute Room Opening Message
    insertMsg.run(
      'msg_sys_dsp_1',
      'conv_dispute_1',
      'usr_support_1',
      'Maya Patel (T&S Senior Agent)',
      'support',
      'Dispute room TB-DSP-2026-901 initialized. Senior Trust Agent Maya Patel has joined. Escrow funds of $1,850.00 are securely locked.',
      'en',
      JSON.stringify({
        en: 'Dispute room TB-DSP-2026-901 initialized. Senior Trust Agent Maya Patel has joined. Escrow funds of $1,850.00 are securely locked.',
        ta: 'சர்ச்சை அறை TB-DSP-2026-901 தொடங்கப்பட்டது. மூத்த நம்பிக்கை முகவர் மாயா படேல் இணைந்துள்ளார். $1,850.00 எஸ்க்ரோ நிதி பாதுகாப்பாக பூட்டப்பட்டுள்ளது.',
        hi: 'विवाद कक्ष TB-DSP-2026-901 शुरू हुआ। वरिष्ठ ट्रस्ट एजेंट माया पटेल शामिल हो गई हैं। $1,850.00 का एस्क्रो फंड सुरक्षित रूप से लॉक है।',
      }),
      0,
      'LOW',
      JSON.stringify(['Official dispute room moderation notice']),
      'Follow support specialist guidelines.',
      'HEURISTIC_RULE_ENGINE',
      1.0,
      0,
      0,
      '2026-11-06T14:35:00Z'
    );

    // 5. Dispute
    insertDispute.run(
      'dsp_901',
      'TB-DSP-2026-901',
      'txn_101',
      'conv_direct_1',
      'usr_buyer_1',
      'usr_seller_1',
      'usr_support_1',
      'suspected_fraud',
      'Seller solicited direct off-platform wire payment and requested personal OTP through fraudulent phishing portal.',
      'IN_PROGRESS',
      'URGENT',
      'Investigation active. Escrow funds protected. Seller warning issued regarding off-platform payment rules.',
      null,
      '2026-11-06T14:28:00Z',
      '2026-11-06T14:35:00Z'
    );

    // 6. Evidence
    insertEvidence.run(
      'ev_01',
      'dsp_901',
      'usr_buyer_1',
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80',
      'phishing_link_screenshot.png',
      245000,
      'image/png',
      'Screenshot showing seller demand for OTP and direct off-platform external link.',
      '2026-11-06T14:30:00Z'
    );
    insertEvidence.run(
      'ev_02',
      'dsp_901',
      'usr_buyer_1',
      'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
      'trustbridge_escrow_hold_receipt.pdf',
      112000,
      'application/pdf',
      'Official escrow hold statement of $1,850 securely retained by TrustBridge platform.',
      '2026-11-06T14:32:00Z'
    );

    // 7. Dispute History
    insertHistory.run(
      'dh_01',
      'dsp_901',
      'usr_buyer_1',
      'NONE',
      'OPEN',
      'Dispute filed by Buyer',
      'Reported conversation and requested immediate intervention.',
      '2026-11-06T14:28:00Z'
    );
    insertHistory.run(
      'dh_02',
      'dsp_901',
      'SYSTEM_ROUTER',
      'OPEN',
      'ASSIGNED',
      'Smart Agent Dispatch Auto-Assigned',
      'Assigned to Senior Trust & Safety Agent Maya Patel due to Critical Scam Risk Score (94/100).',
      '2026-11-06T14:28:05Z'
    );
    insertHistory.run(
      'dh_03',
      'dsp_901',
      'usr_support_1',
      'ASSIGNED',
      'IN_PROGRESS',
      'Agent Joined Nexconn Dispute Room',
      'Agent Maya Patel initiated 3-party dispute review and froze seller payout pending investigation.',
      '2026-11-06T14:35:00Z'
    );

    // 8. Tickets
    insertTicket.run(
      'tkt_501',
      'TKT-2026-0501',
      'dsp_901',
      'conv_direct_1',
      'usr_buyer_1',
      'usr_support_1',
      'Off-Platform Fraud & OTP Solicitation',
      'Seller Rajesh Sharma attempted to coerce buyer into off-platform payment via unverified link and asked for OTP under pressure.',
      'URGENT',
      'IN_PROGRESS',
      'Fraud & Phishing',
      '2026-11-06T14:28:00Z',
      null
    );
    insertTicket.run(
      'tkt_502',
      'TKT-2026-0488',
      null,
      'conv_direct_1',
      'usr_buyer_1',
      'usr_support_1',
      'Delayed Courier Tracking Verification',
      'Logistics API delay on regional dispatch. Resolved with tracking update confirmation.',
      'MEDIUM',
      'RESOLVED',
      'Shipping',
      '2026-11-01T10:00:00Z',
      '2026-11-02T16:00:00Z'
    );

    // 9. Fraud Alerts
    insertAlert.run(
      'fa_101',
      'conv_direct_1',
      'msg_04',
      'usr_seller_1',
      'Rajesh Sharma',
      94,
      'Off-Platform Wire & Credential Phishing',
      JSON.stringify([
        'External link: pay-fast-direct.net',
        'OTP solicitation pattern',
        'Fee evasion tax claim',
        'Coercive 10-minute ultimatum',
      ]),
      'CRITICAL',
      'NEW',
      '2026-11-06T14:25:01Z'
    );
    insertAlert.run(
      'fa_102',
      'conv_direct_1',
      'msg_00_old',
      'usr_seller_1',
      'Rajesh Sharma',
      68,
      'WhatsApp Contact Solicitation',
      JSON.stringify(['Phone number shared in encrypted format', 'Requested off-platform chat']),
      'MEDIUM',
      'REVIEWED',
      '2026-10-25T11:15:00Z'
    );

    // 10. Audit Logs
    insertAudit.run(
      'aud_01',
      'usr_buyer_1',
      'Ananya Krishnan',
      'buyer',
      'DISPUTE_FILED',
      'Dispute',
      'TB-DSP-2026-901',
      'Buyer submitted dispute with 2 evidence files regarding off-platform payment attempt.',
      '192.168.1.10',
      '2026-11-06T14:28:00Z'
    );
    insertAudit.run(
      'aud_02',
      'SYSTEM_AI_ENGINE',
      'TrustBridge AI Sentinel',
      'system',
      'RISK_THRESHOLD_EXCEEDED',
      'Message',
      'msg_04',
      'Critical risk score 94 detected on message payload. Automated alert dispatched to agent queue.',
      '127.0.0.1',
      '2026-11-06T14:25:02Z'
    );
    insertAudit.run(
      'aud_03',
      'usr_support_1',
      'Maya Patel',
      'support',
      'CASE_ASSIGNED',
      'SupportTicket',
      'TKT-2026-0501',
      'Agent joined dispute channel and flagged seller payout for escrow safeguard.',
      '192.168.1.45',
      '2026-11-06T14:35:00Z'
    );
  });

  seedTransaction();
}

/**
 * Resets the demo dispute to active state without wiping other records
 */
export function resetDemoState(): void {
  db.prepare(`
    UPDATE disputes
    SET status = 'IN_PROGRESS', resolution_outcome = NULL,
        resolution_note = 'Investigation active. Escrow funds protected. Seller warning issued regarding off-platform payment rules.',
        updated_at = ?
    WHERE id = 'dsp_901'
  `).run(new Date().toISOString());

  db.prepare(`
    UPDATE transactions
    SET status = 'DISPUTED'
    WHERE id = 'txn_101'
  `).run();

  db.prepare(`
    UPDATE support_tickets
    SET status = 'IN_PROGRESS', resolved_at = NULL
    WHERE id = 'tkt_501'
  `).run();
}
