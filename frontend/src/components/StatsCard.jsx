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

/* ── 4️⃣  StatsCard component (plain JS) ── */
const StatsCard = ({ record }) => {
  /* ----- 4.1  Open/Closed ports (pie) ----- */
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

  /* ----- 4.2  HTTP status codes (bar) ----- */
  const statusData = React.useMemo(() => {
    const counts = {};
    record.httpx?.forEach(i => {
      const code = i.status_code ?? 'unknown';
      counts[code] = (counts[code] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [record]);

  /* ── 4.3  Chart options (common theme) ── */
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

  /* ── 4.4  Render (no TS, no max‑height) ── */
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
        {/* 4.4.1  Open / Closed ports */}
        <div className="h-[240px]">
          <h3 className="text-lg font-medium text-indigo-300 mb-3 text-center">
            Port Status
          </h3>
          {portData.length ? (
            <Doughnut
              data={{
                labels: portData.map(d => d.name),
                datasets: [
                  {
                    data: portData.map(d => d.value),
                    backgroundColor: PIE_COLORS,
                    borderColor: 'transparent',
                    hoverBackgroundColor: PIE_COLORS.map(c => `${c}CC`),
                  },
                ],
              }}
              options={doughnutOpts}
            />
          ) : (
            <p className="text-gray-400 text-center">No port data</p>
          )}
        </div>

        {/* 4.4.2  HTTP status distribution */}
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
