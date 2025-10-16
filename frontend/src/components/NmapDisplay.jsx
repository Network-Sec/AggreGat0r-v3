import React, { useState } from 'react';
import KeyValue from './KeyValue';
import Section from './Section';

/* ------------------------------------------------------------------ */
/*  Color palette:  */
/*  header title  –  #00cfb2   (used for the tab bar)                */
/* ------------------------------------------------------------------ */

const NmapDisplay = ({ data }) => {
  /* ----------  guard against empty data  ---------- */
  if (!data || data.length === 0 || data[0].empty_result) {
    return <p className="text-gray-400">No results found.</p>;
  }

  const nmapRun = data[0];
  const ports = nmapRun.host?.ports?.port
    ? Array.isArray(nmapRun.host.ports.port)
      ? nmapRun.host.ports.port
      : [nmapRun.host.ports.port]
    : [];

  /* ----------  state for the active NSE‑script tab  ---------- */
  const portsWithScripts = ports.filter((p) => p.script);
  const [activePortIdx, setActivePortIdx] = useState(0);

  /* ------------------------------------------------------------------ */
  /*  Render                                                         */
  /* ------------------------------------------------------------------ */
  return (
    <div className="space-y-0 h-full flex flex-col bg-[#2c333b]">
      <div className="-mt-[58px] ml-[620px] mb-64 absolute pt-0 text-xl text-white">
        Scan Time: {nmapRun.runstats?.finished?.['@timestr']} | Duration:{' '}
        {nmapRun.runstats?.finished?.['@elapsed']} seconds
      </div>


      {/* Command Box */}
      <div className="">
        <Section title="CLI Command"/>
      </div>
      <div className="bg-black p-3 font-mono text-base text-green-400 overflow-x-auto">
        <span className="text-gray-500">$ </span>
        {nmapRun['@args'].split('-oA')[0].trim()}
      </div>

      {/* Ports Table */}
      {ports.length > 0 ? (
        <div className="flex-grow">
          <Section title="Open Ports" />
          <div className="overflow-y-auto bg-[#1a1a1a]" style={{ maxHeight: '400px' }}>
            <table className="min-w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-700 text-xs uppercase sticky top-0">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Port
                  </th>
                  <th scope="col" className="px-4 py-3">
                    State
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Service
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Product
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Version
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {ports.map((port, i) => (
                  <tr key={i} className="hover:bg-gray-600/50">
                    <td className="px-4 py-2 font-medium text-white">
                      {port['@portid']}
                    </td>
                    <td className="px-4 py-3">{port.state['@state']}</td>
                    <td className="px-4 py-3">{port.service?.['@name']}</td>
                    <td className="px-4 py-3">{port.service?.['@product']}</td>
                    <td className="px-4 py-3">{port.service?.['@version']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">No open ports found.</p>
      )}

      {/* ----------  NSE Script tabs  ---------- */}
      {portsWithScripts.length > 0 && (
        <div className="flex flex-col">
          <Section title="NSE Script Output" />

          {/*  ---- tab bar ----  */}
          <div
            className="flex space-x-1 overflow-x-auto border-b border-white bg-[#033] p-0 mb-0"
            role="tablist"
          >
            {portsWithScripts.map((p, idx) => (
              <button
                key={idx}
                role="tab"
                aria-selected={activePortIdx === idx}
                onClick={() => setActivePortIdx(idx)}
                className={`px-8 py-2 text-xl
                  ${
                    activePortIdx === idx
                      ? 'bg-blue-400 text-gray-200'
                      : 'text-gray-300 hover:bg-gray-600/20'
                  }`}
              >
                {p['@portid']}
              </button>
            ))}
          </div>

          {/*  ---- tab panel (only the active one shows) ----  */}
          <div className="">
            {portsWithScripts[activePortIdx]?.script && (
              <div className="mb-8">
                {(Array.isArray(portsWithScripts[activePortIdx].script)
                  ? portsWithScripts[activePortIdx].script
                  : [portsWithScripts[activePortIdx].script]
                ).map((script, sIdx) => (
                  <KeyValue key={sIdx} label={script['@id']}>
                    {script['@output']}
                  </KeyValue>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
  
    </div>
  );
};

export default NmapDisplay;
