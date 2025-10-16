import React from 'react';
import KeyValue from './KeyValue';
import Section from './Section';

const TlsxDisplay = ({ data }) => {
  if (!data || data.length === 0 || data[0].empty_result) {
    return <p className="text-gray-400">No TLS data found.</p>;
  }

  const cert = data[0];

  return (
    <div>
      <Section title="Certificate Details" />
      <KeyValue label="Subject CN">{cert.subject_cn}</KeyValue>
      <KeyValue label="Issuer CN">{cert.issuer_cn}</KeyValue>
      <KeyValue label="TLS Version">{cert.tls_version}</KeyValue>
      <KeyValue label="Cipher">{cert.cipher}</KeyValue>
      <KeyValue label="Not Before">{new Date(cert.not_before).toLocaleString()}</KeyValue>
      <KeyValue label="Not After">{new Date(cert.not_after).toLocaleString()}</KeyValue>
      <KeyValue label="SANs">{cert.subject_an?.join(', ')}</KeyValue>

      <Section title="Hashes" />
      <KeyValue label="SHA1">{cert.fingerprint_hash?.sha1}</KeyValue>
      <KeyValue label="SHA256">{cert.fingerprint_hash?.sha256}</KeyValue>
    </div>
  );
};

export default TlsxDisplay;