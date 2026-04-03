import pandas as pd

# Load the merged and cleaned dataset
df = pd.read_csv('../DATA/merged_cleaned.csv')

# Calculate BMI using weight (kg) and height (cm)
df['BMI_calc'] = df['weight'] / ((df['height'] / 100) ** 2)

if 'BMXBMI' in df.columns:
    df['BMI_final'] = df['BMXBMI']
else:
    df['BMI_final'] = df['BMI_calc']


def compute_genetic_risk(row):
    if row.get('MCQ010', 0) == 1 or row.get('MCQ050', 0) == 1:
        return 1
    return 0

df['genetic_risk'] = df.apply(compute_genetic_risk, axis=1)

# Save
output_filepath = '../DATA/merged_features.csv'
df.to_csv(output_filepath, index=False)
print("Engineered features saved to", output_filepath)
