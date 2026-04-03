import pandas as pd

# Load the dataset with engineered features
df = pd.read_csv('../DATA/merged_features.csv')   

def classify_health(row):
    risk = 0
    
    # BMI risk using BMI_final
    bmi = row['BMI_final']
    if bmi < 18.5:
        risk += 1
    elif 18.5 <= bmi < 25:
        risk += 0
    elif 25 <= bmi < 30:
        risk += 1
    else:  # bmi >= 30
        risk += 2

    # Calorie intake risk using DR1TKCAL
    if pd.notnull(row.get('DR1TKCAL')):
        if row['gender'] == 1:  # male
            if row['DR1TKCAL'] > 3000:
                risk += 1
        elif row['gender'] == 2:  # female
            if row['DR1TKCAL'] > 2500:
                risk += 1

    # Sugar intake risk using DR1TSUGR
    if pd.notnull(row.get('DR1TSUGR')):
        if row['gender'] == 1:  # male threshold ~36g/day
            if row['DR1TSUGR'] > 36:
                risk += 1
        elif row['gender'] == 2:  # female threshold ~25g/day
            if row['DR1TSUGR'] > 25:
                risk += 1

    # Physical activity risk using PAD680 
    if pd.notnull(row.get('PAD680')):
        if row['PAD680'] < 30:
            risk += 1

    # Genetic risk flag 
    if row.get('genetic_risk', 0) == 1:
        risk += 1

    # Final classification based on cumulative risk score
    if risk <= 1:
        return 'Healthy'
    elif risk <= 3:
        return 'At Risk'
    else:
        return 'Unhealthy'

# Apply the classification function row-wise
df['health_status'] = df.apply(classify_health, axis=1)

# Preview 
print("Classification preview:")
print(df[['SEQN', 'BMI_final', 'DR1TKCAL', 'DR1TSUGR', 'PAD680', 'genetic_risk', 'health_status']].head())

# Save 
output_filepath = '../DATA/health_data_labeled.csv'
df.to_csv(output_filepath, index=False)
print("Labeled data saved to", output_filepath)
