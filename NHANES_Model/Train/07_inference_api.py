from fastapi import FastAPI
import joblib
import pandas as pd
from pydantic import BaseModel

app = FastAPI()

# Load model
model = joblib.load('../DATA/random_forest_model.pkl')

# Define expected input structure
class PredictionInput(BaseModel):
    age: float
    BMI_final: float
    DR1TKCAL: float
    DR1TSUGR: float
    PAD680: float
    genetic_risk: int

# Map back to descriptive labels
target_map = {0: 'Healthy', 1: 'At Risk', 2: 'Unhealthy'}

@app.post("/predict")
def predict_health(data: PredictionInput):
    input_df = pd.DataFrame([data.dict()])
    pred = model.predict(input_df)
    return {"health_status": target_map[int(pred[0])]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
