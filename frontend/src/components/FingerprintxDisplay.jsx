import React from 'react';
import KeyValue from './KeyValue';
import Section from './Section';

const FingerprintxDisplay = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-gray-400">No results found.</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((item, index) => (
        <div key={index}>
          {data.length > 1 && <Section title={`Result ${index + 1}`} />}
          <KeyValue label="IP">{item.ip}</KeyValue>
          <KeyValue label="Port">{item.port}</KeyValue>
          <KeyValue label="Protocol">{item.protocol}</KeyValue>
          <KeyValue label="Transport">{item.transport}</KeyValue>
          {item.metadata?.status && <KeyValue label="Status">{item.metadata.status}</KeyValue>}
        </div>
      ))}
    </div>
  );
};

export default FingerprintxDisplay;