/**
 * HarvestIQ Voice Accessibility Service
 * Browser-native Web Speech API wrapper for:
 * 1. Text-to-Speech (TTS) using window.speechSynthesis
 * 2. Speech-to-Text (STT) using SpeechRecognition / webkitSpeechRecognition
 * Supports English (en-IN), Hindi (hi-IN), and Tamil (ta-IN).
 *
 * STT Reliability Notes (as of 2026):
 * - en-IN: Excellent support in Chrome/Edge on Android and Windows
 * - hi-IN: Good support in Chrome on Android; patchy on Desktop Firefox
 * - ta-IN: Limited — works in Chrome Android; often falls back to en recognition on Desktop
 * - Safari (iOS): Uses webkit prefix, limited Indian language voice support
 * - Firefox: SpeechRecognition not supported at all (returns null from isSpeechRecognitionSupported)
 *
 * RE-VERIFY SCHEDULE: Browser support changes frequently.
 * Next check: March 2027 or after major Chrome/Edge engine update.
 */

const LANG_MAP = {
  'en': 'en-IN',
  'hi': 'hi-IN',
  'ta': 'ta-IN'
};

export const isSpeechSynthesisSupported = () => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
};

export const isSpeechRecognitionSupported = () => {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
};

/**
 * Strips markdown, emojis, symbols, and formatting for natural spoken speech.
 */
