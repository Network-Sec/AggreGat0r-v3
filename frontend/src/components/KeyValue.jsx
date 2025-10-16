/* src/components/KeyValue.jsx */
import React from 'react';

/**
 * A small “key/value” row that alternates background colors
 * (odd/even) and uses a subtle gray divider – inspired by
 * cloud‑provider tables.
 */
export default function KeyValue({ label, children, className = '' }) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start text-[16px] p-3 border-l-8 border-blue-400 last:border-b-0 odd:bg-gray-600 even:bg-gray-800 ${className}`}
    >
      {/* Key */}
      <dt className="font-medium text-blue-300 w-64 flex-shrink-0 pr-3">
        {label}
      </dt>

      {/* Value / Output */}
      <dd className="flex-grow text-gray-200 font-mono break-words break-all min-w-0">
        {children}
      </dd>
    </div>
  );
}
