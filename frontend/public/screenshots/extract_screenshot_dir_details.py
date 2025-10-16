#!/usr/bin/env python3
"""
extract_screenshot_dir_details.py

Scans a directory for image files whose names contain an IP or a domain,
extracts that host and its port, looks the host up in a lookup file
(“IP: domain.” format), and writes a sorted list of “IP: domain.” pairs
to the output file.

Usage:
    python3 extract_screenshot_dir_details.py -d <dir> -l <lookup.txt> -o <output.txt>
"""

import argparse
import re
import sys
from pathlib import Path
from typing import Dict, Set, Tuple, List


# --------------------------------------------------------------------- #
# Helpers – parsing the lookup file
# --------------------------------------------------------------------- #
def parse_lookup_file(lookup_path: Path) -> Tuple[Dict[str, str], Dict[str, str]]:
    ip_to_domain: Dict[str, str] = {}
    domain_to_ip: Dict[str, str] = {}

    for line in lookup_path.read_text().splitlines():
        line = line.strip()
        if not line or ':' not in line:
            continue
        ip, domain = line.split(':', 1)
        ip = ip.strip()
        domain = domain.strip().rstrip('.')   # drop trailing period
        ip_to_domain[ip] = domain
        domain_to_ip[domain] = ip

    return ip_to_domain, domain_to_ip


# --------------------------------------------------------------------- #
# Helpers – extracting host & port from a file name
# --------------------------------------------------------------------- #
def extract_host_and_port(filename: str) -> Tuple[str, str]:
    """
    From a filename such as '192.2.33.27_ip_8443_landscape.png' or
    'www.gingersend.com._domain_443_fullpage.png' returns (host, port).

    The port is the number after the "_ip_" or "._domain_" marker.
    """
    if "_ip_" in filename:
        host, rest = filename.split("_ip_", 1)
    elif "._domain_" in filename:
        host, rest = filename.split("._domain_", 1)
    else:
        raise ValueError(f"Unexpected filename format: {filename}")

    port = rest.split('_', 1)[0]
    return host, port


def is_ip_address(host: str) -> bool:
    return bool(re.fullmatch(r'(?:\d{1,3}\.){3}\d{1,3}', host))


# --------------------------------------------------------------------- #
# Main logic – collect the pairs
# --------------------------------------------------------------------- #
def collect_ip_domain_pairs(
    image_dir: Path,
    ip_to_domain: Dict[str, str],
    domain_to_ip: Dict[str, str]
) -> Set[Tuple[str, str]]:
    pairs: Set[Tuple[str, str]] = set()

    for entry in image_dir.iterdir():
        # 1) Show the file we see
        print(f"[SCAN] {entry.name}")

        if not entry.is_file() or entry.suffix.lower() not in {'.jpg', '.jpeg', '.png'}:
            print("     -> skipped (not a supported image file)\n")
            continue

        # 2) Extract host & port
        try:
            host, port = extract_host_and_port(entry.name)
        except ValueError as exc:
            print(f"     -> skipping: {exc}\n")
            continue

        print(f"     host = {host}, port = {port}")

        # 3) Lookup the host
        if is_ip_address(host):
            ip = host
            domain = ip_to_domain.get(ip)
            if domain:
                print(f"     lookup: IP -> {domain}\n")
                pairs.add((ip, domain))
            else:
                print(f"     lookup: IP {ip} not found in lookup file\n")
        else:
            domain = host
            ip = domain_to_ip.get(domain)
            if ip:
                print(f"     lookup: domain -> {ip}\n")
                pairs.add((ip, domain))
            else:
                print(f"     lookup: domain {domain} not found in lookup file\n")

    return pairs


# --------------------------------------------------------------------- #
# Sorting helper
# --------------------------------------------------------------------- #
def ip_to_tuple(ip: str) -> Tuple[int, ...]:
    return tuple(int(part) for part in ip.split('.'))


# --------------------------------------------------------------------- #
# CLI entry point
# --------------------------------------------------------------------- #
def main() -> None:
    parser = argparse.ArgumentParser(description="Extract IP/domain pairs from image files.")
    parser.add_argument('-d', '--dir', required=True, help='Directory containing the image files')
    parser.add_argument('-l', '--lookup', required=True, help='Lookup file (IP: domain.)')
    parser.add_argument('-o', '--output', required=True, help='Output file')
    args = parser.parse_args()

    image_dir = Path(args.dir)
    if not image_dir.is_dir():
        print(f"Error: {image_dir} is not a directory.", file=sys.stderr)
        sys.exit(1)

    lookup_path = Path(args.lookup)
    if not lookup_path.is_file():
        print(f"Error: lookup file {lookup_path} does not exist.", file=sys.stderr)
        sys.exit(1)

    ip_to_domain, domain_to_ip = parse_lookup_file(lookup_path)
    print(f"\nLookup file parsed – {len(ip_to_domain)} IP → domain mappings found.\n")

    pairs = collect_ip_domain_pairs(image_dir, ip_to_domain, domain_to_ip)

    sorted_pairs: List[Tuple[str, str]] = sorted(pairs, key=lambda p: ip_to_tuple(p[0]))

    out_lines = [f"{ip}: {domain}." for ip, domain in sorted_pairs]
    Path(args.output).write_text('\n'.join(out_lines) + '\n')
    print(f"\nWrote {len(sorted_pairs)} unique IP/domain pairs to {args.output}")


if __name__ == "__main__":
    main()
