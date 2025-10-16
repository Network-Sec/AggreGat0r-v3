import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';

const IGNORED_KEYS = ['_id', 'ipv4', 'domain'];

// --- Helper Functions (Unchanged) ---
const getRecordDate = (record) => {
    for (const key in record) {
        if (Array.isArray(record[key]) && record[key].length > 0) {
            const firstItem = Array.isArray(record[key][0]) ? record[key][0][0] : record[key][0];
            if (firstItem && firstItem.date && firstItem.time) return `${firstItem.date} ${firstItem.time}`;
        }
    }
    return 'N/A';
};

function extractPorts(obj) {
    const ports = new Set();
    const walk = (value) => {
        if (Array.isArray(value)) {
            value.forEach(walk);
        } else if (value && typeof value === 'object') {
            Object.entries(value).forEach(([k, v]) => {
                if ((k === 'port' || k === 'ports')) {
                    const portNum = Number(v);
                    if (!isNaN(portNum)) {
                         ports.add(portNum);
                    }
                }
                walk(v);
            });
        }
    };
    walk(obj);
    return Array.from(ports).sort((a, b) => a - b);
}


// --- Reusable UI Components ---

const PortsBadge = ({ ports }) => {
    if (!ports || ports.length === 0) return <span className="text-xs text-gray-500">N/A</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {ports.map((p, idx) => <span key={idx} className="text-xs bg-indigo-600 text-white rounded px-1 py-0.5">{p}</span>)}
        </div>
    );
};

const PaginationControls = ({ pagination, onPageChange, loading }) => {
    if (!pagination || !pagination.totalRecords) return null;
    const { currentPage, totalPages } = pagination;
    return (
        <div className="flex items-center gap-2 text-sm">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1 || loading} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-500 hover:text-white">&larr; Prev</button>
            <span className="text-gray-400">Page {currentPage} of {totalPages || 1}</span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages || loading} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-500 hover:text-white">Next &rarr;</button>
        </div>
    );
};

const SortableHeader = ({ children, columnKey, sortConfig, onSort, className = '' }) => {
    const isSorted = sortConfig.key === columnKey;
    const direction = isSorted ? sortConfig.direction : null;
    let icon = '';
    if (isSorted) {
      icon = direction === 'asc' ? '↑' : '↓';
    }

    return (
        <th className={`px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-600 cursor-pointer select-none hover:bg-gray-700/50 ${className}`} onClick={() => onSort(columnKey)}>
            <div className="flex items-center">
                <span>{children}</span>
                {icon && <span className="ml-2 text-cyan-400 font-bold" style={{ fontSize: '1.2rem', lineHeight: '1' }}>{icon}</span>}
            </div>
        </th>
    );
};

// --- Custom Hook for Data Fetching and Logic ---

function useRecords(debouncedSearchTerm, itemsPerPage, sortConfig, setPagination, currentPage) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            setError(null);

            const isScreenshotSort = sortConfig.key === 'screenshot';
            const backendSortKey = isScreenshotSort ? 'ip' : sortConfig.key;
            const backendSortOrder = isScreenshotSort ? 'asc' : sortConfig.direction;

            const params = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearchTerm,
            });

            if (backendSortKey) {
                params.append('sortBy', backendSortKey);
                params.append('sortOrder', backendSortOrder);
            }

            try {
                const res = await fetch(`http://localhost:5000/api/records?${params.toString()}`);
                if (!res.ok) throw new Error((await res.json()).message || 'Failed to fetch data');
                const { data, pagination: newPagination } = await res.json();

                const processed = data.map(record => ({ ...record, displayDate: getRecordDate(record), tools: Object.keys(record).filter(k => !IGNORED_KEYS.includes(k)), ports: extractPorts(record) }));

                const withScreenshots = await Promise.all(
                    processed.map(async rec => {
                        const screenshotParams = new URLSearchParams();
                        if (rec.ipv4) screenshotParams.set('ip', rec.ipv4);
                        if (rec.domain) screenshotParams.set('domain', rec.domain);
                        try {
                            const scrRes = await fetch(`http://localhost:5000/api/records/screenshots?${screenshotParams.toString()}`);
                            if (!scrRes.ok) return { ...rec, screenshot: null };
                            const scrData = await scrRes.json();
                            const landscape = [...(scrData.ipv4 || []), ...(scrData.domain || [])].find(s => s.orientation === 'landscape');
                            return { ...rec, screenshot: landscape ? `/screenshots/${landscape.filename}` : null };
                        } catch (e) { return { ...rec, screenshot: null }; }
                    })
                );

                if (isScreenshotSort) {
                    withScreenshots.sort((a, b) => {
                        const aHas = a.screenshot ? 1 : 0;
                        const bHas = b.screenshot ? 1 : 0;
                        return sortConfig.direction === 'desc' ? bHas - aHas : aHas - bHas;
                    });
                }

                setRecords(withScreenshots);
                setPagination(newPagination);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, [currentPage, itemsPerPage, debouncedSearchTerm, sortConfig, setPagination]);

    return { records, loading, error };
}


// --- Table Component ---

