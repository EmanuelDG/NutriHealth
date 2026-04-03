import pandas as pd
import xport
import xport.v56 as x56

x56.TEXT_METADATA_ENCODING = 'cp1252'

def load_xpt(filepath):
    with open(filepath, 'rb') as f:
        return xport.to_dataframe(f)

# Load the five datasets 
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

# Print the shape of the merged DataFrame to confirm successful merge
print("Merged dataset shape:", merged_df.shape)

print(merged_df.head())
