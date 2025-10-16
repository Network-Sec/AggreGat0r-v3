import React, { useState, useMemo } from 'react';

const UrlfinderDisplay = ({ data }) => {
  const [filter, setFilter] = useState('');

  // Memoize the filtering logic so it only runs when data or filter changes
  const filteredData = useMemo(() => {
    if (!filter) {
      return data; // No filter, return the original structured data
    }
    const lowerCaseFilter = filter.toLowerCase();

    // Map over the groups and filter the URLs inside each group
    return data
      .map(group => {
        const filteredUrls = group.urls.filter(url => 
          url.toLowerCase().includes(lowerCaseFilter)
        );
        // Return a new group object with only the filtered URLs
        return { ...group, urls: filteredUrls };
      })
      // Finally, filter out any groups that have no matching URLs left
      .filter(group => group.urls.length > 0);

  }, [data, filter]);


  if (!data || data.length === 0) {
    return <p className="text-gray-400">No URL finder results found.</p>;
  }

  return (
    <div>
      <input 
        type="text"
        placeholder="Filter URLs..."
        className="w-full p-2 mb-4 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />

      {filteredData.length === 0 && (
        <p className="text-gray-400">No URLs match your filter.</p>
      )}

      {/* Container for the groups of URLs */}
      <div className="max-h-[40rem] overflow-y-auto space-y-6">
        {filteredData.map((group) => (
          <div key={group.input} className="bg-gray-800/70 p-4 rounded-lg">
            {/* Group Header */}
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-200">{group.input}</h3>
              {group.sources && group.sources.length > 0 && (
                <p className="text-sm text-gray-400">
                  Sources: {group.sources.join(', ')}
                </p>
              )}
            </div>
            
            {/* List of URLs for this group */}
            <ul className="space-y-2">
              {group.urls.map((url, index) => (
                <li key={index} className="text-cyan-400 break-all text-sm">
                  <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UrlfinderDisplay;