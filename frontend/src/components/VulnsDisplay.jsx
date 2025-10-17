import React from 'react';
import Section from './Section';

/** ----------  Helpers  ---------- */

const parseCve = (cve) => {
  const [, yearStr, numStr] = cve.split('-');
  return { year: parseInt(yearStr, 10), num: parseInt(numStr, 10), raw: cve };
};

const collectVulns = (data) => {
  const set = new Set();
  data.forEach((outerArr) => {
    if (!Array.isArray(outerArr)) return;
    outerArr.forEach((item) => {
      if (item && Array.isArray(item.vulns)) {
        item.vulns.forEach((v) => set.add(v));
      }
    });
  });
  return Array.from(set);
};

const sortCves = (cves) =>
  cves
    .map(parseCve)
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.num - b.num))
    .map((e) => e.raw);

/** ----------  Build 8 columns with overflow split  ---------- */

const buildColumns = (vulns) => {
  const cols = Array.from({ length: 8 }, () => ({ items: [], count: 0 }));

  const total = vulns.length;
  const targetPerCol = Math.ceil(total / 8);

  // Group CVEs by year
  const yearMap = new Map();
  vulns.forEach((cve) => {
    const year = parseInt(cve.split('-')[1], 10);
    if (!yearMap.has(year)) yearMap.set(year, []);
    yearMap.get(year).push(cve);
  });

  const sortedYears = Array.from(yearMap.keys()).sort((a, b) => a - b);

  let curCol = 0;

  for (const year of sortedYears) {
    const items = yearMap.get(year);
    let remaining = items.length;
    let offset = 0;

    while (remaining > 0) {
      if (curCol >= cols.length) curCol = 0;

      const spaceLeft = targetPerCol - cols[curCol].count;
      const take = Math.min(remaining, spaceLeft || remaining);

      const slice = items.slice(offset, offset + take);
      cols[curCol].items.push(...slice);
      cols[curCol].count += take;

      remaining -= take;
      offset += take;

      if (take >= spaceLeft) curCol++;
    }
  }

  // Compute year ranges for the header row
  const header = cols.map((col) => {
    if (!col.items.length) return '-';
    const years = col.items.map((cve) => parseInt(cve.split('-')[1], 10));
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? `${min}` : `${min}–${max}`;
  });

  return { cols, header };
};

/** ----------  Component  ---------- */

const VulnsDisplay = ({ data }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-gray-400">No data supplied.</p>;
  }

  const rawVulns = collectVulns(data);
  const vulns = sortCves(rawVulns);

  if (vulns.length === 0) {
    return <p className="text-gray-400">No vulnerabilities found.</p>;
  }

  const { cols, header } = buildColumns(vulns);

  return (
    <div className="space-y-4">
      <Section title="Vulnerabilities" />
      <p className="text-sm text-gray-300 mb-2">
        Total CVEs: <span className="font-semibold">{vulns.length}</span>
      </p>

      {/* Header row – year ranges */}
      <div className="grid grid-cols-8 gap-4 text-sm font-semibold text-gray-200 border-b border-gray-700 pb-1">
        {header.map((range, i) => (
          <div key={i} className="text-left">
            {range}
          </div>
        ))}
      </div>

      {/* Columns */}
      <div className="grid grid-cols-8 gap-4">
        {cols.map((col, idx) => (
          <div
            key={idx}
            className={`space-y-2 ${idx < 7 ? 'border-r border-gray-700' : ''}`}
          >
            {col.items.map((cve) => (
              <div
                key={cve}
                className="bg-gray-800 rounded p-1 text-xs text-gray-200 hover:bg-gray-700 transition-colors"
              >
                {cve}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VulnsDisplay;
