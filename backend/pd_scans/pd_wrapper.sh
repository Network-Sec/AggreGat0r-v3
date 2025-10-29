#!/bin/bash
# New wrapper-style script replacing pd_scans. Essentially does the same by 
# looping over input and calling pd_scan.sh for each item. This should 
# provide a more robust design. 

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <file>" >&2
  exit 1
fi

INPUT_FILE="$1"

if [[ ! -r "$INPUT_FILE" ]]; then
  echo "Error: File '$INPUT_FILE' does not exist or is not readable." >&2
  exit 1
fi

out_dir="${INPUT_FILE}_pdscans"
[[ ! -d "$out_dir" ]] && mkdir -p $out_dir

log_file="${out_dir}/processing.log"
[[ ! -f "$log_file" ]] && touch $log_file

is_ipv4() {
  local ip="$1"
  [[ ! $ip =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] && return 1
  IFS=. read -r a b c d <<<"$ip"
  [[ $a -gt 255 || $b -gt 255 || $c -gt 255 || $d -gt 255 ]] && return 1
  return 0
}

is_ipv6() {
  local ip="$1"
  [[ $ip =~ ^([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$ ]]
}

echo "[ ☠️ ] Loop Start"
# Loop over input (shuffeled)
IFS=$'\n'; for line in $(cat "$INPUT_FILE" | shuf); do
    echo "[...] Input Line: $line"
    if grep -Fxq "$line" "$log_file"; then
        echo "[ ! ] Already processed ...skipping!"
        continue
    fi

    # Append the new line to the log
    echo "$line" >> "$log_file"

    # split on the last ':'
    ipv4=${line%%:*}
    domain=${line##*:}
    

    if [[ -z $domain || -z $ipv4 || ${#domain} -le 4 ]]; then 
        echo "[ - ] Domain invalid" 
        echo "[ - ] Input Domain: $domain"
        continue
    fi
    if ! (is_ipv4 "$ipv4" || is_ipv6 "$ipv4"); then
        echo "[ X ] IP invalid"
        echo "[ - ] Input IP: $ipv4"
        continue 
    fi

    echo "[ + ] Found valid pair: $ipv4 $domain"
    echo "[ S ] Launching scan, output dir: $out_dir"
    ./pd_scan.sh "${ipv4}" "${domain}" "${out_dir}"

done
