import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ToolCard from '../components/ToolCard';
import StatsCard from '../components/StatsCard';
import ScreenshotDisplay from '../components/ScreenshotDisplay';

const IGNORED_KEYS = ['_id', 'ipv4', 'domain', 'scan_date'];

function Dashboard() {
    const [record, setRecord] = useState(null);
    const { id } = useParams();

    useEffect(() => {
        fetch(`http://localhost:5000/api/records/${id}`)
            .then(res => res.json())
            .then(data => setRecord(data))
            .catch(err => console.error("Error fetching record: ", err));
    }, [id]);

    if (!record) {
        return <div className="text-center mt-10">Loading...</div>;
    }

    // +++ THE CASE-INSENSITIVE FIX +++

    // 1. Define the canonical names of all full-width tools, in lowercase.
    const fullWidthToolNames = [
        'nmap', 
        'urlfinder', 
        'httpx', 
        'smap', 
        'abuseipdb', 
        'virustotal'
    ];

    const allToolKeys = Object.keys(record).filter(key => !IGNORED_KEYS.includes(key));

    // 2. The tools for the grid are any tools where the *lowercase version of the key*
    //    is NOT in our full-width list. This check is now immune to case issues.
    const gridTools = allToolKeys.filter(
        key => !fullWidthToolNames.includes(key.toLowerCase())
    );
    
    // --- END OF FIX ---

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-h-[550px] space-b-6 overflow-y-none">
                    <StatsCard record={record} />
                    <ScreenshotDisplay record={record} />   
                </div>
                
                {/* --- Render full-width cards in the correct order --- */}
                {/* We use the original key names (e.g., 'AbuseIPDB') from the record to access the data */}
                {record.nmap && (
                    <div className="min-h-[500px]">
                        <ToolCard toolName="nmap" toolData={record.nmap} />
                    </div>
                )}
                {record.urlfinder && <ToolCard toolName="urlfinder" toolData={record.urlfinder} />}
                {record.httpx && <ToolCard toolName="httpx" toolData={record.httpx} />}

                {/* --- The grid will now ONLY contain tools like 'tlsx' --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-h-[700px] space-b-6 overflow-y-scroll">
                    {gridTools.map(toolName => (
                        <ToolCard key={toolName} toolName={toolName} toolData={record[toolName]} />
                    ))}
                </div>

                {/* --- The final full-width cards, in order, at the bottom --- */}
                {record.smap && <ToolCard toolName="smap" toolData={record.smap} />}

                {/* --- Extra SMAP Vulns, if they exist --- */}
                {record.smap?.flat(2).some(r => Array.isArray(r.vulns) && r.vulns.length) && (
                   <ToolCard toolName="vulns" toolData={record.smap} />
                )}

                {/* Use the exact key from the database if known, or check case-insensitively if needed */}
                {/* For simplicity and robustness, we check for both common cases here. */}
                {(record.abuseipdb || record.AbuseIPDB) && (
                    <div className="min-h-[450px]">
                         <ToolCard toolName="abuseipdb" toolData={record.abuseipdb || record.AbuseIPDB} />
                    </div>
                )}
                
                {(record.virustotal || record.VirusTotal) && (
                    <div className="min-h-[450px]">
                        <ToolCard toolName="virustotal" toolData={record.virustotal || record.VirusTotal} />
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;