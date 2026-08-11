# AgroPredict — Continuous Learning & Model Retraining Architecture

This document describes the dataset growth pipeline and model retraining feedback loop implemented in **AgroPredict**.

---

## 1. Overview

AgroPredict implements a closed-loop precision agriculture system where initial crop recommendations are continuously refined over time through **Farmer Post-Harvest Feedback**.

```
[ Farm Analysis ] ──> [ Soil Tier (100%/90%/75%) ] ──> [ Yield & Profit Prediction ]
         │                                                      │
         ▼                                                      ▼
[ Actual Harvest ] <── [ Farmer Submits Yield & Revenue ] <── [ Saved Plot Bookmark ]
         │
         ▼
[ HarvestFeedback Collection ] ──> [ Feature Pipeline ] ──> [ Periodic ML Retraining ]
```

---

## 2. Soil Confidence Tiers & Feedback Weighting

When a farmer submits post-harvest actual yield data (`actualYield` in tons/acre and `actualProfit` in INR), the record is stored alongside the original input confidence tier:

| Tier | Source Method | Initial Confidence | Retraining Weight |
|---|---|---|---|
| **Tier 1** | Lab Soil Test Report (OCR Upload) | **100%** | **1.0 (Full Weight)** |
| **Tier 2** | Direct Farmer Manual NPK/pH Entry | **90%** | **0.9 Weight** |
| **Tier 3** | Government Regional Soil Database | **75% / 60%** | **0.75 Weight** |

Higher confidence lab records are given higher sample weight during model loss evaluation.

---

## 3. Retraining Execution Protocol

### Data Storage & Export
Post-harvest feedback submissions are recorded in MongoDB via the `/api/history/feedback` endpoint and stored in the `HarvestFeedback` collection. Each entry contains:
- `crop`: Target crop
- `soilInputTier`: Tier used during original recommendation
- `predictedYield`: Model predicted yield (tons/acre)
- `actualYield`: Actual harvested yield (tons/acre)
- `yieldDelta`: `actualYield - predictedYield`
- `predictedProfit`: Estimated profit
- `actualProfit`: Realized net profit
- `feedbackNotes`: Agronomic observations

### Execution Command
To trigger the automated dataset extraction, feature engineering, and model retraining process:

```bash
python ml/retrain_pipeline.py
```

### Validation & Deployment
1. **Data Preprocessing**: Filters unverified outliers (> 3 std dev).
2. **Train/Test Split**: 75% training set, 25% held-out validation set.
3. **Model Evaluation**: Computes Validation Root Mean Squared Error (RMSE) and $R^2$ score.
4. **Model Deployment**: If validation RMSE improves over baseline, updated model weights and version metadata are written to `ml/models/yield_model_latest.json`.
