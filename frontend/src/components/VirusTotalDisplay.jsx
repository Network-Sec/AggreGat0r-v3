import React, { useState } from 'react';

// --- Helper Functions (inlined for simplicity) ---
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  // Handles both UNIX timestamps and standard date strings
  const date = new Date(Number.isInteger(dateString) ? dateString * 1000 : dateString);
  return date.toLocaleString();
};

const getCategoryColor = (category) => {
  switch (category) {
    case 'malicious': return 'text-red-400';
    case 'suspicious': return 'text-yellow-400';
    case 'harmless': return 'text-green-400';
    default: return 'text-gray-400';
  }
};

const KeyValue = ({ label, children }) => (
    <div className="flex flex-col py-1">
        <span className="text-xs text-gray-400 uppercase font-semibold">{label}</span>
        <span className="text-white break-words">{children || 'N/A'}</span>
    </div>
);

// --- Automatic WHOIS Parser ---
const parseWhois = (whoisText) => {
    if (!whoisText) return [];
    const lines = whoisText.split('\n');
    const whoisData = [];
    const seenKeys = new Set(); // Prevent duplicate keys from being added

    lines.forEach(line => {
        const trimmedLine = line.trim();
        const separatorIndex = trimmedLine.indexOf(':');
        
        if (separatorIndex > 0) {
            const key = trimmedLine.substring(0, separatorIndex).trim();
            const value = trimmedLine.substring(separatorIndex + 1).trim();
            
            if (key && value && !key.toLowerCase().includes('>>>') && !seenKeys.has(key)) {
                whoisData.push({ key, value });
                seenKeys.add(key);
            }
        }
    });
    return whoisData;
};


