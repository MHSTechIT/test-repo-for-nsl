/**
 * Meta Pixel helpers — funnel app only.
 *
 * Every funnel decision the user makes (sugar level, diabetes
 * duration, medication, age group, occupation) is sent to Meta with a
 * monetary `value` derived from a lead-quality score so the
 * ad-optimization model learns which qualification profiles produce
 * buyers, not just leads.
 *
 * Base pixel + PageView fire from index.html before React mounts.
 * This module only emits the qualification + conversion events.
 *
 * Pixel ID: 1866739047322363
 */

const PIXEL_ID = '1866739047322363';
const CURRENCY = 'INR';

/* fbq is loaded by index.html; gracefully no-op when offline / blocked. */
const fbq = (...args) => {
  if (typeof window === 'undefined' || !window.fbq) return;
  try { window.fbq(...args); } catch (_) {}
};

/* Crypto-random per-event ID so future server-side CAPI sends can
   dedupe with the browser pixel. */
function newEventID() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch (_) {}
  return 'e_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

/* ── Lead-quality scoring used as Meta `value` so the optimization
   model learns which qualification profiles convert to buyers. The
   scale is arbitrary but consistent: higher = more valuable. */
const SCORE_MAP = {
  sugar:   { '150-250': 80, '250+': 120 },
  duration: { new: 60, mid: 100, long: 150 },
  medication: { none: 60, tablets: 110, insulin: 160 },
  age:     { '35-45': 70, '45-55': 110, '55+': 140 },
  occupation: { working: 130, retired: 110, housewife: 90 },
};
function scoreFor(category, key) {
  return (SCORE_MAP[category] && SCORE_MAP[category][key]) || 50;
}

/* Computes the rolling buyer-intent value from everything we know so
   far. Meta sees this as the bid value — climbs as the funnel deepens. */
function rollingValue(state = {}) {
  let v = 0;
  if (state.sugarLevel)      v += scoreFor('sugar', state.sugarLevel);
  if (state.diabetesDuration) v += scoreFor('duration', state.diabetesDuration);
  if (state.onMedication)    v += scoreFor('medication', state.onMedication);
  if (state.ageGroup)        v += scoreFor('age', state.ageGroup);
  if (state.occupation)      v += scoreFor('occupation', state.occupation);
  return v;
}

/* ─────────────────────────────────────────────────────────────────
   Top-of-funnel signals
   ───────────────────────────────────────────────────────────────── */

/** Fires once when the landing hero is visible. Tells Meta the user
 *  consumed the offer page (vs. immediate bounce). */
export const pixelViewContent = (utm = {}) => fbq('track', 'ViewContent', {
  content_name: 'diabetes_reversal_landing',
  content_category: 'webinar_offer',
  content_type: 'product',
  value: 50,
  currency: CURRENCY,
  ...utm,
}, { eventID: newEventID() });

/** "Check Your Eligibility" CTA tap — funnel commitment. */
export const pixelStartQualification = (utm = {}) => fbq('track', 'InitiateCheckout', {
  content_name: 'webinar_eligibility_quiz',
  content_category: 'qualification_start',
  value: 100,
  currency: CURRENCY,
  ...utm,
}, { eventID: newEventID() });

/* ─────────────────────────────────────────────────────────────────
   Step-level qualification — one event per answer with the
   per-answer value rolled into Meta's bid signal.
   ───────────────────────────────────────────────────────────────── */

export const pixelSugarSelected = (level, state) => fbq('trackCustom', 'SugarLevelSelected', {
  sugar_level: level,
  content_category: 'qualification_q1',
  value: scoreFor('sugar', level),
  currency: CURRENCY,
  rolling_value: rollingValue({ ...(state || {}), sugarLevel: level }),
}, { eventID: newEventID() });

export const pixelDisqualified = (reason, state) => fbq('trackCustom', 'Disqualified_Lead', {
  reason,
  content_category: 'qualification_failed',
  value: 5, // very low — tells Meta not to spend on look-alikes of this profile
  currency: CURRENCY,
  rolling_value: rollingValue(state || {}),
}, { eventID: newEventID() });

export const pixelDurationSelected = (duration, state) => fbq('trackCustom', 'DiabetesDurationSelected', {
  diabetes_duration: duration,
  content_category: 'qualification_q2a',
  value: scoreFor('duration', duration),
  currency: CURRENCY,
  rolling_value: rollingValue({ ...(state || {}), diabetesDuration: duration }),
}, { eventID: newEventID() });

