#!/usr/bin/env python3

import os
import json
import argparse
import glob
import gzip
import base64
import xml.etree.ElementTree as ET
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from collections import defaultdict

def parse_dir_name(dir_path):
    base = os.path.basename(os.path.normpath(dir_path))
    parts = base.rsplit('_', 1)
    if len(parts) == 2:
        domain, ip = parts[0], parts[1]
    else:
        domain, ip = base, ''
    return domain, ip

def xml_to_dict(elem):
    d = {}
    if elem.attrib:
        d.update({f"@{k}": v for k, v in elem.attrib.items()})
    children = list(elem)
    if children:
        child_dict = {}
        for child in children:
            child_name = child.tag
            child_val = xml_to_dict(child)
            if child_name in child_dict:
                if not isinstance(child_dict[child_name], list):
                    child_dict[child_name] = [child_dict[child_name]]
                child_dict[child_name].append(child_val)
            else:
                child_dict[child_name] = child_val
        d.update(child_dict)
    text = elem.text.strip() if elem.text and elem.text.strip() else None
    if text:
        d['#text'] = text
    return d

def process_json_service(path, record, service_name, file_pattern="*.json"):
    glob_str = os.path.join(path, f"{service_name} |*")
    glob_str = os.path.join(path, f"{service_name} |*{file_pattern}")

    entries = []

    for file in glob.glob(glob_str):
        parts = file.split('|')
        if len(parts) < 4:
            continue
        date = parts[1].strip()
        time = parts[2].strip()
        if date is None:                # pattern not recognised – skip
            continue

        try:
            with open(file, 'r', encoding='utf-8') as f:
                data = json.load(f)        # <-- single‑object JSON
        except (OSError, json.JSONDecodeError):
            # file unreadable or not valid JSON – skip
            continue

        # Enrich the data with the timestamp from the filename
        data['date'] = date
        data['time'] = time

        entries.append(data)

    if entries:
        record.setdefault(service_name, []).extend(entries)

def process_jsonl_service(path, record, service_name, file_pattern="*.jsonl"):
    glob_str = os.path.join(path, f"{service_name} |*{file_pattern}")

    entries = []

    for file in glob.glob(glob_str):
        date, time = _extract_dt_from_filename(file)
        if date is None:                # pattern not recognised – skip
            continue

        try:
            with open(file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)  # keep raw values intact
                    except json.JSONDecodeError:
                        continue                # malformed JSON – skip
                    data['date'] = date
                    data['time'] = time
                    entries.append(data)
        except OSError:
            continue

    if entries:
        record.setdefault(service_name, []).extend(entries)

def process_nmap(path, record):
    pattern = os.path.join(path, "nmap | *.xml")
    entries = []
    for file in glob.glob(pattern):
        parts = file.split('|')
        if len(parts) < 3:
            continue
        date = parts[1].strip()
        time = parts[2].strip()
        try:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read().strip()
        except:
            continue
        if not content:
            entry = {"date": date, "time": time, "empty_result": True}
        else:
            try:
                root = ET.fromstring(content)
                data = xml_to_dict(root)
                entry = {"date": date, "time": time, "empty_result": False}
                entry.update(data)
            except:
                entry = {"date": date, "time": time, "empty_result": True}
        entries.append(entry)
    if entries:
        record["nmap"] = entries

def process_tlsx(path, record):
    pattern = os.path.join(path, "TLSX |*")
    entries = []
    for file in glob.glob(pattern):
        parts = file.split('|')
        if len(parts) < 3:
            continue
        date = parts[1].strip()
        time = parts[2].strip()
        try:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read().strip()
        except:
            continue
        if not content:
            entry = {"date": date, "time": time, "empty_result": True}
        else:
            try:
                data = json.loads(content)
            except:
                continue
            if isinstance(data, list):
                if data:
                    data = data[0]
                else:
                    data = {}
            entry = {"date": date, "time": time, "empty_result": False}
            entry.update(data)
        entries.append(entry)
    if entries:
        record["TLSX"] = entries

