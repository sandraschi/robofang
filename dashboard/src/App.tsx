import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard.tsx';
import Knowledge from './pages/Knowledge.tsx';
import Fleet from './pages/Fleet.tsx';
import Hands from './pages/Hands.tsx';
import Council from './pages/Council.tsx';
import Deliberations from './pages/Deliberations.tsx';
import Connectors from './pages/Connectors.tsx';
import Pulse from './pages/Pulse.tsx';
import Logger from './pages/Logger.tsx';
import Status from './pages/Status.tsx';
import Help from './pages/Help.tsx';
import Chat from './pages/Chat.tsx';
import Timeline from './pages/Timeline.tsx';
import KitchenSink from './pages/KitchenSink.tsx';
import Settings from './pages/Settings.tsx';
import Onboarding from './pages/Onboarding.tsx';
import LLM from './pages/LLM.tsx';
import HomeHub from './pages/HomeHub.tsx';
import CreativeHub from './pages/CreativeHub.tsx';
import InfraHub from './pages/InfraHub.tsx';
import KnowledgeHub from './pages/KnowledgeHub.tsx';
import RoboticsHub from './pages/RoboticsHub.tsx';
import VirtualHub from './pages/VirtualHub.tsx';
import Tools from './pages/Tools.tsx';
import Showroom from './pages/Showroom.tsx';
import Apps from './pages/Apps.tsx';
import FleetInstaller from './pages/FleetInstaller.tsx';
import './index.css';

function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/council" element={<Council />} />
          <Route path="/deliberations" element={<Deliberations />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/fleet" element={<Fleet />} />
          <Route path="/hands" element={<Hands />} />
          <Route path="/connectors" element={<Connectors />} />
          <Route path="/robotics" element={<RoboticsHub />} />
          <Route path="/virtual" element={<VirtualHub />} />
          <Route path="/home" element={<HomeHub />} />
          <Route path="/creative" element={<CreativeHub />} />
          <Route path="/infra" element={<InfraHub />} />
          <Route path="/knowledge-hub" element={<KnowledgeHub />} />
          <Route path="/llm" element={<LLM />} />
          <Route path="/pulse" element={<Pulse />} />
          <Route path="/logger" element={<Logger />} />
          <Route path="/status" element={<Status />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/installer" element={<FleetInstaller />} />
          <Route path="/showroom" element={<Showroom />} />
          <Route path="/apps" element={<Apps />} />
          <Route path="/help" element={<Help />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/timeline" element={<Timeline />} />
          <Route path="/kitchen-sink" element={<KitchenSink />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;
