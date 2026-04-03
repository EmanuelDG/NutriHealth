import pandas as pd
import xport
import xport.v56 as x56

x56.TEXT_METADATA_ENCODING = 'cp1252'

# Load the data

with open('../DATA/DEMO_L.xpt', 'rb') as f:
    demo_df = xport.to_dataframe(f)

with open('../DATA/DR1TOT_L.xpt', 'rb') as f:
    dr1tot_df = xport.to_dataframe(f)

with open('../DATA/BMX_L.xpt', 'rb') as f:
    bmx_df = xport.to_dataframe(f)

with open('../DATA/MCQ_L.xpt', 'rb') as f:
    mcq_df = xport.to_dataframe(f)

with open('../DATA/PAQ_L.xpt', 'rb') as f:
    paq_df = xport.to_dataframe(f)

# Print the shapes to confirm successful loading
print("DEMO_L shape:", demo_df.shape)
print("DR1TOT_L shape:", dr1tot_df.shape)
print("BMX_L shape:", bmx_df.shape)
print("MCQ_L shape:", mcq_df.shape)
print("PAQ_L shape:", paq_df.shape)
