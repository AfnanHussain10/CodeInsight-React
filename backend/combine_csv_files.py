import csv
import os

def combine_csv_files(output_file):
    # List of CSV files to combine
    csv_files = [
        'synthetic_rlhf_data_bad_examples_part3.csv',
        'synthetic_rlhf_data_bad_examples_part2.csv',
        'rlhf_preprocessed.csv',
        'synthetic_rlhf_data_part3.csv',
        'synthetic_rlhf_data_part2.csv',
        'synthetic_rlhf_data.csv',
        'synthetic_rlhf_data_bad_examples.csv'
    ]
    
    # Set to track unique rows
    unique_rows = set()
    # List to store rows in order of appearance
    all_rows = []
    # Track headers
    headers = None
    
    # Read each CSV file
    for file in csv_files:
        try:
            # Check if file exists
            if os.path.exists(file):
                print(f"Reading {file}...")
                with open(file, 'r', encoding='utf-8') as f:
                    reader = csv.reader(f)
                    # Get headers from first file
                    if headers is None:
                        headers = next(reader)
                    else:
                        # Skip header row for subsequent files
                        next(reader)
                    
                    # Process each row
                    for row in reader:
                        # Convert row to tuple for hashing (to add to set)
                        row_tuple = tuple(row)
                        # Only add unique rows
                        if row_tuple not in unique_rows:
                            unique_rows.add(row_tuple)
                            all_rows.append(row)
            else:
                print(f"Warning: File {file} not found.")
        except Exception as e:
            print(f"Error reading {file}: {e}")
    
    # Write combined data to output file
    if headers and all_rows:
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(all_rows)
        
        print(f"\nCombined CSV files successfully!")
        print(f"Total unique rows: {len(all_rows)}")
        print(f"Output saved to {output_file}")
    else:
        print("No data to combine. Check if the CSV files exist.")

if __name__ == "__main__":
    output_file = "combined_rlhf_data.csv"
    combine_csv_files(output_file)