const RecordsTable = ({ records, loading, error, sortConfig, onSort }) => {
    const navigate = useNavigate();

    const TableBody = () => {
        if (loading) return <tr><td colSpan="6" className="text-center p-8 text-gray-400">Loading records...</td></tr>;
        if (error) return <tr><td colSpan="6" className="text-center p-8 text-red-400">Error: {error}</td></tr>;
        if (records.length === 0) return <tr><td colSpan="6" className="text-center p-8 text-gray-400">No records found.</td></tr>;

        return records.map((record, index) => (
            <tr key={record._id} onClick={() => navigate(`/record/${record._id}`)} className={`cursor-pointer ${index % 2 === 0 ? 'bg-gray-800/60' : 'bg-gray-800/30'} hover:bg-gray-700/70 transition-colors`}>
                <td className="px-4 py-3 text-sm text-cyan-400 font-semibold border-b border-gray-700 truncate">{record.ipv4}</td>
                <td className="px-4 py-3 text-sm text-gray-200 border-b border-gray-700 truncate">{record.domain}</td>
                <td className="px-4 py-3 text-sm text-gray-400 border-b border-gray-700">{record.displayDate}</td>
                <td className="px-4 py-3 text-sm text-gray-400 border-b border-gray-700"><div className="flex flex-wrap gap-1">{record.tools.map(tool => <span key={tool} className="text-xs bg-gray-700 text-gray-300 px-2 py-1">{tool}</span>)}</div></td>
                <td className="px-4 py-3 border-b border-gray-700"><PortsBadge ports={record.ports} /></td>
                <td className="px-4 py-3 text-center border-b border-gray-700">{record.screenshot ? <img src={record.screenshot} alt={`Screenshot`} className="h-6 w-auto object-contain" /> : <span className="text-xs text-gray-500">N/A</span>}</td>
            </tr>
        ));
    };

    return (
        <div className="bg-gray-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full shadow-xl border-separate table-fixed" style={{ borderSpacing: 0 }}>
                    {/* --- THIS IS THE FIX --- */}
                    {/* All comments and extra whitespace have been removed from inside the colgroup tag. */}
                    <colgroup>
                        <col style={{ width: '180px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '180px' }} />
                        <col style={{ width: '35%' }} />
                        <col style={{ width: '35%' }} />
                        <col style={{ width: '120px' }} />
                    </colgroup>
                    {/* --- END OF FIX --- */}
                    <thead className="bg-gray-800">
                        <tr>
                            <SortableHeader columnKey="ip" sortConfig={sortConfig} onSort={onSort}>IP Address</SortableHeader>
                            <SortableHeader columnKey="domain" sortConfig={sortConfig} onSort={onSort}>Domain</SortableHeader>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-600">Scan Date</th>
                            <SortableHeader columnKey="tools" sortConfig={sortConfig} onSort={onSort}>Tools</SortableHeader>
                            <SortableHeader columnKey="ports" sortConfig={sortConfig} onSort={onSort}>Ports</SortableHeader>
                            <SortableHeader columnKey="screenshot" sortConfig={sortConfig} onSort={onSort}>Screenshot</SortableHeader>
                        </tr>
                    </thead>
                    <tbody>
                        <TableBody />
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Main Page Component ---

function RecordsList() {
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
    const [itemsPerPage, setItemsPerPage] = useState(100);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
    const [sortConfig, setSortConfig] = useState({ key: 'ip', direction: 'asc' });

    const { records, loading, error } = useRecords(debouncedSearchTerm, itemsPerPage, sortConfig, setPagination, pagination.currentPage);

    useEffect(() => {
        setPagination(p => ({ ...p, currentPage: 1 }));
    }, [debouncedSearchTerm, itemsPerPage, sortConfig]);

    const handleSort = useCallback((key) => {
        setSortConfig(current => {
            if (current.key !== key) {
                return { key, direction: 'asc' };
            }
            if (current.direction === 'asc') {
                return { key, direction: 'desc' };
            }
            return { key: 'ip', direction: 'asc' };
        });
    }, []);

    const handlePageChange = (page) => {
      if (page > 0 && page <= (pagination.totalPages || 1) && !loading) {
        setPagination(p => ({ ...p, currentPage: page }));
      }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-6 text-cyan-400">Records Overview</h1>

            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 h-12">
                <div className="flex-1 min-w-0"><PaginationControls pagination={pagination} onPageChange={handlePageChange} loading={loading} /></div>
                <div className="flex-1 w-full md:w-auto md:mx-4"><input type="text" placeholder="ip:1.1.1.1 AND ports>80" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400" /></div>
                <div className="flex-1 flex justify-end min-w-0"><div className="flex items-center gap-2"><span className="text-gray-400 text-sm whitespace-nowrap">Per Page:</span><select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} disabled={loading} className="bg-gray-700 text-white border border-gray-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50">{[10, 25, 50, 100, 500, 1000].map(v => <option key={v} value={v}>{v}</option>)}</select></div></div>
            </div>

            <RecordsTable records={records} loading={loading} error={error} sortConfig={sortConfig} onSort={handleSort} />

            {pagination.totalRecords > 0 && !loading && (
                <div className="flex justify-between items-center mt-4 text-gray-400 text-sm">
                    <div>Showing <strong>{(pagination.currentPage - 1) * itemsPerPage + 1}</strong>-<strong>{Math.min(pagination.currentPage * itemsPerPage, pagination.totalRecords)}</strong> of <strong>{pagination.totalRecords}</strong></div>
                    <PaginationControls pagination={pagination} onPageChange={handlePageChange} loading={loading} />
                </div>
            )}
        </div>
    );
}

export default RecordsList;