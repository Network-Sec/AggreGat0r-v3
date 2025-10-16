import React, { useState, useMemo } from 'react';

// A new, reusable modal component for showing response details
const DetailsModal = ({ response, onClose }) => {
  // The backend decompresses the data, so we can display it directly
  const body = response.body || "[No body content]";
  const header = response.header || {}; // header is already an object
  const request = response.request || "[No request data]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-gray-800 text-gray-200 rounded-lg shadow-xl w-11/12 max-w-[100%] max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-600">
          <h3 className="text-lg font-semibold text-cyan-300">HTTP Response Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="mb-4">
            <h4 className="font-bold text-gray-400 uppercase text-sm mb-2">Request</h4>
            <pre className="bg-gray-900 p-3 rounded-md text-sm whitespace-pre-wrap break-all">{request}</pre>
          </div>
          <div className="mb-4">
            <h4 className="font-bold text-gray-400 uppercase text-sm mb-2">Response Headers</h4>
            <pre className="bg-gray-900 p-3 rounded-md text-sm whitespace-pre-wrap break-all">
              {Object.entries(header).map(([key, value]) => `${key}: ${value}`).join('\n')}
            </pre>
          </div>
          <div className="mb-4">
            <h4 className="font-bold text-gray-400 uppercase text-sm mb-2">Response Body</h4>
            <pre className="bg-gray-900 p-3 rounded-md text-sm whitespace-pre-wrap break-all">{body}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};


const HttpxDisplay = ({ data }) => {
  const [filter, setFilter] = useState('');
  const [selectedResponse, setSelectedResponse] = useState(null);

  // Memoize the filtered data to avoid re-calculating on every render
  const filteredData = useMemo(() => {
    if (!filter) {
      return data; // Return original data if no filter
    }
    const lowerCaseFilter = filter.toLowerCase();

    // This function will recursively filter the data structure
    return data.map(asn => {
      const filteredHosts = asn.hosts.map(host => {
        const filteredPorts = host.ports.map(port => {
          
          const filteredResponses = port.responses.filter(response => {
            // Create a searchable string from the response object
            const searchableContent = JSON.stringify(response).toLowerCase();
            return searchableContent.includes(lowerCaseFilter);
          });

          return { ...port, responses: filteredResponses };
        }).filter(port => port.responses.length > 0); // Hide ports with no matching responses

        return { ...host, ports: filteredPorts };
      }).filter(host => host.ports.length > 0); // Hide hosts with no matching ports

      return { ...asn, hosts: filteredHosts };
    }).filter(asn => asn.hosts.length > 0); // Hide ASNs with no matching hosts

  }, [data, filter]);


  if (!data || data.length === 0) {
    return <p className="text-gray-400">No HTTPX results found.</p>;
  }

  return (
    <div>
      <input 
        type="text"
        placeholder="Filter all HTTPX results..."
        className="w-full p-2 mb-4 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />

      {filteredData.length === 0 && (
          <p className="text-gray-400">No results match your filter.</p>
      )}

      {/* Main container for all ASN groups */}
      <div className="space-y-6">
        {filteredData.map(asn => (
          <div key={asn.as_number} className="bg-gray-800 rounded-lg p-4">
            {/* ASN Header */}
            <h2 className="text-xl font-bold text-cyan-300 mb-2">
              AS{asn.as_number} - {asn.as_name} ({asn.as_country})
            </h2>

            {asn.hosts.map(host => (
              <div key={host.host} className="mt-4 ml-4">
                {/* Host Header */}
                <h3 className="text-lg font-semibold text-gray-200">Host: {host.host}</h3>
                
                {host.ports.map(port => (
                  <div key={port.port} className="mt-3 ml-4">
                    {/* Port Header & Info */}
                    <div className="flex items-center gap-4 mb-2">
                       <h4 className="text-md font-medium text-gray-300">Port: {port.port}</h4>
                       {port.tech && port.tech.length > 0 && (
                         <div className="flex flex-wrap gap-2">
                           {port.tech.map(t => <span key={t} className="bg-cyan-800 text-cyan-200 text-xs font-semibold px-2 py-1 rounded-full">{t}</span>)}
                         </div>
                       )}
                    </div>

                    {/* Responses Table for this port */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm text-left text-gray-300">
                        <thead className="bg-gray-700 text-xs uppercase">
                          <tr>
                            <th className="px-4 py-2">URL</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Method</th>
                            <th className="px-4 py-2">Title</th>
                            <th className="px-4 py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {port.responses.map((response, index) => (
                            <tr key={index} className="bg-gray-800 hover:bg-gray-600">
                              <td className="px-4 py-2 font-medium text-white whitespace-nowrap">{response.url}</td>
                              <td className="px-4 py-2">{response.status_code}</td>
                              <td className="px-4 py-2">{response.method}</td>
                              <td className="px-4 py-2 truncate w-[480px]">{response.title}</td>
                              <td className="px-4 py-2">
                                <button 
                                  onClick={() => setSelectedResponse(response)}
                                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-xs"
                                >
                                  Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Render the modal if a response is selected */}
      {selectedResponse && <DetailsModal response={selectedResponse} onClose={() => setSelectedResponse(null)} />}
    </div>
  );
};

export default HttpxDisplay;