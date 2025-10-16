#!/bin/bash

# --- Configuration ---
PORT="443"
DNS_RESOLVER="9.9.9.9"

# --- Usage Check ---
if [ "$#" -eq 0 ] || ([ "$1" == "-l" ] && [ -z "$2" ]); then
    echo "Usage:"
    echo "  Single Target: ./pd_scan.sh <ipv4> <domain.tld>"
    echo "  List From File: ./pd_scan.sh -l <input_file>"
    exit 1
fi

# --- Log Handling Functions ---
is_processed() {
    local log_file=$1
    local entry=$2
    [ -f "$log_file" ] && grep -qFx "$entry" "$log_file"
}

log_processed() {
    local log_file=$1
    local entry=$2
    echo "$entry" >> "$log_file"
}

# --- 1. Initial Setup: Prepare Input Task List ---
RAW_INPUT=""
if [ "$1" == "-l" ]; then
    INPUT_FILE=$2
    if [ ! -f "$INPUT_FILE" ]; then
        echo "Error: Input file not found: $INPUT_FILE"
        exit 1
    fi
    RAW_INPUT=$(cat "$INPUT_FILE")
else
    RAW_INPUT="$1 $2"
fi

# Sanitize the raw input into a clean, space-separated "ip domain" list.
CLEAN_INPUT=$(echo "$RAW_INPUT" | sed -e 's/[:[:space:]]\+/:/' -e 's/:/ /' -e 's/\.$//')

# Determine the IP range and root domain from the first valid line.
first_line=$(echo "$CLEAN_INPUT" | grep -E -o "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+ [^ ]+" | head -n 1)
if [ -z "$first_line" ]; then
    echo "No valid 'ip domain' pairs found in input. Exiting."
    exit 0
fi
first_ipv4=$(echo "$first_line" | cut -d' ' -f1)
first_domain=$(echo "$first_line" | cut -d' ' -f2)

# --- 2. Pre-Loop: Handle Root Domain Scan Preparation ---
ip_prefix=$(echo "$first_ipv4" | cut -d. -f1-2)
range_dir="$ip_prefix"
mkdir -p "$range_dir"
processing_log="${range_dir}/pd_processing.log"
touch "$processing_log"

root_domain=$(echo "$first_domain" | awk -F. 'NF>1{print $(NF-1) "." $NF; next} 1')
root_scan_log_marker="ROOT_SCAN_DONE | $root_domain"
TASK_LIST="$CLEAN_INPUT"