def process_subfinder(path, record):
    pattern = os.path.join(path, "subfinder |*")
    entries = []
    for file in glob.glob(pattern):
        parts = file.split('|')
        if len(parts) < 4:           # need at least date, time and an address
            continue
        date = parts[1].strip()
        time = parts[2].strip()
        try:
            with open(file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    data['date'] = date
                    data['time'] = time
                    entries.append(data)
        except OSError:
            continue
    if entries:
        record.setdefault("subfinder", []).extend(entries)

def process_urlfinder(path, record):
    pattern = os.path.join(path, "urlfinder |*")
    aggregated_data = {}

    for file in glob.glob(pattern):
        parts = file.split('|')
        if len(parts) < 4:  # need date, time and a host field
            continue

        try:
            with open(file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        data = json.loads(line)
                        input_val = data.get("input")
                        url = data.get("url")

                        # Skip if essential data is missing
                        if not input_val or not url:
                            continue

                        # Get or create the entry for this specific 'input'
                        if input_val not in aggregated_data:
                            aggregated_data[input_val] = {
                                "sources": set(),
                                "urls": []
                            }
                        
                        # Add the URL
                        aggregated_data[input_val]["urls"].append(url)

                        # Add sources if they exist, using a set to store unique values
                        if "sources" in data and isinstance(data["sources"], list):
                            aggregated_data[input_val]["sources"].update(data["sources"])

                    except (json.JSONDecodeError, KeyError):
                        # Ignore malformed lines or lines missing expected keys
                        continue
        except OSError:
            continue

    # Convert the aggregated data into the final list format
    final_entries = []
    for input_val, data in aggregated_data.items():
        entry = {
            "input": input_val,
            "urls": data["urls"]
        }
        # Only add the 'sources' key if any were actually found
        if data["sources"]:
            entry["sources"] = list(data["sources"]) # Convert set to list for JSON compatibility
        final_entries.append(entry)

    # Add the compacted list to the record
    if final_entries:
        record["urlfinder"] = final_entries

def process_httpx(path, record):
    aggregated_asns = defaultdict(lambda: {
        'details': {},
        'hosts': defaultdict(lambda: defaultdict(lambda: {
            'responses': [],
            'unique_tech': set(),
            'unique_webservers': set(),
            'unique_content_types': set(),
            'jarm_hashes': set(),
        }))
    })

    pattern = os.path.join(path, "httpx |*")
    for file in glob.glob(pattern):
        try:
            with open(file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    # --- Safely extract key identifiers ---
                    asn_info = data.get('asn', {})
                    as_number = asn_info.get('as_number')
                    host_ip = data.get('host')
                    port = data.get('port')

                    # Skip entry if essential grouping information is missing
                    if not all([as_number, host_ip, port]):
                        continue

                    # --- Aggregate data into the nested structure ---
                    asn_group = aggregated_asns[as_number]
                    host_group = asn_group['hosts'][host_ip]
                    port_group = host_group[str(port)] # Ensure port is a string key

                    # Store ASN details only once
                    if not asn_group['details']:
                        asn_group['details'] = {
                            'as_name': asn_info.get('as_name'),
                            'as_country': asn_info.get('as_country'),
                            'as_range': asn_info.get('as_range')
                        }

                    # --- Create a compact response object ---
                    response = {
                        'timestamp': data.get('timestamp'),
                        'url': data.get('url'),
                        'status_code': data.get('status_code'),
                        'method': data.get('method'),
                        'scheme': data.get('scheme'),
                        'path': data.get('path'),
                        'title': data.get('title'),
                        'final_url': data.get('final_url'),
                        'content_length': data.get('content_length'),
                        'hash': data.get('hash'),
                        'header': data.get('header'),
                        'chain': data.get('chain')
                    }
                    
                    # Compress and encode large text fields to save space
                    for field in ['body', 'raw_header', 'request']:
                        if data.get(field):
                            compressed = gzip.compress(data[field].encode('utf-8', 'ignore'))
                            response[f"{field}_compressed_b64"] = base64.b64encode(compressed).decode('ascii')
                    
                    # Add the compact response to the list for this port
                    port_group['responses'].append({k: v for k, v in response.items() if v is not None})

                    # --- Update summarized sets for the port ---
                    if data.get('tech'):
                        port_group['unique_tech'].update(data['tech'])
                    if data.get('webserver'):
                        port_group['unique_webservers'].add(data['webserver'])
                    if data.get('content_type'):
                        port_group['unique_content_types'].add(data['content_type'])
                    if data.get('jarm_hash'):
                        port_group['jarm_hashes'].add(data.get('jarm_hash'))

        except OSError:
            continue

    # --- Convert the aggregated dictionary into the final list format ---
    final_httpx_structure = []
    for as_number, asn_data in aggregated_asns.items():
        asn_entry = {
            'as_number': as_number,
            **asn_data['details'],
            'hosts': []
        }
        for host_ip, host_data in asn_data['hosts'].items():
            host_entry = {
                'host': host_ip,
                'ports': []
            }
            for port, port_data in host_data.items():
                port_entry = {
                    'port': port,
                    'responses': port_data['responses'],
                    # Convert sets to sorted lists for consistent JSON output
                    'tech': sorted(list(port_data['unique_tech'])),
                    'webservers': sorted(list(port_data['unique_webservers'])),
                    'content_types': sorted(list(port_data['unique_content_types'])),
                    'jarm_hashes': sorted(list(port_data['jarm_hashes']))
                }
                host_entry['ports'].append(port_entry)
            asn_entry['hosts'].append(host_entry)
        final_httpx_structure.append(asn_entry)
        
    if final_httpx_structure:
        record['httpx'] = final_httpx_structure

def process_fingerprintx(path, record):
    pattern = os.path.join(path, "fingerprintx |*")
    entries = []
    for file in glob.glob(pattern):
        parts = file.split('|')
        if len(parts) < 4:
            continue
        date = parts[1].strip()
        time = parts[2].strip()
        try:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if not content:
                    continue
                try:
                    data = json.loads(content)
                except json.JSONDecodeError:
                    continue
                data['date'] = date
                data['time'] = time
                entries.append(data)
        except OSError:
            continue
    if entries:
        record.setdefault("fingerprintx", []).extend(entries)

def process_smap(path, record):
    pattern = os.path.join(path, "smap |*")
    entries = []
    for file in glob.glob(pattern):
        parts = file.split('|')
        if len(parts) < 4:
            continue
        date = parts[1].strip()
        time = parts[2].strip()
        try:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if not content:
                    continue
                try:
                    data = json.loads(content)          # this is a list
                except json.JSONDecodeError:
                    continue
                # Attach datetime info to each host entry
                for host in data:
                    host['date'] = date
                    host['time'] = time
                entries.append(data)
        except OSError:
            continue
    if entries:
        record.setdefault("smap", []).extend(entries)

def process_katana(path, record):
    pattern = os.path.join(path, "katana |*")
    entries = []

    for file in glob.glob(pattern):
        parts = file.split('|')
        if len(parts) < 4:
            continue                    # need at least date, time, host

        date = parts[1].strip()
        time = parts[2].strip()

        try:
            with open(file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)  # keep raw string values as-is
                    except json.JSONDecodeError:
                        # malformed line – skip
                        continue
                    # attach datetime from filename
                    data['date'] = date
                    data['time'] = time
                    entries.append(data)
        except OSError:
            # cannot read file – skip
            continue

    if entries:
        record.setdefault("katana", []).extend(entries)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dir")
    args = parser.parse_args()
    load_dotenv()
    uri = os.getenv("MONGO_CONNECTION_URI")
    db_name = os.getenv("MONGO_DB_NAME")
    client = MongoClient(uri)
    db = client[db_name]
    collection = db["records"]
    domain, ip = parse_dir_name(args.dir)
    main_record = {"ipv4": ip, "domain": domain}
    process_tlsx(args.dir, main_record)
    process_smap(args.dir, main_record)
    process_subfinder(args.dir, main_record)
    process_urlfinder(args.dir, main_record)
    process_httpx(args.dir, main_record)
    process_fingerprintx(args.dir, main_record)
    process_katana(args.dir, main_record) 
    process_nmap(args.dir, main_record)
    process_json_service(args.dir, main_record, "VirusTotal")
    process_json_service(args.dir, main_record, "AbuseIPDB")
    collection.insert_one(main_record)

if __name__ == "__main__":
    main()
