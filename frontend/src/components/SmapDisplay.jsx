import React from 'react';
import KeyValue from './KeyValue';
import Section from './Section';

const SmapDisplay = ({ data }) => {
  if (!data || data.length === 0 || (Array.isArray(data[0]) && data[0].length === 0)) {
    return <p className="text-gray-400">No results found.</p>;
  }

  const smapRun = data[0][0]; // Double array structure

  if (!smapRun) {
    return <p className="text-gray-400">No results found.</p>;
  }

  return (
    <div>
      <Section title="Scan Details" />
      <KeyValue label="IP Address">{smapRun.ip}</KeyValue>
      <KeyValue label="Hostnames">{smapRun.hostnames?.join(', ') || 'N/A'}</KeyValue>
      <KeyValue label="Start Time">{new Date(smapRun.start_time).toLocaleString()}</KeyValue>
      <KeyValue label="End Time">{new Date(smapRun.end_time).toLocaleString()}</KeyValue>

      {smapRun.ports && smapRun.ports.length > 0 && (
        <>
          <Section title="Open Ports" />
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs sm:text-sm">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-400 bg-gray-700/50 border-b border-gray-600">Port</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-400 bg-gray-700/50 border-b border-gray-600">Service</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-400 bg-gray-700/50 border-b border-gray-600">Protocol</th>
                </tr>
              </thead>
              <tbody>
                {smapRun.ports.map((port, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 border-b border-gray-700/50">{port.port}</td>
                    <td className="px-3 py-2 border-b border-gray-700/50">{port.service}</td>
                    <td className="px-3 py-2 border-b border-gray-700/50">{port.protocol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default SmapDisplay;