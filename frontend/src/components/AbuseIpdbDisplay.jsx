import React, { useState } from 'react';

// --- Helper Functions ---
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

const getScoreColor = (score) => {
  if (score >= 80) return { bg: 'bg-red-500', text: 'text-red-400' };
  if (score >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-400' };
  return { bg: 'bg-green-500', text: 'text-green-400' };
};

const KeyValue = ({ label, children }) => (
    <div className="flex flex-col">
        <span className="text-xs text-gray-400 uppercase font-semibold">{label}</span>
        <span className="text-white">{children}</span>
    </div>
);

const AbuseIpdbDisplay = ({ data }) => {
    const [showDetails, setShowDetails] = useState(false);
    
    const attributes = data?.[0]?.data;

    if (!attributes) {
        return <div className="bg-gray-800 rounded-lg p-6 text-gray-400">Error: Invalid data structure received from AbuseIPDB.</div>;
    }

    const score = attributes.abuseConfidenceScore || 0;
    const scoreColor = getScoreColor(score);

    return (
        <div className="bg-gray-800 rounded-lg p-6 text-gray-300">
            {/* --- Header --- */}
            <div className="flex justify-between items-start pb-4 mb-4 border-b border-gray-700">
                <div>
                    <h3 className="text-xl font-bold text-cyan-300">AbuseIPDB IP Analysis</h3>
                    <span className="text-sm font-mono text-cyan-100">{attributes.ipAddress || 'N/A'}</span>
                </div>
                <div className="text-right flex-shrink-0">
                    <p className={`text-3xl font-bold ${scoreColor.text}`}>{score}%</p>
                    <p className="text-xs text-gray-400">Abuse Confidence</p>
                </div>
            </div>

            {/* --- Confidence Bar --- */}
            <div className="w-full bg-gray-700/50 rounded-full h-2.5 mb-6">
                <div className={`${scoreColor.bg} h-2.5 rounded-full`} style={{ width: `${score}%` }}></div>
            </div>

            {/* --- Main Details Grid --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                <div>
                    <h4 className="font-semibold text-white mb-3">Status & Reports</h4>
                    <div className="space-y-3">
                        <KeyValue label="Total Reports">{attributes.totalReports ?? 'N/A'}</KeyValue>
                        <KeyValue label="Distinct Users Reporting">{attributes.numDistinctUsers ?? 'N/A'}</KeyValue>
                        <KeyValue label="Last Reported">{formatDate(attributes.lastReportedAt)}</KeyValue>
                        <KeyValue label="Whitelisted">{attributes.isWhitelisted === true ? 'Yes' : 'No'}</KeyValue>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-white mb-3">Network & Location</h4>
                    <div className="space-y-3">
                        <KeyValue label="Usage Type">{attributes.usageType || 'N/A'}</KeyValue>
                        <KeyValue label="ISP">{attributes.isp || 'N/A'}</KeyValue>
                        <KeyValue label="Domain">{attributes.domain || 'N/A'}</KeyValue>
                        <KeyValue label="Country">{attributes.countryName ? `${attributes.countryName} (${attributes.countryCode})` : 'N/A'}</KeyValue>
                    </div>
                </div>
            </div>

            {/* --- Hostnames --- */}
            <h4 className="font-semibold text-white mb-3">Associated Hostnames</h4>
            <div className="font-mono text-sm bg-gray-900/50 p-4 rounded-md max-h-40 overflow-y-auto mb-6">
                {(attributes.hostnames && attributes.hostnames.length > 0) ? (
                    <ul>{attributes.hostnames.map(host => <li key={host}>{host}</li>)}</ul>
                ) : ( <p>No associated hostnames found.</p> )}
            </div>

            {/* --- Foldout Button --- */}
            <button onClick={() => setShowDetails(!showDetails)} className="w-full text-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200">
                {showDetails ? 'Hide' : 'Show'} Recent Abuse Reports ({attributes.reports?.length || 0})
            </button>
            
            {/* --- Reports Table --- */}
            {showDetails && attributes.reports && attributes.reports.length > 0 && (
                <div className="mt-4 overflow-x-auto max-h-[600px] overflow-y-auto">
                   <table className="min-w-full text-sm">
                        {/* ... table structure ... */}
                    </table>
                </div>
            )}
        </div>
    );
};

export default AbuseIpdbDisplay;