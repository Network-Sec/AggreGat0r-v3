import React, { useState } from 'react'; // Import useState
import GenericDisplay from './GenericDisplay';
import HttpxDisplay from './HttpxDisplay';
import NmapDisplay from './NmapDisplay';
import UrlfinderDisplay from './UrlfinderDisplay';
import SmapDisplay from './SmapDisplay';
import FingerprintxDisplay from './FingerprintxDisplay';
import SubfinderDisplay from './SubfinderDisplay';
import TlsxDisplay from './TlsxDisplay';
import VirusTotalDisplay from './VirusTotalDisplay';
import AbuseIpdbDisplay from './AbuseIpdbDisplay';
import VulnsDisplay from './VulnsDisplay';   // ← NEW

/* --- ICONS --- */
import {
  FiGlobe,
  FiTerminal,
  FiLink,
  FiMonitor,
  FiShield,
  FiSearch,
  FiCpu,
  FiServer,
  FiTag,
  FiChevronDown,
  FiAlertCircle,   // <-- new icon
} from 'react-icons/fi';

const toolDisplayMap = {
  httpx: HttpxDisplay,
  nmap: NmapDisplay,
  urlfinder: UrlfinderDisplay,
  smap: SmapDisplay,
  fingerprintx: FingerprintxDisplay,
  subfinder: SubfinderDisplay,
  tlsx: TlsxDisplay,
  virustotal: VirusTotalDisplay,
  abuseipdb: AbuseIpdbDisplay,
  vulns: VulnsDisplay,                // ← NEW
};

const toolIcons = {
  httpx: FiGlobe,
  nmap: FiTerminal,
  urlfinder: FiLink,
  smap: FiMonitor,
  fingerprintx: FiShield,
  subfinder: FiSearch,
  tlsx: FiCpu,
  virustotal: FiShield,
  abuseipdb: FiServer,
  vulns: FiAlertCircle,                    // ← NEW (any icon you like)
};


const ToolCard = ({ toolName, toolData }) => {
  // 1. Add state to manage visibility, defaulting to true (expanded)
  const [isExpanded, setIsExpanded] = useState(true);

  const DisplayComponent =
    toolDisplayMap[toolName.toLowerCase()] || GenericDisplay;

  const Icon = toolIcons[toolName.toLowerCase()] || FiTag;

  return (
    // This structure remains identical to yours
    <div className="bg-gray-800 shadow-xl border border-gray-700 flex flex-col h-full">
      {/* header --- MODIFIED TO BE CLICKABLE --- */}
      <div
        className="text-lg px-4 py-3 border-b border-gray-700 text-gray-100 font-semibold tracking-wide flex items-center justify-between cursor-pointer hover:bg-gray-700/50 transition-colors duration-200"
        id={`toolcard-${toolName}`}
        onClick={() => setIsExpanded(!isExpanded)} // 2. Add the onClick toggle handler
      >
        <div className="flex items-center">
          <Icon className="text-2xl text-white mr-3" />
          {toolName}
        </div>
        
        {/* 3. Add a rotating chevron icon to indicate state */}
        <FiChevronDown 
          className={`text-2xl text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
        />
      </div>

      {/* content --- STRUCTURE PRESERVED, CONTENT IS CONDITIONAL --- */}
      <div className={`p-4 text-sm text-gray-300 flex-grow overflow-y-auto transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 p-0 h-0'}`}>
        {/* 4. Only render the (potentially expensive) display component when expanded */}
        {isExpanded && <DisplayComponent data={toolData} />}
      </div>
    </div>
  );
};

export default ToolCard;