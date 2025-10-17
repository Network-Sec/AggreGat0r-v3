import React from 'react';


/* ── 1️⃣  Register Chart.js core components ── */
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

/* ── 2️⃣  React‑Chartjs‑2 wrappers ── */
import { Doughnut, Bar } from 'react-chartjs-2';

/* ── 3️⃣  Dark‑friendly color palette ── */
const PIE_COLORS = ['#38BDF8', '#5117ffff'];   // cyan (open) / violet (closed)
const BAR_COLOR   = '#ffe224ff';               // emerald
const BAR_HOVER   = '#84C54E';

// Helper function for recursive key counting (unchanged from earlier versions)
const countKeysAndNonEmptyValues = (obj) => {
  let keyCount = 0;
  let nonEmptyValueCount = 0;

  if (typeof obj !== 'object' || obj === null) {
    return { keyCount: 0, nonEmptyValueCount: (obj !== null && obj !== undefined && obj !== '') ? 1 : 0 };
  }

  if (Array.isArray(obj)) {
    obj.forEach(item => {
      const { keyCount: subKeyCount, nonEmptyValueCount: subNonEmptyValueCount } = countKeysAndNonEmptyValues(item);
      keyCount += subKeyCount;
      nonEmptyValueCount += subNonEmptyValueCount;
    });
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        keyCount++;
        const value = obj[key];
        const { keyCount: subKeyCount, nonEmptyValueCount: subNonEmptyValueCount } = countKeysAndNonEmptyValues(value);
        keyCount += subKeyCount;
        nonEmptyValueCount += subNonEmptyValueCount;

        if (typeof value !== 'object' || value === null) {
          if (value !== null && value !== undefined && value !== '') {
            nonEmptyValueCount++;
          }
        }
      }
    }
  }
  return { keyCount, nonEmptyValueCount };
};

/* ── 4️⃣  StatsCard component (plain JS) ── */
const StatsCard = ({ record }) => {

  const scanCoveragePercentage = React.useMemo(() => {
    if (!record) return 0;
    const { keyCount, nonEmptyValueCount } = countKeysAndNonEmptyValues(record);
    const approximateMaxKeys = 500; // Adjust this value based on your data's complexity
    if (approximateMaxKeys === 0 || keyCount === 0) return 0;
    const rawPercentage = (nonEmptyValueCount / approximateMaxKeys) * 100;
    return Math.min(100, Math.round(rawPercentage));
  }, [record]);


  const portData = React.useMemo(() => {
    const counts = { open: 0, closed: 0 };
    const nmapRun = record.nmap?.[0];
    if (!nmapRun?.host?.ports?.port) return [];
    const ports = Array.isArray(nmapRun.host.ports.port)
      ? nmapRun.host.ports.port
      : [nmapRun.host.ports.port];
    ports.forEach(p => {
      const state = p.state?.['@state'];
      if (state === 'open') counts.open++;
      if (state === 'closed') counts.closed++;
    });
    return [
      { name: 'Open', value: counts.open },
      { name: 'Closed', value: counts.closed },
    ];
  }, [record]);

  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
  // CORRECTED: This logic now traverses the nested httpx data structure
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
  const statusData = React.useMemo(() => {
    const counts = {};
    if (Array.isArray(record.httpx)) {
      // httpx is an array of ASNs
      record.httpx.forEach(asn => {
        if (Array.isArray(asn.hosts)) {
          // Each ASN has hosts
          asn.hosts.forEach(host => {
            if (Array.isArray(host.ports)) {
              // Each host has ports
              host.ports.forEach(port => {
                if (Array.isArray(port.responses)) {
                  // Each port has an array of responses
                  port.responses.forEach(response => {
                    const code = response.status_code ?? 'unknown';
                    counts[code] = (counts[code] ?? 0) + 1;
                  });
                }
              });
            }
          });
        }
      });
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [record]);

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#E5E7EB' } },
      tooltip: {
        backgroundColor: '#1F2937',
        titleColor: '#FFF',
        bodyColor: '#E5E7EB',
        borderColor: '#4B5563',
        borderWidth: 1,
      },
    },
  };

  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1F2937',
        titleColor: '#FFF',
        bodyColor: '#E5E7EB',
        borderColor: '#4B5563',
        borderWidth: 1,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#E5E7EB' } },
      y: { grid: { display: false }, ticks: { color: '#E5E7EB' } },
    },
  };

  return (
    <div className="bg-[#162327] text-white p-6 shadow-xl border border-gray-500  w-full">
      {/* ── Header (domain / IP) ── */}
      <h1 className="text-4xl sm:text-5xl font-bold text-gray-300 mb-2 border-bottom ">
        {record.domain || record.ipv4}
      </h1>
      <p className="text-lg sm:text-xl text-gray-400 mt-1 mb-10">
        IP Address: {record.ipv4}
      </p>

      {/* ── Stats headline (back in) ── */}
      <h2 className="text-4xl font-semibold text-indigo-300 text-center mt-8 mb-8">
        Scan Statistics
      </h2>

      {/* ── Charts (two columns) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8 border-box">
        {/* Scan Coverage Percentage */}
        <div className="h-[240px] flex flex-col justify-center items-center">
          <h3 id="scan-cov-title" className="text-xl font-medium text-indigo-300 mb-3 text-center">
            Scan Coverage
          </h3>
          <div className="progress-circle-wrapper" style={{
              '--progress': scanCoveragePercentage // Pass the dynamic progress to CSS variable
          }}>
            <div className="outer-dark-base-circle">
              {/* This is the 3px gradient progress arc */}
              <div className="progress-gradient-arc"></div>

              {/* Dotted Inner Rings - each a separate div */}
              <div className="inner-dotted-ring dotted-ring-1"></div>
              <div className="inner-dotted-ring dotted-ring-2"></div>
              <div className="inner-dotted-ring dotted-ring-3"></div>
              <div className="inner-dotted-ring dotted-ring-4"></div>
              <div className="inner-dotted-ring dotted-ring-5"></div>
              <div className="inner-dotted-ring dotted-ring-6"></div>
              <div className="inner-dotted-ring dotted-ring-7"></div>
              <div className="inner-dotted-ring dotted-ring-8"></div>
              <div className="inner-dotted-ring dotted-ring-9"></div>
              <div className="inner-dotted-ring dotted-ring-10"></div>

              <div className="central-display-circle">
                <span className="percentage">{scanCoveragePercentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* HTTP status distribution */}
        <div className="h-[240px]">
          <h3 className="text-lg font-medium text-teal-300 mb-3 text-center">
            HTTP Status Codes
          </h3>
          {statusData.length ? (
            <Bar
              data={{
                labels: statusData.map(d => d.name),
                datasets: [
                  {
                    label: 'Count',
                    data: statusData.map(d => d.value),
                    backgroundColor: BAR_COLOR,
                    borderColor: BAR_COLOR,
                    borderWidth: 2,
                    hoverBackgroundColor: BAR_HOVER,
                    hoverBorderColor: BAR_HOVER,
                  },
                ],
              }}
              options={barOpts}
            />
          ) : (
            <p className="text-gray-400 text-center">No HTTP data</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;