const VirusTotalDisplay = ({ data }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const result = data?.[0];
  const attributes = result?.data?.attributes;
  const entityType = result?.data?.type;

  if (!attributes) {
    return <div className="bg-gray-800 rounded-lg p-6 text-gray-400">Error: Invalid data structure from VirusTotal.</div>;
  }
  
  const parsedWhoisData = parseWhois(attributes.whois);
  const stats = attributes.last_analysis_stats || {};
  const totalVendors = Object.values(stats).reduce((sum, value) => sum + value, 0);
  const maliciousCount = stats.malicious || 0;
  const sortedResults = Object.values(attributes.last_analysis_results || {}); // Sorting logic removed for brevity, can be re-added if needed
  const title = entityType === 'ip_address' ? 'IP Analysis' : 'Domain Analysis';

  return (
    <div className="bg-gray-800 rounded-lg p-6 text-gray-300">
      {/* --- Header --- */}
      <div className="flex justify-between items-start pb-4 mb-4 border-b border-gray-700">
        <div>
            <h3 className="text-xl font-bold text-cyan-300">VirusTotal {title}</h3>
            <span className="text-sm font-mono text-cyan-100">{result?.data?.id || 'N/A'}</span>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <p className={`text-3xl font-bold ${maliciousCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {maliciousCount} / {totalVendors}
          </p>
          <p className="text-xs text-gray-400">Malicious Detections</p>
        </div>
      </div>

      {/* --- Main Details Grid (Score, Dates, Network) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
        <div>
            <h4 className="font-semibold text-white mb-2">Reputation</h4>
            <div className="space-y-2">
                <KeyValue label="Reputation Score">{attributes.reputation}</KeyValue>
                <KeyValue label="Harmless Votes">{attributes.total_votes?.harmless ?? 0}</KeyValue>
                <KeyValue label="Malicious Votes">{attributes.total_votes?.malicious ?? 0}</KeyValue>
            </div>
        </div>
        <div>
            <h4 className="font-semibold text-white mb-2">Key Dates</h4>
            <div className="space-y-2">
                <KeyValue label="Last Analysis">{formatDate(attributes.last_analysis_date)}</KeyValue>
                <KeyValue label="Last Modification">{formatDate(attributes.last_modification_date)}</KeyValue>
                <KeyValue label="Creation Date">{formatDate(attributes.creation_date)}</KeyValue>
            </div>
        </div>
        <div>
            <h4 className="font-semibold text-white mb-2">Network</h4>
            <div className="space-y-2">
                <KeyValue label="Network (CIDR)">{attributes.network}</KeyValue>
                <KeyValue label="ASN">{attributes.asn}</KeyValue>
                <KeyValue label="AS Owner">{attributes.as_owner}</KeyValue>
            </div>
        </div>
      </div>

      {/* --- Expanded HTTPS Certificate Details --- */}
      {attributes.last_https_certificate && (
        <>
            <h4 className="font-semibold text-white mb-3">Last HTTPS Certificate Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 mb-6">
                <div>
                    <h5 className="font-semibold text-gray-200 mb-2">Subject & Issuer</h5>
                    <div className="space-y-2">
                        <KeyValue label="Subject CN">{attributes.last_https_certificate.subject?.CN}</KeyValue>
                        <KeyValue label="Issuer CN">{attributes.last_https_certificate.issuer?.CN}</KeyValue>
                        <KeyValue label="Issuer Org (O)">{attributes.last_https_certificate.issuer?.O}</KeyValue>
                    </div>
                </div>
                <div>
                    <h5 className="font-semibold text-gray-200 mb-2">Validity & Signature</h5>
                    <div className="space-y-2">
                        <KeyValue label="Valid From">{formatDate(attributes.last_https_certificate.validity?.not_before)}</KeyValue>
                        <KeyValue label="Valid Until">{formatDate(attributes.last_https_certificate.validity?.not_after)}</KeyValue>
                        <KeyValue label="Signature Algorithm">{attributes.last_https_certificate.signature_algorithm}</KeyValue>
                    </div>
                </div>
                <div>
                    <h5 className="font-semibold text-gray-200 mb-2">Identifiers</h5>
                    <div className="space-y-2">
                         <KeyValue label="Serial Number">{attributes.last_https_certificate.serial_number}</KeyValue>
                         <KeyValue label="Thumbprint (SHA-1)">{attributes.last_https_certificate.thumbprint}</KeyValue>
                         <KeyValue label="SANs">{attributes.last_https_certificate.extensions?.subject_alternative_name?.join(', ')}</KeyValue>
                    </div>
                </div>
            </div>
        </>
      )}

      {/* --- Formatted WHOIS Section (Multi-column) --- */}
      {parsedWhoisData.length > 0 && (
        <>
            <h4 className="font-semibold text-white mb-3">WHOIS Record</h4>
            <div className="bg-gray-900/50 p-4 rounded-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                    {parsedWhoisData.map((item, index) => (
                        <KeyValue key={index} label={item.key}>{item.value}</KeyValue>
                    ))}
                </div>
            </div>
        </>
      )}
      
      {/* --- Foldout Button --- */}
      <button onClick={() => setShowDetails(!showDetails)} className="w-full text-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200">
        {showDetails ? 'Hide' : 'Show'} Full Vendor Analysis ({sortedResults.length})
      </button>
      
      {/* --- Vendor Table --- */}
      {showDetails && (
        <div className="mt-4 overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900 text-xs text-gray-400 uppercase sticky top-0">
                <tr>
                    <th className="px-6 py-3 text-left">Engine Name</th>
                    <th className="px-6 py-3 text-left">Category</th>
                    <th className="px-6 py-3 text-left">Result</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
                {sortedResults.map((res, index) => (
                    <tr key={index} className="hover:bg-gray-700/50 odd:bg-gray-800 even:bg-gray-800/50 border-l-4 border-transparent hover:border-cyan-500">
                        <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{res.engine_name}</td>
                        <td className={`px-6 py-4 font-semibold ${getCategoryColor(res.category)}`}>{res.category}</td>
                        <td className="px-6 py-4 break-all">{res.result || 'clean'}</td>
                    </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VirusTotalDisplay;