const fs = require('fs');
const path = require('path');

let schemesData = [];
try {
  const jsonPath = path.join(__dirname, '../../ml/data/knowledge/government_schemes.json');
  if (fs.existsSync(jsonPath)) {
    schemesData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }
} catch (e) {
  console.error('Error loading government_schemes.json:', e.message);
}

/**
 * Match farmer profile against real government scheme criteria.
 * Filters strictly by:
 * 1. Landholding size (Small & Marginal <= 5 acres / 2 Ha vs Medium & Large)
 * 2. Crop type & Season (Kharif, Rabi, Commercial/Horticultural)
 * 3. State jurisdiction (Central schemes vs State-specific schemes & e-NAM participating states)
 *
 * @param {Object} profile - { state, areaAcres, crop }
 */
function matchSchemes(profile = {}) {
  const { state = 'Tamil Nadu', areaAcres = 1.0, crop = 'rice' } = profile;
  const cropLower = (crop || 'rice').toLowerCase().trim();
  const stateClean = (state || 'Tamil Nadu').trim();
  const stateLower = stateClean.toLowerCase();
  const parsedArea = Math.max(0.1, parseFloat(areaAcres) || 1.0);
  const isSmallMarginal = parsedArea <= 5.0; // <= 2.0 Hectares (approx 4.94 acres)

  // Classify crop agronomic season & type
  const KHARIF_CROPS = ['rice', 'cotton', 'maize', 'soybean', 'groundnut', 'turmeric', 'millet', 'chilli'];
  const RABI_CROPS = ['wheat', 'mustard', 'chickpea'];
  const COMMERCIAL_CROPS = ['sugarcane', 'banana', 'tomato', 'onion'];

  const matched = [];

  schemesData.forEach(scheme => {
    let eligible = true;
    let eligibilityStatus = 'Eligible'; // 'Eligible' | 'Conditionally Eligible' | 'Ineligible'
    let statusReason = '';
    let estimatedBenefit = '';

    const schemeId = scheme.id || (scheme.scheme || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const schemeTitle = scheme.scheme || scheme.title || 'Agricultural Scheme';

    // 1. Check State Jurisdiction
    if (scheme.scope === 'state') {
      const targetStates = (scheme.targetStates || []).map(s => s.toLowerCase());
      if (!targetStates.some(ts => stateLower.includes(ts) || ts.includes(stateLower))) {
        // Skip state schemes that do not belong to the farmer's state
        return;
      }
    }

    // Special state check for e-NAM (not active in deregulated states like Bihar or non-participating states like Kerala)
    if (schemeId === 'enam') {
      const enamStates = (scheme.targetStates || []).map(s => s.toLowerCase());
      const isEnamState = enamStates.some(ts => stateLower.includes(ts) || ts.includes(stateLower));
      if (!isEnamState) {
        eligible = false;
        eligibilityStatus = 'Ineligible';
        statusReason = `APMC mandis in ${stateClean} are currently not integrated with the e-NAM digital trading network.`;
      }
    }

    // 2. Check Land Holding Criteria
    if (eligible && scheme.maxLandAcres && parsedArea > scheme.maxLandAcres) {
      if (schemeId === 'pmksy-drip') {
        if (parsedArea > 12.5) {
          eligible = false;
          eligibilityStatus = 'Ineligible';
          statusReason = `Plot size (${parsedArea} acres) exceeds the maximum PMKSY subsidy ceiling of 12.5 acres (5 Hectares).`;
        } else {
          eligibilityStatus = 'Eligible (Large Farmer Tier)';
          statusReason = `Eligible for 45% subsidy bracket (> 5 acres / 2 Ha). Small & marginal farmers receive 55%.`;
        }
      } else {
        eligible = false;
        eligibilityStatus = 'Ineligible';
        statusReason = `Scheme strictly restricted to Small & Marginal farmers (<= ${scheme.maxLandAcres} acres). Your plot size is ${parsedArea} acres.`;
      }
    }

    // 3. Check Crop Specific Eligibility
    if (eligible && Array.isArray(scheme.eligibleCrops) && scheme.eligibleCrops !== 'all') {
      const cropMatches = scheme.eligibleCrops.some(c => c.toLowerCase() === cropLower);
      if (!cropMatches) {
        if (schemeId === 'ka-raitha-siri') {
          eligible = false;
          eligibilityStatus = 'Ineligible';
          statusReason = `Scheme is exclusively for minor millet cultivation (Ragi, Foxtail, Kodo). Selected crop is ${crop}.`;
        } else if (schemeId === 'pb-hr-crm') {
          eligible = false;
          eligibilityStatus = 'Ineligible';
          statusReason = `Crop residue management subsidy is only applicable for Paddy (Rice) and Wheat stubble management.`;
        } else if (schemeId === 'pmksy-drip') {
          eligibilityStatus = 'Conditionally Eligible';
          statusReason = `Micro-irrigation is optimized for row crops and horticulture. Field verification required for ${crop}.`;
        } else {
          eligible = false;
          eligibilityStatus = 'Ineligible';
          statusReason = `Scheme not applicable for ${crop}. Eligible crops: ${scheme.eligibleCrops.join(', ')}.`;
        }
      }
    }

    // 4. Calculate Tailored Rupee Benefits
    if (schemeId === 'pm-kisan') {
      eligibilityStatus = 'Eligible';
      statusReason = 'Open to all landholding farmer families. Subject to statutory exclusions: income-tax payees, constitutional post holders, institutional landholders, and regular government employees are excluded.';
      estimatedBenefit = '₹6,000 / year (in 3 equal installments of ₹2,000 credited directly to bank account via DBT)';

    } else if (schemeId === 'pmfby') {
      let ratePct = 2.0;
      let seasonType = 'Kharif Food & Oilseed';
      if (RABI_CROPS.includes(cropLower)) {
        ratePct = 1.5;
        seasonType = 'Rabi Season';
      } else if (COMMERCIAL_CROPS.includes(cropLower)) {
        ratePct = 5.0;
        seasonType = 'Commercial / Horticultural Crop';
      }

      const sumInsuredPerAcre = COMMERCIAL_CROPS.includes(cropLower) ? 55000 : 35000;
      const totalSumInsured = Math.round(parsedArea * sumInsuredPerAcre);
      const farmerPremium = Math.round(totalSumInsured * (ratePct / 100));
      const govtSubsidyShare = Math.round(totalSumInsured * 0.12); // Govts pay remaining actuarial rate ~12%

      eligibilityStatus = 'Eligible (Notified Crop)';
      statusReason = `${crop.toUpperCase()} is a notified ${seasonType}. Premium is legally capped at ${ratePct}%.`;
      estimatedBenefit = `Coverage up to ₹${totalSumInsured.toLocaleString()} with subsidized farmer premium of ~₹${farmerPremium.toLocaleString()} (${ratePct}% cap). Government absorbs ~₹${govtSubsidyShare.toLocaleString()} actuarial cost.`;

    } else if (schemeId === 'kcc') {
      let scaleOfFinance = 24000; // default INR per acre
      if (['sugarcane', 'banana'].includes(cropLower)) scaleOfFinance = 45000;
      else if (['cotton', 'chilli', 'tomato'].includes(cropLower)) scaleOfFinance = 32000;
      else if (['millet', 'chickpea', 'mustard'].includes(cropLower)) scaleOfFinance = 18000;

      const baseCredit = Math.round(parsedArea * scaleOfFinance);
      const withContingency = Math.round(baseCredit * 1.30); // 10% post-harvest + 20% maintenance
      const creditLimit = Math.min(300000, withContingency);

      eligibilityStatus = 'Eligible';
      statusReason = `Scale of finance for ${crop} in ${stateClean} benchmarks at ₹${scaleOfFinance.toLocaleString()}/acre.`;
      estimatedBenefit = `Subsidized crop production loan up to ₹${creditLimit.toLocaleString()} at 4% effective annual interest (7% normal rate minus 3% prompt repayment subvention).`;

    } else if (schemeId === 'pmksy-drip') {
      const approxCostPerAcre = 45000;
      const totalCost = Math.round(parsedArea * approxCostPerAcre);
      let subsidyPct = isSmallMarginal ? 0.55 : 0.45;
      let stateTopUpNote = '';

      // Tamil Nadu has a 100% subsidy scheme for small/marginal farmers for micro irrigation
      if (stateLower.includes('tamil nadu') && isSmallMarginal) {
        subsidyPct = 1.0;
        stateTopUpNote = ' (Includes 100% full state subsidy top-up for Small & Marginal farmers in Tamil Nadu!)';
      }

      const subsidyAmount = Math.round(totalCost * subsidyPct);

      if (eligible) {
        estimatedBenefit = `${Math.round(subsidyPct * 100)}% Subsidy (~₹${subsidyAmount.toLocaleString()} covered on estimated ₹${totalCost.toLocaleString()} layout cost)${stateTopUpNote}`;
      }

    } else if (schemeId === 'soil-health-card') {
      eligibilityStatus = 'Eligible (Universal)';
      statusReason = 'Universal free access for all registered farm holdings nationwide every 2 years.';
      estimatedBenefit = '100% Free Complete Laboratory Soil Analysis (12 parameters: N, P, K, pH, EC, Organic Carbon, Micronutrients) saving ~₹1,200 in private lab fees.';

    } else if (schemeId === 'tn-kaviadp') {
      if (isSmallMarginal) {
        eligibilityStatus = 'Eligible (High Priority)';
        statusReason = 'Small & Marginal farmers in Tamil Nadu village panchayats receive 100% priority free inputs & subsidies.';
        estimatedBenefit = 'Free certified seed mini-kits + free horticultural fruit saplings + 100% subsidy on battery-operated sprayers and micro-irrigation.';
      } else {
        eligibilityStatus = 'Ineligible';
        eligible = false;
        statusReason = `KAVIADP free input distribution is strictly targeted to small & marginal farmers (<= 5 acres).`;
      }

    } else if (schemeId === 'mh-namo-shetkari') {
      eligibilityStatus = 'Eligible (Maharashtra)';
      statusReason = 'Active for all PM-KISAN verified landholders in Maharashtra.';
      estimatedBenefit = '₹6,000 / year state top-up (combined with PM-KISAN, total annual DBT reaches ₹12,000 directly to your bank account).';

    } else if (schemeId === 'ap-annadata-sukhibhava') {
      eligibilityStatus = 'Eligible (Andhra Pradesh)';
      statusReason = 'Available to landholder & registered tenant farmers with CCRC card in Andhra Pradesh. Scheme renamed from YSR Rythu Bharosa to Annadata Sukhibhava in 2025.';
      estimatedBenefit = '₹20,000 / year total investment support (₹14,000 from AP State + ₹6,000 PM-KISAN central share), disbursed in seasonal installments.';

    // Legacy ID alias: keep backward compat if older cache has the old ID
    } else if (schemeId === 'ap-rythu-bharosa') {
      eligibilityStatus = 'Eligible (Andhra Pradesh)';
      statusReason = 'Scheme renamed to Annadata Sukhibhava in 2025. Benefit corrected to ₹20,000/yr.';
      estimatedBenefit = '₹20,000 / year (corrected — previous ₹13,500 was old YSR Rythu Bharosa rate before scheme restructure).';

    } else if (schemeId === 'ts-rythu-bharosa') {
      const investmentBenefit = Math.round(parsedArea * 12000);
      eligibilityStatus = 'Eligible (Telangana)';
      statusReason = 'Scheme renamed from Rythu Bandhu to Rythu Bharosa (Jan 2025). Calculated on cultivable acreage in Bhu Bharati portal.';
      estimatedBenefit = `₹${investmentBenefit.toLocaleString()} / year (₹6,000/acre/season × 2 seasons = ₹12,000/acre/year for agricultural input support).`;

    // Legacy ID alias
    } else if (schemeId === 'ts-rythu-bandhu') {
      const investmentBenefit = Math.round(parsedArea * 12000);
      eligibilityStatus = 'Eligible (Telangana)';
      statusReason = 'Scheme renamed Rythu Bharosa (Jan 2025). Benefit corrected to ₹6,000/acre/season (₹12,000/yr).';
      estimatedBenefit = `₹${investmentBenefit.toLocaleString()} / year (corrected from old Rythu Bandhu ₹10,000/yr rate).`;

    } else if (schemeId === 'ka-raitha-siri') {
      const milletHectares = Math.min(2.0, parsedArea / 2.47);
      const milletIncentive = Math.round(milletHectares * 10000);
      estimatedBenefit = `Direct incentive of ₹${milletIncentive.toLocaleString()} (₹10,000/hectare up to 2 Ha) for cultivating climate-resilient ${crop}.`;

    } else if (schemeId === 'pb-hr-crm') {
      estimatedBenefit = '50% individual capital subsidy (saving ~₹75,000 - ₹1,25,000) on Happy Seeder, Super Seeder, and Straw Mulcher machines.';
    }

    matched.push({
      id: schemeId,
      title: schemeTitle,
      category: scheme.category || 'Government Agricultural Support',
      scope: scheme.scope || 'national',
      eligible,
      eligibilityStatus,
      statusReason,
      description: scheme.description || scheme.benefit || '',
      howToApply: scheme.howToApply || '',
      coverage: scheme.coverage || '',
      estimatedBenefit: estimatedBenefit || scheme.benefit || '',
      applyUrl: scheme.applyUrl || 'https://myscheme.gov.in',
      sourceUrl: scheme.sourceUrl || scheme.applyUrl || 'https://myscheme.gov.in',
      officialSource: scheme.officialSource || (scheme.scope === 'state' ? `${scheme.targetStates?.[0] || 'State'} Dept of Agriculture` : 'Ministry of Agriculture & Farmers Welfare, GoI'),
      officialRef: scheme.officialRef || '',
      lastVerified: scheme.lastVerified || 'September 2026',
      verificationStatus: scheme.verificationStatus || 'UNVERIFIED',
      documentsRequired: scheme.documents || ['Aadhaar Card', 'Land Title Record (Patta/Chitta)', 'Bank Passbook'],
      disclaimer: "Eligibility is determined by rule-based algorithmic screening. Official approval requires field physical verification and title documentation at your block agricultural office."
    });
  });

  // Sort so fully eligible schemes appear first, followed by conditionally eligible, then ineligible
  matched.sort((a, b) => {
    const score = (item) => (item.eligible ? (item.eligibilityStatus.includes('Conditionally') ? 1 : 2) : 0);
    return score(b) - score(a);
  });

  return matched;
}

module.exports = { matchSchemes };
