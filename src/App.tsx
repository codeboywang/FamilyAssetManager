/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Assets } from './components/Assets';
import { Benefits } from './components/Benefits';
import { Members } from './components/Members';
import { RecordUpdate } from './components/RecordUpdate';
import { Renqing } from './components/Renqing';
import { Insurance } from './components/Insurance';
import { Settings } from './components/Settings';
import { Login } from './components/Login';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  if (!isLoggedIn) {
    return (
      <ErrorBoundary>
        <Login onLogin={(token, member) => {
          setIsLoggedIn(true);
          setCurrentUser(member);
        }} />
      </ErrorBoundary>
    );
  }

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  return (
    <ErrorBoundary>
      <Layout activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'assets' && <Assets />}
        {activeTab === 'benefits' && <Benefits currentUser={currentUser} />}
        {activeTab === 'insurance' && <Insurance />}
        {activeTab === 'record' && <RecordUpdate currentUser={currentUser} />}
        {activeTab === 'renqing' && <Renqing />}
        {activeTab === 'members' && <Members />}
        {activeTab === 'settings' && <Settings currentUser={currentUser} />}
      </Layout>
    </ErrorBoundary>
  );
}