export const pixelMedicationSelected = (medication, state) => fbq('trackCustom', 'MedicationSelected', {
  on_medication: medication,
  content_category: 'qualification_q2b',
  value: scoreFor('medication', medication),
  currency: CURRENCY,
  rolling_value: rollingValue({ ...(state || {}), onMedication: medication }),
}, { eventID: newEventID() });

export const pixelAgeSelected = (ageGroup, state) => fbq('trackCustom', 'AgeGroupSelected', {
  age_group: ageGroup,
  content_category: 'qualification_q3a',
  value: scoreFor('age', ageGroup),
  currency: CURRENCY,
  rolling_value: rollingValue({ ...(state || {}), ageGroup }),
}, { eventID: newEventID() });

export const pixelOccupationSelected = (occupation, state) => fbq('trackCustom', 'OccupationSelected', {
  occupation,
  content_category: 'qualification_q3b',
  value: scoreFor('occupation', occupation),
  currency: CURRENCY,
  rolling_value: rollingValue({ ...(state || {}), occupation }),
}, { eventID: newEventID() });

/* ─────────────────────────────────────────────────────────────────
   Bottom-of-funnel — conversion events.
   ───────────────────────────────────────────────────────────────── */

/** Fires when the registration form (name/email/phone) opens. */
export const pixelFormOpened = (state) => fbq('trackCustom', 'RegistrationFormOpened', {
  content_name: 'registration_form',
  content_category: 'form_view',
  value: rollingValue(state || {}),
  currency: CURRENCY,
}, { eventID: newEventID() });

/** Fires the first time the user types into any form field. */
export const pixelFormStarted = (state) => fbq('trackCustom', 'RegistrationFormStarted', {
  content_category: 'form_engagement',
  value: rollingValue(state || {}),
  currency: CURRENCY,
}, { eventID: newEventID() });

/** Lead — Meta's primary conversion event. Re-inits the pixel with
 *  Advanced Matching (email/phone/name) and fires with the full
 *  qualification value rolled in so Meta optimizes for **this profile**
 *  not just "anyone who submitted a form". */
export function pixelLead({ fullName, email, whatsappNumber, leadScore }, state = {}) {
  if (typeof window === 'undefined' || !window.fbq) return;

  // Re-init with Advanced Matching parameters. SDK hashes client-side
  // before sending so PII never leaves the user's browser in plaintext.
  const [firstName, ...rest] = (fullName || '').trim().split(/\s+/);
  const lastName = rest.join(' ');
  try {
    window.fbq('init', PIXEL_ID, {
      em: (email || '').trim().toLowerCase(),
      ph: whatsappNumber ? `91${whatsappNumber}` : undefined,
      fn: firstName ? firstName.toLowerCase() : undefined,
      ln: lastName ? lastName.toLowerCase() : undefined,
      country: 'in',
    });
  } catch (_) {}

  const totalValue = rollingValue(state) + (leadScore ? leadScore * 50 : 0);

  fbq('track', 'Lead', {
    content_name: 'webinar_registration',
    content_category: 'lead',
    value: totalValue,
    currency: CURRENCY,
    lead_score: leadScore || null,
    sugar_level: state.sugarLevel || null,
    diabetes_duration: state.diabetesDuration || null,
    on_medication: state.onMedication || null,
    age_group: state.ageGroup || null,
    occupation: state.occupation || null,
  }, { eventID: newEventID() });

  // CompleteRegistration alongside Lead so campaigns optimizing for
  // either standard event get the signal.
  fbq('track', 'CompleteRegistration', {
    content_name: 'webinar_registration',
    value: totalValue,
    currency: CURRENCY,
    status: true,
    lead_score: leadScore || null,
  }, { eventID: newEventID() });
}

/** Fires when the user actually taps "Join WhatsApp Group" on the
 *  confirmation screen — strongest commitment signal we have. */
export const pixelScheduleConfirmed = (leadScore, state = {}) => fbq('track', 'Schedule', {
  content_name: 'webinar_attendance_committed',
  content_category: 'schedule',
  value: rollingValue(state) + (leadScore ? leadScore * 100 : 0),
  currency: CURRENCY,
  lead_score: leadScore || null,
}, { eventID: newEventID() });
