#!/bin/bash

echo "Usage: ./pd_scan.sh 192.168.168.1 xyz.example.org. out_dir"
ipv4=$1
domain=$(echo "$2" | sed -e 's/ *$//' | sed 's/\.$//')
out_parent=$3

port="443"  # keep fixed for now

root_domain=$(echo $domain | awk -F. 'NF>1{print $(NF-1) "." $NF; next} 1')
out_dir="${out_parent}/${domain}_${ipv4}"
[[ ! -d "$out_dir" ]] && mkdir -p $out_dir

cat <<EOF
=======================================================================
SCRIPT          : PD Multitool
DATE/TIME       : $(date '+%Y-%m-%d %H:%M:%S')
-----------------------------------------------------------------------
CONFIGURATION:
  IPv4          : $ipv4
  Domain        : $domain
  Root Domain   : $root_domain
  Port          : $port
  Output Dir    : $out_dir
=======================================================================
EOF

### Note that shodan results from uncover and shodan cli currently are NOT added to the DB ###
# Uncover - currently just testing
export SHODAN_API_KEY=...ENTER YOUR API KEY...
tdate=$(date '+%Y.%m.%d | %H:%M:%S')
out_file="uncover | ${tdate} | ${domain}.json"
uncover -j -s $domain -o "${out_dir}/${out_file}"

tdate=$(date '+%Y.%m.%d | %H:%M:%S')
out_file="uncover | ${tdate} | ${ipv4}.json"
uncover -j -s $ipv4 -o "${out_dir}/${out_file}"

# Classic Shodan - currently just testing
tdate=$(date '+%Y.%m.%d | %H:%M:%S')
out_file="shodan | ${tdate} | ${domain}.json"
shodan domain $domain | tee "${out_dir}/${out_file}"

tdate=$(date '+%Y.%m.%d | %H:%M:%S')
out_file="shodan | ${tdate} | ${ipv4}.json"
shodan host $ipv4 | tee "${out_dir}/${out_file}"

# TLSX sometimes hangs
tdate=$(date '+%Y.%m.%d | %H:%M:%S')
out_file="TLSX | ${tdate} | ${domain} | ${ipv4} | ${port}.json"

timeout 60 tlsx -u $ipv4 -sni $domain -p $port -timeout 20 -cert -so -tv -ve -ce -ex -ss -mm -re -un -dns -j -o "${out_dir}/${out_file}"

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
echo "Processing $ipv4"
tdate=$(date '+%Y.%m.%d | %H:%M:%S')
out_file="smap | ${tdate} | ${ipv4} | ${port_range}.json"

smap $ipv4 -oJ "${out_dir}/${out_file}"

ports=( $(cat "$out_dir"/*.json | jq -r -s 'flatten | map([ .port? , (.ports[]? | .port?) ] | map(select(. != null))) | add | map(tostring) | unique | .[]' 2>/dev/null || true) )
ports_csv=$(IFS=,; echo "${ports[*]}")
ports_csv=${ports_csv#,}    

declare -A _seen
unique_ports=()
for p in "${ports[@]}"; do
    [[ -z ${_seen[$p]} ]] && _seen[$p]=1 && unique_ports+=("$p")
done

# Replace the original array with the unique list
ports=("${unique_ports[@]}")

tdate=$(date '+%Y.%m.%d | %H:%M:%S')
out_file="nmap | ${tdate} | ${ipv4} | top-ports-1000"
[[ ${ports_csv} -ne "" ]] && nmap -e tun0 -Pn --min-rate 10000 --max-retries 2 -sV -p ${ports_csv} -sC -oA "${out_dir}/${out_file}" ${ipv4}

### IP:Port
for port in "${ports[@]}"; do
    echo "Processing ${ipv4}:${port}"
    tdate=$(date '+%Y.%m.%d | %H:%M:%S')

    # ---------- fingerprintx ----------
    out_file="fingerprintx | ${tdate} | ${ipv4} | ${port}.json"
    fingerprintx -t "${ipv4}:${port}" --json -o "${out_dir}/${out_file}"
    
    # httpx
    tdate=$(date '+%Y.%m.%d | %H:%M:%S')
    out_file="httpx | ${tdate} | ${ipv4} | ${port}.json"

    httpx -u "${ipv4}:${port}" -sc -cl -ct -location -hash sha1 -jarm -rt -lc -wc -title -bp -j -server -td -method -websocket -ip -cname -asn -cdn -probe -pa -irr -include-chain -fr -x all -tlsi -o "${out_dir}/${out_file}"
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

    httpx -u "${domain}:${port}" -sc -cl -ct -location -hash sha1 -jarm -rt -lc -wc -title -bp -j -server -td -method -websocket -ip -cname -asn -cdn -probe -pa -irr -include-chain -fr -x all -tlsi -o "${out_dir}/${out_file}"
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
VT_API_KEY="...ENTER YOUR API KEY..."
VT_API_URL="https://www.virustotal.com/api/v3/ip_addresses/${ipv4}"
VT_HEADERS="x-apikey: ${VT_API_KEY}"

tdate=$(date '+%Y.%m.%d | %H:%M:%S')
out_file="VirusTotal | ${tdate} | ${ipv4}.json"
json_header="Accept: application/json"

curl -X GET -s "$VT_API_URL" --header "$VT_HEADERS" --header "$json_header" -o "${out_dir}/${out_file}"

# AbuseIPDB
ABUSEIPDB_API_KEY="...ENTER YOUR API KEY..."
ABUSEIPDB_API_URL="https://api.abuseipdb.com/api/v2/check?ipAddress=${ipv4}&maxAgeInDays=90"
ABUSEIPDB_HEADERS="Key: ${ABUSEIPDB_API_KEY}"

tdate=$(date '+%Y.%m.%d | %H:%M:%S')
out_file="AbuseIPDB | ${tdate} | ${ipv4}.json"

curl -X GET -s "$ABUSEIPDB_API_URL" --header "$ABUSEIPDB_HEADERS" --header "$json_header" -o "${out_dir}/${out_file}"

# --- DB Import ---
source bin/activate
./db_import.py "${out_dir}"