export const cleanTextForSpeech = (rawText = '') => {
  if (!rawText) return '';
  return rawText
    // Remove markdown bold, italic, strikethrough, backticks
    .replace(/[*_~`]/g, '')
    // Remove headers like ### or ##
    .replace(/^#+\s+/gm, '')
    // Remove bullet characters
    .replace(/^[•\-*]\s+/gm, '')
    // Remove emojis
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    // Normalize newlines to commas or periods for natural pause
    .replace(/\n+/g, '. ')
    // Collapse duplicate spaces
    .replace(/\s+/g, ' ')
    .trim();
};

// eslint-disable-next-line no-unused-vars
let currentUtterance = null;

/**
 * Reads text aloud in the user's selected language.
 */
export const speakText = (text, lang = 'en', { onStart, onEnd, onError } = {}) => {
  if (!isSpeechSynthesisSupported()) {
    console.warn('[VOICE] SpeechSynthesis is not supported in this browser.');
    onError?.(new Error('SpeechSynthesis not supported'));
    return false;
  }

  // Cancel any ongoing speech
  stopSpeaking();

  const clean = cleanTextForSpeech(text);
  if (!clean) return false;

  const targetLang = LANG_MAP[lang] || 'en-IN';
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = targetLang;
  utterance.rate = lang === 'ta' || lang === 'hi' ? 0.92 : 0.96; // Slightly paced for regional Indian languages
  utterance.pitch = 1.0;

  // Try to find a matching installed voice for regional language
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const matchedVoice = voices.find(v => v.lang.replace('_', '-') === targetLang) ||
                         voices.find(v => v.lang.startsWith(lang));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
  }

  utterance.onstart = () => {
    onStart?.();
  };

  utterance.onend = () => {
    currentUtterance = null;
    onEnd?.();
  };

  utterance.onerror = (e) => {
    currentUtterance = null;
    // Don't treat user-cancels as critical errors
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      console.error('[VOICE TTS Error]:', e);
      onError?.(e);
    } else {
      onEnd?.();
    }
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return true;
};

/**
 * Stops any current speech synthesis.
 */
export const stopSpeaking = () => {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
};

/**
 * Checks if speech synthesis is currently speaking.
 */
export const isSpeaking = () => {
  return isSpeechSynthesisSupported() && window.speechSynthesis.speaking;
};

/**
 * Starts speech recognition for voice input.
 * Returns an object with the recognition instance and a stop() method.
 *
 * @param {Object} options
 * @param {string} options.lang - 'en', 'hi', or 'ta'
 * @param {Function} options.onStart - Called when listening starts
 * @param {Function} options.onInterim - Called with partial (interim) transcript while speaking
 * @param {Function} options.onResult - Called with final confirmed transcript
 * @param {Function} options.onError - Called with error event; error.error contains reason string
 * @param {Function} options.onEnd - Called when recognition ends (success or failure)
 * @returns {SpeechRecognition|null} recognition instance, or null if unsupported
 */
export const startListening = ({
  lang = 'en',
  onStart,
  onInterim,
  onResult,
  onError,
  onEnd
} = {}) => {
  if (!isSpeechRecognitionSupported()) {
    console.warn('[VOICE] SpeechRecognition is not supported in this browser.');
    onError?.(new Error('SpeechRecognition not supported'));
    return null;
  }

  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognitionClass();

  const targetLang = LANG_MAP[lang] || 'en-IN';
  recognition.lang = targetLang;
  recognition.continuous = false;
  // Enable interim results so the UI can show live transcription as the user speaks
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    onStart?.();
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Fire interim callback for partial live display
    if (interimTranscript && onInterim) {
      onInterim(interimTranscript);
    }

    // Fire final callback only once we have a confirmed result
    if (finalTranscript && onResult) {
      onResult(finalTranscript);
    }
  };

  recognition.onerror = (event) => {
    // Translate browser error codes to user-readable messages
    const errorMessages = {
      'not-allowed': 'Microphone permission was denied. Please allow microphone access in your browser settings.',
      'no-speech': 'No speech detected. Please speak clearly and try again.',
      'network': 'Network error during voice recognition. Check your connection.',
      'audio-capture': 'No microphone found. Please connect a microphone and try again.',
      'service-not-allowed': 'Voice recognition service is not available in your browser.',
      'bad-grammar': 'Voice recognition could not process speech. Try speaking more slowly.',
      'aborted': null // User or code stopped — not an error
    };

    const userMessage = errorMessages[event.error];
    if (userMessage !== undefined && userMessage !== null) {
      console.warn('[VOICE STT Error]:', event.error, userMessage);
      onError?.(Object.assign(event, { userMessage }));
    } else if (userMessage !== null) {
      console.warn('[VOICE STT Error]:', event.error);
      onError?.(event);
    }
    // 'aborted' fires normally on stop() — don't propagate
  };

  recognition.onend = () => {
    onEnd?.();
  };

  try {
    recognition.start();
    return recognition;
  } catch (err) {
    console.error('[VOICE Start Error]:', err);
    onError?.(err);
    return null;
  }
};

/**
 * Parse a natural language voice command for ledger quick-add.
 * Supports patterns like:
 *   "add 500 rupees fertilizer expense today"
 *   "record 1500 rupees seed purchase"
 *   "log 800 labor expense yesterday"
 *   "2000 rupees crop sale income"
 *
 * Returns a parsed object for confirmation before saving, or null if not a ledger command.
 *
 * @param {string} transcript - Raw voice transcript
 * @returns {{ amount: number, category: string, entryType: string, note: string } | null}
 */
export const parseLedgerVoiceCommand = (transcript = '') => {
  const text = transcript.toLowerCase().trim();

  // Must contain a number (the amount)
  const amountMatch = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:rupees?|rs\.?|₹)?/);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  // Determine entry type
  const incomeKeywords = ['income', 'sale', 'revenue', 'sold', 'received', 'subsidy', 'payment received'];
  const entryType = incomeKeywords.some(k => text.includes(k)) ? 'income' : 'expense';

  // Map keywords to categories
  const CATEGORY_KEYWORDS = {
    fertilizer: ['fertilizer', 'urea', 'dap', 'npk', 'nutrient', 'compost', 'manure'],
    seed: ['seed', 'seedling', 'sapling', 'planting'],
    pesticide: ['pesticide', 'spray', 'insecticide', 'fungicide', 'herbicide', 'weedicide'],
    labor: ['labor', 'labour', 'worker', 'wages', 'field work', 'harvester'],
    irrigation: ['irrigation', 'water', 'pump', 'electricity', 'drip'],
    equipment_rental: ['tractor', 'machine', 'equipment', 'rental', 'hire', 'rotavator'],
    transport: ['transport', 'truck', 'mandi', 'loading', 'freight'],
    crop_sale: ['crop sale', 'mandi sale', 'sold crop', 'paddy sale', 'harvest sale'],
    subsidy_received: ['subsidy', 'dbt', 'pm kisan', 'government payment', 'scheme amount']
  };

  let category = entryType === 'income' ? 'crop_sale' : 'fertilizer'; // defaults
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      category = cat;
      break;
    }
  }

  // Build a readable note from the transcript
  const note = transcript.trim();

  return { amount, category, entryType, note, rawTranscript: transcript };
};
