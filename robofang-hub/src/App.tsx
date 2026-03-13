import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// ... other imports
// I'll just use the existing imports but add React and useEffect if missing.
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import HomeHub from './pages/HomeHub';
import InfraHub from './pages/InfraHub';
import RoboticsHub from './pages/RoboticsHub';
import VirtualHub from './pages/VirtualHub';
import CreativeHub from './pages/CreativeHub';
import Fleet from './pages/Fleet';
import Installer from './pages/Installer';
import Council from './pages/Council';
import ChatHub from './pages/Chat'; 
import Deliberations from './pages/Deliberations';
import KnowledgeHub from './pages/KnowledgeHub'; 
import LLM from './pages/LLM';
import Timeline from './pages/Timeline';
import Agents from './pages/Agents';
import Schedule from './pages/Schedule';
import Hands from './pages/Hands';
import Inbox from './pages/Inbox';

// Intel Pages
import Scraper from './pages/intel/Scraper';
import Intelligence from './pages/intel/Intelligence';
import Analysis from './pages/intel/Analysis';
import Evidence from './pages/intel/Evidence';
import Reports from './pages/intel/Reports';
import Alerts from './pages/intel/Alerts';
import Feeds from './pages/intel/Feeds';

// Systems Pages
import Status from './pages/systems/Status';
import Pulse from './pages/systems/Pulse';
import Settings from './pages/systems/Settings';
import Help from './pages/systems/Help';
import Lab from './pages/systems/Lab';
import Admin from './pages/systems/Admin';
import Browser from './pages/systems/Browser';
import FileSystem from './pages/systems/FileSystem';
import Profile from './pages/systems/Profile';
import Logs from './pages/systems/Logs';
import DocViewer from './pages/systems/DocViewer';
import McpDocs from './pages/systems/McpDocs';
import Notifications from './pages/systems/Notifications';
import Onboarding from './pages/systems/Onboarding';

import './index.css';

function App() {
  useEffect(() => {
    console.log('[APP] App mounted correctly');
  }, []);

  return (
    <Router>
      <AppLayout>
        <Routes>
          {/* Main Migrated Pages */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/home" element={<HomeHub />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/installer" element={<Installer />} />

          {/* Hubs */}
          <Route path="/infra" element={<InfraHub />} />
          <Route path="/knowledge" element={<KnowledgeHub />} />
          <Route path="/robotics" element={<RoboticsHub />} />
          <Route path="/virtual" element={<VirtualHub />} />
          <Route path="/creative" element={<CreativeHub />} />

          {/* Agency */}
          <Route path="/council" element={<Council />} />
          <Route path="/deliberations" element={<Deliberations />} />
          <Route path="/chat" element={<ChatHub />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/hands" element={<Hands />} />
          <Route path="/inbox" element={<Inbox />} />

          {/* Intel */}
          <Route path="/scraper" element={<Scraper />} />
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/feeds" element={<Feeds />} />

          {/* Systems */}
          <Route path="/status" element={<Status />} />
          <Route path="/pulse" element={<Pulse />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/terminal" element={<LLM />} />
          <Route path="/browser" element={<Browser />} />
          <Route path="/filesystem" element={<FileSystem />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/docs/:slug" element={<DocViewer />} />
          <Route path="/mcp-docs" element={<McpDocs />} />
          <Route path="/onboarding" element={<Navigate to="/installer" replace />} />

          <Route path="*" element={<Dashboard />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;
