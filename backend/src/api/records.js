const express = require('express');
const { getDb } = require('../config/database');
const { ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

const zlib = require('zlib');
const util = require('util');
const gunzip = util.promisify(zlib.gunzip);

/* --------------------------------------------------------------
   MASTER ENDPOINT: Handles Pagination, Search, and Sorting
   -------------------------------------------------------------- */

// --- THIS IS THE EXACT SAME FUNCTION FROM YOUR FRONTEND ---
function extractPorts(obj) {
    const ports = new Set();
    const walk = (value) => {
        if (Array.isArray(value)) {
            value.forEach(walk);
        } else if (value && typeof value === 'object' && value !== null) {
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
// --- END OF FRONTEND FUNCTION ---


router.get('/', async (req, res) => {
    try {
        const db = getDb();

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const skip = (page - 1) * limit;
        const searchQuery = req.query.search || '';
        const sortBy = req.query.sortBy || 'ip';
        const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
        
        console.log(`\n--- NEW REQUEST: page=${page}, search="${searchQuery}" ---`);

        // --- 1. Basic Database Query ---
        // We will only filter by IP or domain in the database. Port filtering happens later.
        const simpleConditions = [];
        let portFilter = null;
        
        if (searchQuery) {
            const mongoOperatorMap = { '=': '$eq', '!=': '$ne', '>': '$gt', '>=': '$gte', '<': '$lt', '<=': '$lte' };
            const advancedQueryRegex = /(\w+)\s*(:|!=|>=|<=|>|<|=)\s*(.*)/;
            const parts = searchQuery.split(/ AND /i);

            parts.forEach(part => {
                const trimmedPart = part.trim();
                if (!trimmedPart) return;
                const match = trimmedPart.match(advancedQueryRegex);
                if (match) {
                    let [, key, op, value] = match.map(s => s.trim());
                    if (op === ':') op = '=';
                    const lowerKey = key.toLowerCase();
                    if (lowerKey === 'ports' || lowerKey === 'port') {
                        // We capture the port filter to use later in JavaScript
                        const numValue = !isNaN(parseFloat(value)) && isFinite(value) ? parseFloat(value) : null;
                        if (numValue !== null) {
                            portFilter = { op: mongoOperatorMap[op], value: numValue };
                            console.log(`[DEBUG] Captured JS port filter:`, portFilter);
                        }
                    } else if (lowerKey === 'ip' || lowerKey === 'ipv4') {
                        simpleConditions.push({ 'ipv4': { $regex: value.replace(/\./g, '\\.'), $options: 'i' } });
                    } else if (lowerKey === 'domain') {
                        simpleConditions.push({ 'domain': { $regex: value, $options: 'i' } });
                    }
                } else {
                    simpleConditions.push({ $or: [{ ipv4: { $regex: trimmedPart.replace(/\./g, '\\.'), $options: 'i' } }, { domain: { $regex: trimmedPart, $options: 'i' } }] });
                }
            });
        }
        
        const query = simpleConditions.length > 0 ? { $and: simpleConditions } : {};
        console.log('[DEBUG] Executing basic DB query:', JSON.stringify(query));
        let allMatchingRecords = await db.collection(process.env.MONGO_DB_COLLECTION).find(query).toArray();
        console.log(`[DEBUG] Fetched ${allMatchingRecords.length} records from DB before port filtering.`);

        // --- 2. In-Memory Port Aggregation & Filtering (The Frontend Logic) ---
        let processedRecords = allMatchingRecords.map(record => {
            const ports = extractPorts(record);
            return { ...record, unifiedPorts: ports };
        });

        // Now, apply the port filter if it exists
        if (portFilter) {
            processedRecords = processedRecords.filter(record => {
                // .some checks if at least one port in the array satisfies the condition
                switch (portFilter.op) {
                    case '$gt':  return record.unifiedPorts.some(p => p > portFilter.value);
                    case '$gte': return record.unifiedPorts.some(p => p >= portFilter.value);
                    case '$lt':  return record.unifiedPorts.some(p => p < portFilter.value);
                    case '$lte': return record.unifiedPorts.some(p => p <= portFilter.value);
                    case '$eq':  return record.unifiedPorts.includes(portFilter.value);
                    case '$ne':  return !record.unifiedPorts.includes(portFilter.value);
                    default: return true;
                }
            });
        }

        console.log(`[DEBUG] ${processedRecords.length} records remain after JS port filtering.`);
        
        // --- 3. Manual Sorting & Pagination ---
        const totalCount = processedRecords.length;
        
        // Add fields needed for sorting
        processedRecords.forEach(rec => {
            rec.portCount = rec.unifiedPorts.length;
            rec.toolCount = Object.keys(rec).filter(k => !['_id', 'ipv4', 'domain', 'unifiedPorts'].includes(k)).length;
        });

        // Sort the data in-memory
        const sortKeyMap = { 'ip': 'ipv4', 'domain': 'domain', 'tools': 'toolCount', 'ports': 'portCount' };
        const sortKey = sortKeyMap[sortBy] || 'ipv4';
        processedRecords.sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            let comparison = 0;
            if (valA > valB) comparison = 1;
            else if (valA < valB) comparison = -1;
            return sortOrder === -1 ? comparison * -1 : comparison;
        });

        // Paginate the final result
        const paginatedData = processedRecords.slice(skip, skip + limit);

        res.json({
            data: paginatedData,
            pagination: { totalRecords: totalCount, totalPages: Math.ceil(totalCount / limit), currentPage: page }
        });

    } catch (error) {
        console.error("API Error in GET /:", error);
        res.status(500).json({ message: 'Error fetching records', error: error.message });
    }
});
/* --------------------------------------------------------------
   SCREENSHOTS & SINGLE RECORD ENDPOINTS (Unchanged)
   -------------------------------------------------------------- */
// ... (The /screenshots and /:id routes remain unchanged)
router.get('/screenshots', async (req, res) => {
    try {
        const screenshotDir = path.resolve(__dirname, '../../..', 'frontend', 'public', 'screenshots');
        const ipFilter = (req.query.ip || '').trim();
        const domainFilter = (req.query.domain || '').trim();

        if (!ipFilter && !domainFilter) {
            return res.status(400).json({ error: 'At least one of ip or domain must be supplied' });
        }

        try {
            await fs.access(screenshotDir);
        } catch (e) {
            return res.json({ ipv4: [], domain: [] });
        }

        const files = await fs.readdir(screenshotDir);
        const isIP = str => /^\d+\.\d+\.\d+\.\d+$/.test(str);
        const parse = fn => {
            const portMatch = fn.match(/_(\d+)_/);
            const orientMatch = fn.match(/_(landscape|fullpage)\./);
            let orientation = null;
            if (orientMatch) {
                orientation = orientMatch[1] === 'fullpage' ? 'portrait' : 'landscape';
            }
            return { port: portMatch ? portMatch[1] : null, orientation };
        };

        const result = { ipv4: [], domain: [] };
        for (const fname of files) {
            const prefix = fname.split('_')[0];
            const matchesIp = ipFilter && prefix.startsWith(ipFilter);
            const matchesDomain = domainFilter && prefix.startsWith(domainFilter);
            if (matchesIp || matchesDomain) {
                const group = isIP(prefix) ? 'ipv4' : 'domain';
                const { port, orientation } = parse(fname);
                result[group].push({ filename: fname, orientation, port });
            }
        }

        const sortByPort = a => a.port ? +a.port : 0;
        result.ipv4 = result.ipv4.sort((x, y) => sortByPort(x) - sortByPort(y));
        result.domain = result.domain.sort((x, y) => sortByPort(x) - sortByPort(y));
        res.json(result);
    } catch (err) {
        console.error("API Error in GET /screenshots:", err);
        res.status(500).json({ message: 'Failed to list screenshots', error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const db = getDb();
        const record = await db.collection(process.env.MONGO_DB_COLLECTION).findOne({ _id: new ObjectId(req.params.id) });
        if (!record) {
            return res.status(404).json({ message: 'Record not found' });
        }
        // ... (decompression logic remains the same)
        if (record.httpx && Array.isArray(record.httpx)) {
            for (const asn of record.httpx) {
                if (!asn.hosts) continue;
                for (const host of asn.hosts) {
                    if (!host.ports) continue;
                    for (const port of host.ports) {
                        if (!port.responses) continue;
                        for (const response of port.responses) {
                            const fieldsToDecompress = Object.keys(response).filter(k => k.endsWith('_compressed_b64'));
                            for (const field of fieldsToDecompress) {
                                try {
                                    const buffer = Buffer.from(response[field], 'base64');
                                    const decompressed = await gunzip(buffer);
                                    const originalFieldName = field.replace('_compressed_b64', '');
                                    response[originalFieldName] = decompressed.toString('utf-8');
                                    delete response[field];
                                } catch (e) {
                                    const originalFieldName = field.replace('_compressed_b64', '');
                                    response[originalFieldName] = `[Error decompressing data: ${e.message}]`;
                                    delete response[field];
                                }
                            }
                        }
                    }
                }
            }
        }
        res.json(record);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching record', error });
    }
});


module.exports = router;