import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib
import matplotlib.pyplot as plt
import seaborn as sns
from time import time
import os

print("Starting model training with hyperparameter tuning...")

# Create a directory
if not os.path.exists('../Results'):
    os.makedirs('../Results')

# Load dataset
df = pd.read_csv('../DATA/health_data_labeled.csv')
print(f"Loaded dataset with {df.shape[0]} rows and {df.shape[1]} columns")

# Select features and target
features = ['age', 'BMI_final', 'DR1TKCAL', 'DR1TSUGR', 'PAD680', 'genetic_risk']

# Ensure rows with missing values are removed
df = df.dropna(subset=features + ['health_status'])
print(f"After removing missing values: {df.shape[0]} rows")

# Map to numeric labels
target_map = {'Healthy': 0, 'At Risk': 1, 'Unhealthy': 2}
df['health_status_num'] = df['health_status'].map(target_map)

# Print class distribution
class_counts = df['health_status'].value_counts()
print("\nClass distribution:")
for cls, count in class_counts.items():
    print(f"{cls}: {count} ({count/len(df)*100:.1f}%)")

# Define feature matrix and target vector
X = df[features]
y = df['health_status_num']

# Split the data into training (80%) and testing (20%) sets.
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
print(f"\nTraining set: {X_train.shape[0]} samples")
print(f"Testing set: {X_test.shape[0]} samples")

# Initialize the base Random Forest classifier
base_clf = RandomForestClassifier(random_state=42)

# For a quicker run using a smaller grid
param_grid = {
    'n_estimators': [100, 200],
    'max_depth': [None, 20],
    'min_samples_split': [2, 5],
    'max_features': ['sqrt', None]
}

print("\nStarting Grid Search...")
print(f"Parameter grid: {param_grid}")
print("This may take some time...")

# Start timing
start_time = time()

# Setup GridSearchCV
grid_search = GridSearchCV(
    estimator=base_clf,
    param_grid=param_grid,
    cv=5,  # 5-fold cross-validation
    n_jobs=-1,  
    scoring='accuracy',
    verbose=1,
    return_train_score=True
)

# Run grid search
grid_search.fit(X_train, y_train)

# End timing
end_time = time()
print(f"\nGrid search completed in {(end_time - start_time)/60:.2f} minutes")

# Best parameters and score
print("\nBest parameters found:")
print(grid_search.best_params_)
print(f"Best cross-validation accuracy: {grid_search.best_score_:.4f}")

# Train the best model on the full training set
best_clf = grid_search.best_estimator_

# Predict on the test set
y_pred = best_clf.predict(X_test)

# Evaluate 
accuracy = accuracy_score(y_test, y_pred)
print(f"\nTest set accuracy: {accuracy:.4f}")
print("\nClassification Report:")
cls_report = classification_report(y_test, y_pred, target_names=['Healthy', 'At Risk', 'Unhealthy'], output_dict=True)
print(classification_report(y_test, y_pred, target_names=['Healthy', 'At Risk', 'Unhealthy']))

# Save the classification report
cls_report_df = pd.DataFrame(cls_report).transpose()
cls_report_df.to_csv('../Results/classification_report.csv')

# Confusion Matrix
conf_matrix = confusion_matrix(y_test, y_pred)
plt.figure(figsize=(8, 6))
sns.heatmap(conf_matrix, annot=True, fmt='d', cmap='Blues',
            xticklabels=['Healthy', 'At Risk', 'Unhealthy'],
            yticklabels=['Healthy', 'At Risk', 'Unhealthy'])
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title('Confusion Matrix')
plt.savefig('../Results/confusion_matrix.png')

# Feature Importance
feature_importance = pd.DataFrame(
    {'feature': features, 'importance': best_clf.feature_importances_}
).sort_values('importance', ascending=False)

plt.figure(figsize=(10, 6))
sns.barplot(x='importance', y='feature', data=feature_importance)
plt.title('Feature Importance')
plt.tight_layout()
plt.savefig('../Results/feature_importance.png')

# Compare with default model
default_clf = RandomForestClassifier(random_state=42)
default_clf.fit(X_train, y_train)
default_y_pred = default_clf.predict(X_test)
default_accuracy = accuracy_score(y_test, default_y_pred)

print("\nModel Performance Comparison:")
print(f"Default model accuracy: {default_accuracy:.4f}")
print(f"Tuned model accuracy: {accuracy:.4f}")
print(f"Improvement: {(accuracy - default_accuracy)*100:.2f}%")

# Save CV results
cv_results = pd.DataFrame(grid_search.cv_results_)
cv_results.to_csv('../Results/grid_search_results.csv')

# Save the best model to a file
best_model_path = '../DATA/random_forest_model_tuned.pkl'
joblib.dump(best_clf, best_model_path)
print(f"\nBest model saved to {best_model_path}")

