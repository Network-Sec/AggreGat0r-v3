import React from 'react';

const SubfinderDisplay = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-gray-400">No subdomains found.</p>;
  }

  return (
    <div className="overflow-y-auto max-h-96 bg-gray-900/50 p-2 border border-gray-700">
      <table className="min-w-full text-sm text-left text-gray-300">
        <thead className="text-xs uppercase sticky top-0 bg-gray-700">
          <tr>
            <th scope="col" className="px-4 py-2">Host</th>
            <th scope="col" className="px-4 py-2">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {data.map((item, index) => (
            <tr key={index} className="hover:bg-gray-600/50">
              <td className="px-4 py-2 font-medium text-white whitespace-nowrap">{item.host}</td>
              <td className="px-4 py-2">{item.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SubfinderDisplay;