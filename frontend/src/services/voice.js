/**
 * HarvestIQ Voice Accessibility Service
 * Browser-native Web Speech API wrapper for:
 * 1. Text-to-Speech (TTS) using window.speechSynthesis
 * 2. Speech-to-Text (STT) using SpeechRecognition / webkitSpeechRecognition
 * Supports English (en-IN), Hindi (hi-IN), and Tamil (ta-IN).
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
 */
export const startListening = ({
  lang = 'en',
  onStart,
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
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    onStart?.();
  };

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || '';
    if (transcript) {
      onResult?.(transcript);
    }
  };

  recognition.onerror = (event) => {
    console.warn('[VOICE STT Error]:', event.error);
    onError?.(event);
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
