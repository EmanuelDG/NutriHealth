# NutriHealth

BSc thesis project — a full-stack adaptive health and nutrition tracking application with AI-powered dietary recommendations.

## Overview

The app helps users track their daily food intake, water consumption, and exercise, then provides personalised dietary recommendations using a Random Forest model trained on the [NHANES](https://www.cdc.gov/nchs/nhanes/index.htm) dataset alongside DeepSeek AI for contextual insights.

## Tech Stack

**Backend**
- Python, FastAPI, SQLAlchemy, Alembic
- PostgreSQL
- JWT authentication
- scikit-learn (Random Forest classifier)

**Frontend**
- React 18, React Router v6
- Tailwind CSS, shadcn/ui, Recharts
- Zod + React Hook Form

**ML Pipeline**
- NHANES dataset (demographics, dietary recall, physical activity, body measurements)
- Random Forest classifier with hyperparameter tuning
- Stepwise pipeline: data loading → merging → cleaning → feature engineering → labelling → training → inference API

## Features

- User registration and JWT-based authentication
- Meal logging with nutritional breakdown (via OpenFoodFacts API)
- Water intake and exercise tracking
- Health metrics dashboard with charts
- ML-driven dietary recommendations
- Future health insights powered by DeepSeek AI

## Project Structure

```
├── backend/
│   ├── auth/           # JWT utilities and middleware
│   ├── database/       # SQLAlchemy models and connection
│   ├── migrations/     # Alembic migration scripts
│   ├── ml/             # Model loader and inference
│   ├── routes/         # API route handlers
│   ├── schemas/        # Pydantic request/response schemas
│   ├── tests/          # Test suite
│   └── main.py
├── frontend/
│   └── src/            # React application
└── NHANES_Model/
    ├── Train/          # Step-by-step training scripts
    ├── DATA/           # Processed data and trained model (.pkl)
    └── Results/        # Evaluation metrics and charts
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL

### Backend

```bash
cd backend
pip install -r requirements.txt
cp ../.env.example ../.env   # fill in your values
python Setup_Database.py
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm start
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret |
| `DEEPSEEK_API_KEY` | DeepSeek API key for AI insights |

### Retrain the ML Model (optional)

```bash
cd NHANES_Model/Train
python 01_load_data.py
python 02_merge_data.py
python 03_clean_data.py
python 04_engineer_features.py
python 05_label_data.py
python 06_train_model.py
```

## Author

Emanuel Demelash Gizachew — BSc thesis, 2025

