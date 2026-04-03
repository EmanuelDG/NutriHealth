import pandas as pd
import xport
import xport.v56 as x56

x56.TEXT_METADATA_ENCODING = 'cp1252'

# Load the data
def load_xpt(filepath):
    with open(filepath, 'rb') as f:
        return xport.to_dataframe(f)

demo_df   = load_xpt('../DATA/DEMO_L.xpt')
dr1tot_df = load_xpt('../DATA/DR1TOT_L.xpt')
bmx_df    = load_xpt('../DATA/BMX_L.xpt')
mcq_df    = load_xpt('../DATA/MCQ_L.xpt')
paq_df    = load_xpt('../DATA/PAQ_L.xpt')

# Merge the datasets on the unique identifier SEQN using inner joins
merged_df = demo_df.merge(dr1tot_df, on='SEQN', how='inner') \
                   .merge(bmx_df, on='SEQN', how='inner') \
                   .merge(mcq_df, on='SEQN', how='inner') \
                   .merge(paq_df, on='SEQN', how='inner')


# Rename for clarity.
merged_df.rename(columns={
    'RIDAGEYR': 'age',    # Age in years (from DEMO_L)
    'BMXWT': 'weight',     # Weight in kg (from BMX_L)
    'BMXHT': 'height',     # Height in cm (from BMX_L)
    'RIAGENDR': 'gender'   # Gender (from DEMO_L)
}, inplace=True)

# Convert to numeric types
merged_df['age'] = pd.to_numeric(merged_df['age'], errors='coerce')
merged_df['weight'] = pd.to_numeric(merged_df['weight'], errors='coerce')
merged_df['height'] = pd.to_numeric(merged_df['height'], errors='coerce')

# Drop rows missing critical information
merged_df.dropna(subset=['age', 'weight', 'height'], inplace=True)

# Print a preview of the cleaned DataFrame
print("Cleaned dataset head:")
print(merged_df[['SEQN', 'age', 'weight', 'height', 'gender']].head())

# Save
output_filepath = '../DATA/merged_cleaned.csv'
merged_df.to_csv(output_filepath, index=False)
print(f"Cleaned data saved to {output_filepath}")
