import React from 'react';

const GenericDisplay = ({ data }) => {
  if (!data || data.length === 0 || (data[0] && data[0].empty_result)) {
    return <p className="text-gray-400">No results found.</p>;
  }

  // Handle the strange smap case: [[]]
  if (Array.isArray(data[0]) && data[0].length === 0) {
    return <p className="text-gray-400">No results found.</p>;
  }

  return (
    <pre className="text-sm whitespace-pre-wrap bg-gray-900 p-2 rounded-md text-white overflow-x-auto">      {JSON.stringify(data, null, 2)}
    </pre>
  );
};

export default GenericDisplay;