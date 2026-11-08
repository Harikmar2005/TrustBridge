import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { DisputeProvider } from './context/DisputeContext';
import { Navbar } from './components/Navbar';
import { DemoStepper } from './components/DemoStepper';
import { LandingPage } from './pages/LandingPage';
import { BuyerDashboard } from './pages/BuyerDashboard';
import { SellerDashboard } from './pages/SellerDashboard';
import { SupportDashboard } from './pages/SupportDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ShieldCheck, Heart, Radio } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [showDemoStepper, setShowDemoStepper] = useState<boolean>(true);

  return (
    <AuthProvider>
      <ChatProvider>
        <DisputeProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
            {/* Top Navigation */}
            <Navbar
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
              showDemoStepper={showDemoStepper}
              setShowDemoStepper={setShowDemoStepper}
            />

            {/* 11-Step Interactive Demo Stepper Bar */}
            {showDemoStepper && (
              <DemoStepper
                setCurrentTab={setCurrentTab}
                onClose={() => setShowDemoStepper(false)}
              />
            )}

            {/* Main Content Area */}
            <main className="flex-1">
              {currentTab === 'landing' && (
                <LandingPage
                  setCurrentTab={setCurrentTab}
                  setShowDemoStepper={setShowDemoStepper}
                />
              )}
              {currentTab === 'buyer' && <BuyerDashboard />}
              {currentTab === 'seller' && <SellerDashboard />}
              {currentTab === 'support' && <SupportDashboard />}
              {currentTab === 'admin' && <AdminDashboard />}
            </main>

            {/* Professional Enterprise Footer */}
            <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    TB
                  </div>
                  <span className="font-bold text-slate-800">TRUSTBRIDGE</span>
                  <span>&bull;</span>
                  <span>Nexconn Build Challenge 2026</span>
                </div>

                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Radio className="w-3.5 h-3.5 text-emerald-600" />
                    Powered by Nexconn Chat SDK & Gemini 2.5 Sentinel
                  </span>
                  <span className="text-slate-400">|</span>
                  <span>Multilingual Escrow Trust Infrastructure</span>
                </div>
              </div>
            </footer>
          </div>
        </DisputeProvider>
      </ChatProvider>
    </AuthProvider>
  );
}