# Check if the root domain for this range has already been handled.
if ! is_processed "$processing_log" "$root_scan_log_marker"; then
    echo "--- Preparing one-time scan for root domain: $root_domain ---"
    root_ip=$(dig @"$DNS_RESOLVER" +short "$root_domain" | head -n1)

    if [[ $root_ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        # If IP is found, prepend the root domain as the first task.
        root_task="$root_ip $root_domain"
        TASK_LIST="$root_task\n$TASK_LIST"
        echo "Root domain resolved to $root_ip. Added to the top of the scan list."
    else
        # If no IP, log it to prevent future attempts.
        echo "Warning: Could not resolve IP for '$root_domain'. Logging to prevent retries."
        log_processed "$processing_log" "$root_scan_log_marker" # Log as done to prevent future digs
    fi
fi

# --- 3. Main Processing Loop (Simple Waterfall) ---
echo -e "$TASK_LIST" | while IFS= read -r line; do
    read -r ipv4 domain <<<"$line"

    # Skip any empty or malformed lines.
    if ! [[ $ipv4 =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || [ -z "$domain" ]; then
        continue
    fi

    log_entry="$ipv4 $domain"
    
    # Check log, skip if already processed.
    if is_processed "$processing_log" "$log_entry"; then
        echo "Skipping already processed target: $log_entry"
        continue
    fi

    # Set output directory using the standard, consistent structure.
    out_dir="${range_dir}/${domain}_${ipv4}"
    mkdir -p "$out_dir"
    
    cat <<EOF
=======================================================================
SCRIPT          : PD Multitool
DATE/TIME       : $(date '+%Y-%m-%d %H:%M:%S')
-----------------------------------------------------------------------
CONFIGURATION:
  IPv4          : $ipv4
  Domain        : $domain
  Port          : $PORT
  Output Dir    : $out_dir
=======================================================================
EOF

    # TLSX
    tdate=$(date '+%Y.%m.%d | %H:%M:%S')
    out_file="TLSX | ${tdate} | ${domain} | ${ipv4} | ${port}.json"

    tlsx -u $ipv4 -sni $domain -p $port -timeout 20 -cert -so -tv -ve -ce -ex -ss -mm -re -un -dns -j -o "${out_dir}/${out_file}"

    # Subfinder
    echo "subfinder $d"
    tdate=$(date '+%Y.%m.%d | %H:%M:%S')
    out_file="subfinder | ${tdate} | ${domain}.json"

    subfinder -d $domain -all -oJ -r 192.168.2.236,9.9.9.9,1.1.1.1 -o "${out_dir}/${out_file}"

    # urlfinder
    echo "urlfinder $d"
    tdate=$(date '+%Y.%m.%d | %H:%M:%S')
    out_file="urlfinder | ${tdate} | ${domain}.json"

    urlfinder -all -d $domain -cs -j -o "${out_dir}/${out_file}"

    # portscan
    port_range="1-20000"
    echo "Processing $i"
    tdate=$(date '+%Y.%m.%d | %H:%M:%S')
    out_file="smap | ${tdate} | ${ipv4} | ${port_range}.json"

    smap $ipv4 -oJ "${out_dir}/${out_file}"

    ports=( $(cat "$out_dir"/*.json | jq -r -s 'flatten | map([ .port? , (.ports[]? | .port?) ] | map(select(. != null))) | add | map(tostring) | unique | .[]') )
    ports_csv=$(IFS=,; echo "${ports[*]}")
    ports_csv=${ports_csv#,}    

    declare -A _seen
    unique_ports=()
    for p in "${ports[@]}"; do
        [[ -z ${_seen[$p]} ]] && _seen[$p]=1 && unique_ports+=("$p")
    done

    # 4) Replace the original array with the unique list
    ports=("${unique_ports[@]}")

    tdate=$(date '+%Y.%m.%d | %H:%M:%S')
    out_file="nmap | ${tdate} | ${ipv4} | top-ports-1000"
    [[ ${ports_csv} -ne "" ]] && nmap -e tun0 -Pn --min-rate 10000 --max-retries 2 -sV -p ${ports_csv} -sC -oA "${out_dir}/${out_file}" ${ipv4}

    # fingerprintx
    for port in "${ports[@]}"; do
        echo "Processing ${ipv4}:${port}"
        tdate=$(date '+%Y.%m.%d | %H:%M:%S')

        # ---------- fingerprintx ----------
        out_file="fingerprintx | ${tdate} | ${ipv4} | ${port}.json"
        fingerprintx -t "${ipv4}:${port}" --json -o "${out_dir}/${out_file}"
        
        # httpx
        tdate=$(date '+%Y.%m.%d | %H:%M:%S')
        out_file="httpx | ${tdate} | ${ipv4} | ${port}.json"

        httpx -u "${ipv4}:${port}" -sc -cl -ct -location -hash sha1 -jarm -rt -lc -wc -title -bp -j -server -td -method -websocket -ip -cname -extract-fqdn -asn -cdn -probe -pa -irr -include-chain -fr -x all -tlsi -o "${out_dir}/${out_file}"
    done

    ### Domain:Port
    for port in "${ports[@]}"; do
        echo "Processing ${domain}:${port}"
        tdate=$(date '+%Y.%m.%d | %H:%M:%S')

        # ---------- fingerprintx ----------
        out_file="fingerprintx | ${tdate} | ${domain} | ${port}.json"
        fingerprintx -t "${domain}:${port}" --json -o "${out_dir}/${out_file}"

        # httpx
        tdate=$(date '+%Y.%m.%d | %H:%M:%S')
        out_file="httpx | ${tdate} | ${domain} | ${port}.json"

        httpx -u "${domain}:${port}" -sc -cl -ct -location -hash sha1 -jarm -rt -lc -wc -title -bp -j -server -td -method -websocket -ip -cname -extract-fqdn -asn -cdn -probe -pa -irr -include-chain -fr -x all -tlsi -o "${out_dir}/${out_file}"
    done

    # katana
    httpx_files=("$out_dir"/httpx*)
    fingerprintx_files=("$out_dir"/fingerprintx*)

    # Test if either array contains at least one element
    if [[ -e $out_dir/httpx* || -e $out_dir/fingerprintx* ]]; 
    then
        echo "🔍 Found httpx results - running katana"
        
        tdate=$(date '+%Y.%m.%d | %H:%M:%S')
        out_file="katana | ${tdate} | ${domain}.json"

        katana -ct 180 -kf all -rl 8 -duc -d 2 -td -xhr -aff -tlsi -fx -jc -j -u "${domain}" -o "${out_dir}/${out_file}"
    fi

    # VirusTotal API IPV4
    VT_API_KEY=""
    VT_API_URL="https://www.virustotal.com/api/v3/ip_addresses/${ipv4}"
    VT_HEADERS="x-apikey: ${VT_API_KEY}"

    tdate=$(date '+%Y.%m.%d | %H:%M:%S')
    out_file="VirusTotal | ${tdate} | ${ipv4}.json"
    json_header="Accept: application/json"

    curl -X GET -s "$VT_API_URL" --header "$VT_HEADERS" --header "$json_header" -o "${out_dir}/${out_file}"

    # AbuseIPDB
    ABUSEIPDB_API_KEY=""
    ABUSEIPDB_API_URL="https://api.abuseipdb.com/api/v2/check?ipAddress=${ipv4}&maxAgeInDays=90"
    ABUSEIPDB_HEADERS="Key: ${ABUSEIPDB_API_KEY}"

    tdate=$(date '+%Y.%m.%d | %H:%M:%S')
    out_file="AbuseIPDB | ${tdate} | ${ipv4}.json"

    curl -X GET -s "$ABUSEIPDB_API_URL" --header "$ABUSEIPDB_HEADERS" --header "$json_header" -o "${out_dir}/${out_file}"


    # --- DB Import ---
    source bin/activate
    ./db_import.py "${out_dir}"
   
    # --- Log Completion ---
    log_processed "$processing_log" "$log_entry"
    echo "--- Finished and logged: $log_entry"

    # If we just finished the root domain, add the one-time marker to the log.
    if [ "$domain" == "$root_domain" ]; then
        log_processed "$processing_log" "$root_scan_log_marker"
    fi
    echo ""
done

echo "All tasks completed."

# DB Import
source bin/activate
./db_import.py "${out_dir}"