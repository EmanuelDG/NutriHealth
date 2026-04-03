import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import joblib

# Load 
df = pd.read_csv('../DATA/health_data_labeled.csv')

# Select target and features
features = ['age', 'BMI_final', 'DR1TKCAL', 'DR1TSUGR', 'PAD680', 'genetic_risk']

# Ensure rows with missing values are removed.
df = df.dropna(subset=features + ['health_status'])

# Map the categorical health_status to numeric labels.
target_map = {'Healthy': 0, 'At Risk': 1, 'Unhealthy': 2}
df['health_status_num'] = df['health_status'].map(target_map)

# Define feature matrix X and target vector y.
X = df[features]
y = df['health_status_num']

# Split the data into training (80%) and testing (20%) sets.
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Initialize the Random Forest classifier and train model
clf = RandomForestClassifier(random_state=42)
clf.fit(X_train, y_train)

# Predict on the test set
y_pred = clf.predict(X_test)

# Print results
print("Accuracy:", accuracy_score(y_test, y_pred))
print("Classification Report:")
print(classification_report(y_test, y_pred))

# Save model
joblib.dump(clf, '../DATA/random_forest_model.pkl')
print("Random Forest model saved to ../DATA/random_forest_model.pkl")
