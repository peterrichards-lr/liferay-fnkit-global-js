#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys

# --- Ensure Python 3.6+ is being used BEFORE importing Python 3-only features ---
if sys.version_info < (3, 6):
    sys.stderr.write("❌ This script requires Python 3.6 or higher.\n")
    sys.exit(1)

import json

def load_json(file_path):
    with open(file_path, 'r') as f:
        return json.load(f)

def replace_ids(data, mappings):
    # Create lookup map: filename -> id
    lookup = {entry['fileName']: entry['id'] for entry in mappings}

    # Replace IDs where applicable
    for record in data:
        image = record.get("image")
        if image and image.get("fileName") in lookup:
            image["id"] = lookup[image["fileName"]]
    return data

def main():
    if len(sys.argv) != 4:
        print("Usage: python3 replace_ids.py data.json mapping.json output.json")
        sys.exit(1)

    input_data_file = sys.argv[1]
    mapping_file = sys.argv[2]
    output_file = sys.argv[3]

    data = load_json(input_data_file)
    mappings = load_json(mapping_file)
    updated_data = replace_ids(data, mappings)

    with open(output_file, 'w') as f:
        json.dump(updated_data, f, indent=2)

    print("✅ Updated JSON written to {}".format(output_file))

if __name__ == "__main__":
    main()
