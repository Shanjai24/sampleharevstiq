"""
AgroPredict Cost Benchmark Calibration Script
-----------------------------------------------
IMPORTANT — this does NOT retrain yield_predictor.pkl. Ledger cost/income
data has no business as a feature of a yield regression model (cost
predicts profit, not yield — mixing them in would be a modeling mistake,
not an improvement).

What this DOES do: the "Estimated vs Actual Profit" comparison in
backend/routes/ledger.js currently uses a hardcoded CROP_BENCHMARKS object
(costPerAcre, modalPricePerTon per crop) — these were never derived from
real farmer data. This script periodically recalculates those numbers
from real FarmLedgerEntry records, so the "estimated" side of the
comparison gets more accurate over time as real farmers use the app.

HONESTY GUARD: a crop's benchmark is only updated if at least
MIN_SAMPLES_PER_CROP independent farms have logged relevant entries for
it. Below that threshold, the existing hardcoded default is left alone —
recalibrating off 1-2 entries would just replace one guess with a
noisier one dressed up as "real data."
"""

import os
import json
import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LEDGER_LOG_PATH = os.path.join(BASE_DIR, 'data', 'ledger_cost_logs.json')
OUTPUT_PATH = os.path.join(BASE_DIR, 'data', 'cost_benchmarks_calibrated.json')

# Minimum number of DISTINCT farms that must have logged cost/income data
# for a crop before its benchmark is considered calibratable. Distinct
# farms, not entry count, because one farm logging 10 fertilizer expenses
# is not 10 independent data points about typical cost-per-acre.
MIN_SAMPLES_PER_CROP = 5


def load_ledger_records():
    """Load ledger entries synced by backend/routes/ledger.js.
    (Mirrors the Mongo->JSON fallback pattern already used for harvest
    feedback in retrain_pipeline.py, but this script only needs the
    JSON file since it runs as a periodic offline job, not inline with
    a live request.)"""
    if not os.path.exists(LEDGER_LOG_PATH):
        print(f"[INFO] No ledger cost log found at {LEDGER_LOG_PATH} yet — nothing to calibrate.")
        return []
    try:
        with open(LEDGER_LOG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[WARN] Could not read ledger cost log: {e}")
        return []


def calibrate():
    records = load_ledger_records()
    if not records:
        print("[DONE] Nothing to calibrate. Existing hardcoded benchmarks remain in effect.")
        return {}

    # Group by crop
    by_crop = {}
    for r in records:
        crop = str(r.get('crop', 'rice')).lower().strip()
        by_crop.setdefault(crop, {'expense': [], 'income': [], 'farms': set()})
        farm_id = r.get('farmId', 'unknown')
        by_crop[crop]['farms'].add(farm_id)
        area = float(r.get('areaAcres') or 1.0)
        amount = float(r.get('amount') or 0)
        if r.get('entryType') == 'expense' and area > 0:
            by_crop[crop]['expense'].append(amount / area)
        elif r.get('entryType') == 'income' and r.get('category') == 'crop_sale':
            # The Ledger form captures amount + quantity, not a separate
            # unitPrice field (that schema field exists but the UI never
            # fills it) — so per-unit price is derived here instead.
            quantity = r.get('quantity')
            if quantity and float(quantity) > 0:
                by_crop[crop]['income'].append(amount / float(quantity))

    calibrated = {}
    for crop, data in by_crop.items():
        farm_count = len(data['farms'])
        if farm_count < MIN_SAMPLES_PER_CROP:
            print(f"[SKIP] {crop}: only {farm_count} distinct farm(s) logged — "
                  f"need {MIN_SAMPLES_PER_CROP}+ to calibrate. Keeping existing default.")
            continue

        entry = {'sample_farm_count': farm_count, 'calibrated_at': datetime.datetime.now().isoformat()}
        if data['expense']:
            entry['costPerAcre'] = round(sum(data['expense']) / len(data['expense']), 2)
            entry['cost_sample_count'] = len(data['expense'])
        if data['income']:
            entry['modalPricePerTon'] = round(sum(data['income']) / len(data['income']), 2)
            entry['price_sample_count'] = len(data['income'])

        if 'costPerAcre' in entry or 'modalPricePerTon' in entry:
            calibrated[crop] = entry
            print(f"[CALIBRATED] {crop}: {entry}")

    if calibrated:
        os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
        with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
            json.dump(calibrated, f, indent=2)
        print(f"[SAVE] Wrote calibrated benchmarks for {len(calibrated)} crop(s) to {OUTPUT_PATH}")
    else:
        print("[DONE] No crop met the minimum sample threshold yet. No file written.")

    return calibrated


if __name__ == '__main__':
    print("=" * 60)
    print("[START] COST BENCHMARK CALIBRATION")
    print(f"Timestamp: {datetime.datetime.now().isoformat()}")
    print(f"Minimum distinct farms per crop required: {MIN_SAMPLES_PER_CROP}")
    print("=" * 60)
    calibrate()
    print("=" * 60)
    print("[COMPLETE]")
    print("=" * 60)