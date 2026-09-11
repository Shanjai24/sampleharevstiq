// Shared PMFBY (Pradhan Mantri Fasal Bima Yojana) premium estimation logic.
// Extracted from SchemesAndLoans.jsx so CropDetail.jsx (and anywhere else)
// can surface the same number instead of re-deriving it — a second
// implementation is how these two pages would silently drift apart.
//
// IMPORTANT: This is an INDICATIVE estimate only, not a quote.
// - Premium %: farmer-paid share is fixed by PMFBY guidelines at
//   2% (Kharif food/oilseed), 1.5% (Rabi food/oilseed), 5% (commercial/
//   horticultural). The government subsidizes the rest of the actuarial
//   premium — this function only returns the farmer-paid portion.
// - Sum insured: PMFBY bases this on the district-level Scale of Finance
//   / notified value per crop, which this app does not have live access
//   to. ₹35,000/acre is a placeholder mid-range assumption, NOT a real
//   per-district figure. This must stay clearly labeled as an estimate
//   in the UI — do not let this number be read as an actual quote.

const KHARIF_CROPS = ['rice', 'cotton', 'maize', 'soybean', 'groundnut', 'turmeric', 'millet', 'chilli'];
const RABI_CROPS = ['wheat', 'mustard', 'chickpea'];

// Placeholder per-acre sum-insured assumption — see note above.
// Centralized here (not duplicated) so it's one number to correct later
// if/when a real per-district Scale of Finance source is integrated.
const ASSUMED_SUM_INSURED_PER_ACRE = 35000;

export function classifyCropSeason(crop) {
    const cropLower = (crop || '').toLowerCase();
    if (RABI_CROPS.includes(cropLower)) return 'rabi';
    if (KHARIF_CROPS.includes(cropLower)) return 'kharif';
    return 'commercial';
}

/**
 * Returns the farmer-paid PMFBY premium estimate for a given crop + area.
 * @param {string} crop
 * @param {number} areaAcres
 * @returns {{ premiumPct: number, cropValue: number, premium: number, season: string }}
 */
export function computePmfbyPremium(crop, areaAcres) {
    const area = areaAcres && areaAcres > 0 ? areaAcres : 1.0;
    const season = classifyCropSeason(crop);
    const premiumPct = season === 'kharif' ? 2.0 : season === 'rabi' ? 1.5 : 5.0;
    const cropValue = Math.round(area * ASSUMED_SUM_INSURED_PER_ACRE);
    const premium = Math.round(cropValue * (premiumPct / 100));
    return { premiumPct, cropValue, premium, season };
}

// Standard disclaimer text — reuse verbatim wherever a PMFBY number is
// shown, so the caveat is never silently dropped in a new spot.
export const PMFBY_DISCLAIMER =
    'Indicative estimate only — actual premium depends on your district\u2019s ' +
    'notified Scale of Finance for this crop. Confirm the exact premium and ' +
    'eligibility at your nearest CSC, bank branch, or insurance company ' +
    'before enrolling.';