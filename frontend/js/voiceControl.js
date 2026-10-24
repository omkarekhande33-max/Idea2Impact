/**
 * Idea2Impact - Voice Monitoring & Voice Control Accessibility System
 * 
 * Empowers motor-impaired and keyboard/mouse disabled users to effortlessly 
 * navigate, interact, type, and control the entire Idea2Impact platform hands-free.
 */

export class VoiceAccessibilitySystem {
  constructor(options = {}) {
    this.options = Object.assign({
      continuous: true,
      autoStart: false,
      speechFeedback: true,
      soundEffects: true,
      lang: 'en-US'
    }, options);

    this.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.isContinuous = this.options.continuous;
    this.speechFeedbackEnabled = this.options.speechFeedback;
    this.soundEffectsEnabled = this.options.soundEffects;

    this.numberBadges = [];
    this.isNumbersVisible = false;
    this.restartTimeout = null;
    this.domElements = {};

    this.init();
  }

  init() {
    this.buildWidgetDOM();
    this.setupKeyboardShortcuts();
    this.initRecognition();
    
    // Auto restore preference
    const savedVoiceState = localStorage.getItem('i2i_voice_active');
    if (savedVoiceState === 'true' || this.options.autoStart) {
      setTimeout(() => this.startListening(), 800);
    }
  }

  /* -------------------------------------------------------------
   * Web Speech Recognition & Lifecycle
   * ----------------------------------------------------------- */
  initRecognition() {
    if (!this.SpeechRecognition) {
      console.warn("Speech Recognition API is not supported in this browser.");
      this.updateStatus('unsupported', 'Voice API Not Supported');
      return;
    }

    try {
      this.recognition = new this.SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.options.lang;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateStatus('listening', 'Monitoring Voice...');
        this.playTone(520, 0.12, 'sine');
        this.animateWaveBars(true);
        this.announceAria('Voice monitoring activated. Listening for commands.');
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        if (interimTranscript) {
          this.showTranscript(interimTranscript, true);
        }

        if (finalTranscript) {
          const cleanText = finalTranscript.trim();
          this.showTranscript(cleanText, false);
          this.handleCommand(cleanText);
        }
      };

      this.recognition.onerror = (event) => {
        // Silently ignore normal pauses in continuous speech
        if (event.error === 'no-speech') {
          return;
        }
        console.warn("Speech recognition notice:", event.error);
        if (event.error === 'not-allowed') {
          this.updateStatus('idle', 'Microphone Access Denied');
          this.showFeedback('Microphone permission needed for Voice Control.', 'warning');
          this.isListening = false;
        }
      };

      this.recognition.onend = () => {
        this.animateWaveBars(false);
        // If continuous mode is enabled and user hasn't explicitly stopped, restart immediately
        if (this.isListening && this.isContinuous) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            try {
              if (this.isListening) {
                this.recognition.start();
              }
            } catch (e) {
              // Ignore if already active
            }
          }, 300);
        } else {
          this.isListening = false;
          this.updateStatus('idle', 'Voice Control Paused');
        }
      };
    } catch (e) {
      console.error("Failed to initialize Speech Recognition:", e);
    }
  }

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening() {
    if (!this.recognition) {
      this.showFeedback('Speech Recognition is not available in your browser.', 'warning');
      return;
    }
    this.isListening = true;
    localStorage.setItem('i2i_voice_active', 'true');
    try {
      this.recognition.start();
    } catch (e) {
      // Already active or starting
    }
  }

  stopListening() {
    this.isListening = false;
    localStorage.setItem('i2i_voice_active', 'false');
    this.playTone(330, 0.15, 'sine');
    clearTimeout(this.restartTimeout);
    try {
      if (this.recognition) this.recognition.stop();
    } catch (e) {}
    this.updateStatus('idle', 'Voice Paused');
    this.animateWaveBars(false);
    this.announceAria('Voice monitoring paused.');
  }

  /* -------------------------------------------------------------
   * Command Interpretation & Action Dispatcher
   * ----------------------------------------------------------- */
  handleCommand(phrase) {
    if (!phrase) return;
    const lower = phrase.toLowerCase().trim().replace(/[.,!?;:]/g, '');
    this.updateStatus('processing', 'Processing...');

    // 1. Check for Number Tags Navigation (e.g. "click 3", "select 5", "5", "tag 2")
    if (this.isNumbersVisible || /^(click|select|choose|open|press|tap)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)$/.test(lower)) {
      const numberMatched = this.parseSpokenNumber(lower);
      if (numberMatched !== null) {
        const handled = this.clickElementByNumber(numberMatched);
        if (handled) return;
      }
    }

    // 2. Number Badges Visibility
    if (/(show|display|turn on|view)\s+(numbers|tags|badges|labels)/.test(lower) || lower === 'numbers' || lower === 'show numbers') {
      this.showNumberBadges();
      this.speak("Displaying numbered targets. Say a number to click.");
      this.showFeedback("Numbered badges shown. Say a number or 'Click #' to activate.", "success");
      return;
    }

    if (/(hide|clear|remove|dismiss)\s+(numbers|tags|badges|labels)/.test(lower) || lower === 'hide numbers') {
      this.hideNumberBadges();
      this.speak("Hiding numbers.");
      this.showFeedback("Numbered badges hidden.", "info");
      return;
    }

    // 3. Navigation Commands (Tabs, Workspaces, Pages)
    if (this.tryNavigationCommand(lower)) {
      return;
    }

    // 4. Scrolling & Viewport Control
    if (this.tryScrollCommand(lower)) {
      return;
    }

    // 5. Typing & Form Input ("type hello", "enter test@email.com", "search python")
    if (this.tryTypingCommand(lower, phrase)) {
      return;
    }

    // 6. Generic Click Commands ("click send", "click apply", "click post job")
    if (this.tryClickCommand(lower)) {
      return;
    }

    // 7. Screen Reader / Voice Reading
    if (/(read|speak)\s+(page|content|summary|article|this)/.test(lower) || lower === 'read page' || lower === 'read summary') {
      this.readPageContent();
      return;
    }

    if (/(stop|cancel|quiet|silence)\s+(speaking|reading|voice|sound)/.test(lower) || lower === 'stop reading' || lower === 'be quiet') {
      this.stopSpeaking();
      this.showFeedback("Speech output stopped.", "info");
      return;
    }

    // 8. Help & Guides
    if (/(help|what can i say|show commands|voice commands|guide)/.test(lower)) {
      this.openHelpModal();
      this.speak("Opening Voice Commands guide.");
      this.showFeedback("Voice commands guide opened.", "success");
      return;
    }

    if (/(close help|close guide|close modal|cancel|dismiss|escape)/.test(lower)) {
      this.closeHelpModal();
      this.speak("Closed modal.");
      return;
    }

    // 9. Voice Monitor Control
    if (/(pause voice|mute mic|stop listening|sleep)/.test(lower)) {
      this.speak("Pausing voice monitoring.");
      this.stopListening();
      return;
    }

    // Unrecognized command
    this.updateStatus('listening', 'Monitoring Voice...');
    this.showFeedback(`Unrecognized: "${phrase}". Say "Help" for command list.`, 'warning');
  }

  /* -------------------------------------------------------------
   * Specific Command Handlers
   * ----------------------------------------------------------- */
  tryNavigationCommand(lower) {
    // Tab switching for Idea2Impact Dashboard
    const tabMap = {
      // Candidate tabs
      'jobs': ['jobs', 'job', 'analyze', 'match', 'roles', 'job match'],
      'competencies': ['competencies', 'competency', 'skills', 'skill passport', 'passport', 'my skills'],
      'applications': ['applications', 'applied', 'applied roles', 'my applications'],
      'hr-messages': ['hr messages', 'hr message', 'recruiter messages', 'recruiter message', 'hr chat', 'message hr'],
      'meet-hr': ['meet with hr', 'meet hr', 'video call', 'interview meet', 'scheduled interview'],
      
      // HR tabs
      'overview': ['overview', 'dashboard', 'executive dashboard', 'summary'],
      'create-job': ['create job', 'post job', 'post new job', 'new job', 'post 75 25 job'],
      'candidates': ['candidates', 'candidate dossier', 'talent', 'talent pool', 'dossier', 'candidate list'],
      'candidate-messages': ['candidate messages', 'candidate message', 'candidate chat', 'messages with candidate'],
      'interviews': ['interviews', 'offers', 'pipeline', 'interview list', 'job offers']
    };

    // Check tab navigation
    for (const [tabKey, aliases] of Object.entries(tabMap)) {
      const match = aliases.some(alias => 
        lower === alias || 
        lower === `go to ${alias}` || 
        lower === `open ${alias}` || 
        lower === `switch to ${alias}` || 
        lower === `show ${alias}`
      );
      if (match) {
        this.navigateToTab(tabKey);
        return true;
      }
    }

    // Page navigation
    if (/(go to |open )?(home|landing|homepage)/.test(lower)) {
      this.speak("Navigating to Home.");
      this.showFeedback("Going to Home page...", "success");
      setTimeout(() => { window.location.href = 'index.html'; }, 600);
      return true;
    }

    if (/(go to |open )?(roadmap|skill roadmap|learning hub)/.test(lower)) {
      this.speak("Navigating to Skill Roadmap.");
      this.showFeedback("Going to Roadmap...", "success");
      setTimeout(() => { window.location.href = 'roadmap.html'; }, 600);
      return true;
    }

    if (/(go to |open )?(login|sign in|portal)/.test(lower)) {
      this.speak("Navigating to Sign In.");
      this.showFeedback("Going to Login page...", "success");
      setTimeout(() => { window.location.href = 'login.html'; }, 600);
      return true;
    }

    if (/(go to |open )?dashboard/.test(lower)) {
      this.speak("Opening Dashboard.");
      this.showFeedback("Going to Dashboard...", "success");
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
      return true;
    }

    // Role Switcher Commands (Demo persona switch)
    if (/(switch to |become |role )candidate/.test(lower)) {
      this.switchRole('candidate');
      return true;
    }
    if (/(switch to |become |role )(hr|recruiter)/.test(lower)) {
      this.switchRole('hr');
      return true;
    }

    // Logout
    if (lower === 'logout' || lower === 'sign out' || lower === 'log out') {
      this.speak("Signing out.");
      const logoutBtn = document.querySelector('[data-action="logout"], #logout-btn, button:has-text("Logout"), button:has-text("Sign Out")') ||
                        Array.from(document.querySelectorAll('button, a')).find(el => /sign\s*out|log\s*out/i.test(el.textContent));
      if (logoutBtn) {
        logoutBtn.click();
      } else {
        localStorage.removeItem('i2i_token');
        sessionStorage.removeItem('i2i_token');
        window.location.href = 'login.html';
      }
      return true;
    }

    return false;
  }

  navigateToTab(tabKey) {
    const navLink = document.querySelector(`[data-tab="${tabKey}"]`);
    if (navLink) {
      navLink.click();
      const tabName = navLink.textContent.trim() || tabKey;
      this.speak(`Opened ${tabName}`);
      this.showFeedback(`✓ Navigated to ${tabName}`, 'success');
      this.playTone(660, 0.1, 'sine');
      this.updateStatus('listening', 'Monitoring Voice...');
      return;
    }

    // Try finding via window.state or dispatching custom event
    if (window.state && typeof window.state.setTab === 'function') {
      window.state.setTab(tabKey);
      this.speak(`Switched tab to ${tabKey}`);
      this.showFeedback(`✓ Switched to ${tabKey}`, 'success');
      this.updateStatus('listening', 'Monitoring Voice...');
      return;
    }

    this.showFeedback(`Tab "${tabKey}" is not currently available in this view.`, 'warning');
    this.updateStatus('listening', 'Monitoring Voice...');
  }

  switchRole(role) {
    const roleChip = document.querySelector(`[data-role="${role}"], .role-chip[data-role="${role}"]`);
    if (roleChip) {
      roleChip.click();
      this.speak(`Switched role to ${role}`);
      this.showFeedback(`✓ Switched mode to ${role.toUpperCase()}`, 'success');
    } else if (window.state && typeof window.state.setRole === 'function') {
      window.state.setRole(role);
      this.speak(`Switched role to ${role}`);
      this.showFeedback(`✓ Switched mode to ${role.toUpperCase()}`, 'success');
    } else {
      this.showFeedback(`Could not switch to ${role} from current view.`, 'warning');
    }
  }

  tryScrollCommand(lower) {
    if (lower === 'scroll down' || lower === 'page down' || lower === 'down') {
      window.scrollBy({ top: 450, behavior: 'smooth' });
      this.showFeedback('Scrolled down', 'info');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }
    if (lower === 'scroll up' || lower === 'page up' || lower === 'up') {
      window.scrollBy({ top: -450, behavior: 'smooth' });
      this.showFeedback('Scrolled up', 'info');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }
    if (lower === 'scroll to top' || lower === 'go to top' || lower === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.showFeedback('Scrolled to top', 'info');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }
    if (lower === 'scroll to bottom' || lower === 'bottom of page' || lower === 'bottom') {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      this.showFeedback('Scrolled to bottom', 'info');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }
    return false;
  }

  tryTypingCommand(lower, rawPhrase) {
    // "type [text]", "enter [text]", "write [text]"
    const typeMatch = rawPhrase.match(/^(?:type|enter|write)\s+(.+)$/i);
    if (typeMatch) {
      const textToType = typeMatch[1];
      this.typeTextIntoActiveElement(textToType);
      return true;
    }

    // "search for [query]", "search [query]"
    const searchMatch = rawPhrase.match(/^search(?:\s+for)?\s+(.+)$/i);
    if (searchMatch) {
      const query = searchMatch[1];
      const searchInput = document.querySelector('input[type="search"], input[name*="search"], input[placeholder*="search" i], input[id*="search" i]');
      if (searchInput) {
        searchInput.focus();
        searchInput.value = query;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        this.speak(`Searching for ${query}`);
        this.showFeedback(`✓ Searched: "${query}"`, 'success');
        
        // Trigger submit if in form or enter
        const enterEvt = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });
        searchInput.dispatchEvent(enterEvt);
        return true;
      }
    }

    // "focus message" / "focus chat" / "message [text]"
    if (lower.startsWith('focus message') || lower.startsWith('focus chat') || lower.startsWith('message ')) {
      const chatInput = document.querySelector('#chat-input, textarea[placeholder*="message" i], input[placeholder*="message" i], textarea');
      if (chatInput) {
        chatInput.focus();
        if (lower.startsWith('message ')) {
          const content = rawPhrase.slice(8);
          this.typeTextIntoActiveElement(content);
        } else {
          this.showFeedback('Message input focused. Say "Type [message]" to write.', 'info');
        }
        return true;
      }
    }

    // "send message" / "send"
    if (lower === 'send' || lower === 'send message' || lower === 'submit message') {
      const sendBtn = document.querySelector('#chat-send-btn, button[id*="send" i], button.chat-send-btn') ||
                      Array.from(document.querySelectorAll('button')).find(b => /send/i.test(b.textContent));
      if (sendBtn) {
        sendBtn.click();
        this.speak("Message sent");
        this.showFeedback("✓ Sent message", "success");
        this.playTone(880, 0.1, 'sine');
        return true;
      }
    }

    // "clear" / "clear input"
    if (lower === 'clear' || lower === 'clear input' || lower === 'erase') {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        activeEl.value = '';
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        activeEl.dispatchEvent(new Event('change', { bubbles: true }));
        this.showFeedback("Cleared input text", "info");
        return true;
      }
    }

    // "submit" / "press enter"
    if (lower === 'submit' || lower === 'press enter' || lower === 'enter') {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.form) {
        activeEl.form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        this.showFeedback("Submitted form", "success");
        return true;
      }
      const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        submitBtn.click();
        this.showFeedback("Submitted form", "success");
        return true;
      }
    }

    return false;
  }

  typeTextIntoActiveElement(text) {
    let target = document.activeElement;
    
    // If not focused on an input/textarea, try to find sensible default input
    if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) {
      target = document.querySelector('#chat-input, input:not([type="hidden"]), textarea');
      if (target) {
        target.focus();
      }
    }

    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      const currentVal = target.value || '';
      target.value = (currentVal ? currentVal + ' ' : '') + text;
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      
      this.speak(`Typed: ${text}`);
      this.showFeedback(`✓ Typed: "${text}"`, 'success');
      this.highlightElement(target);
      this.updateStatus('listening', 'Monitoring Voice...');
    } else {
      this.showFeedback('No text input field is currently active or focused.', 'warning');
      this.updateStatus('listening', 'Monitoring Voice...');
    }
  }

  tryClickCommand(lower) {
    // Check for "click [something]", "press [something]", "tap [something]"
    const clickMatch = lower.match(/^(?:click|press|select|open|tap)\s+(.+)$/);
    if (!clickMatch) return false;

    const targetLabel = clickMatch[1].trim();

    // Priority targets
    const candidates = Array.from(document.querySelectorAll(
      'button, a, input[type="button"], input[type="submit"], [role="button"], label, .role-chip, .tab-chip, .mobile-tab-chip, .nav-link'
    )).filter(el => {
      // Must be visible
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || window.getComputedStyle(el).display === 'none') {
        return false;
      }
      return true;
    });

    // Find best match
    let bestEl = null;
    let bestScore = 0;

    for (const el of candidates) {
      const text = (el.textContent || '').trim().toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const title = (el.getAttribute('title') || '').toLowerCase();
      const val = (el.value || '').toLowerCase();
      const id = (el.id || '').toLowerCase();

      // Exact match
      if (text === targetLabel || ariaLabel === targetLabel || val === targetLabel) {
        bestEl = el;
        bestScore = 100;
        break;
      }

      // Starts with
      if (text.startsWith(targetLabel) || ariaLabel.startsWith(targetLabel)) {
        if (bestScore < 80) { bestEl = el; bestScore = 80; }
      }

      // Contains
      if (text.includes(targetLabel) || ariaLabel.includes(targetLabel) || title.includes(targetLabel) || id.includes(targetLabel)) {
        if (bestScore < 60) { bestEl = el; bestScore = 60; }
      }
    }

    if (bestEl) {
      this.highlightElement(bestEl);
      bestEl.click();
      const label = bestEl.textContent.trim() || targetLabel;
      this.speak(`Clicked ${label}`);
      this.showFeedback(`✓ Clicked: "${label}"`, 'success');
      this.playTone(740, 0.1, 'sine');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }

    this.showFeedback(`Could not find button or link matching "${targetLabel}". Say "Show Numbers" to see all click targets.`, 'warning');
    this.updateStatus('listening', 'Monitoring Voice...');
    return false;
  }

  /* -------------------------------------------------------------
   * Vimium-Style Number Badges (Hands-Free Accessibility)
   * ----------------------------------------------------------- */
  showNumberBadges() {
    this.hideNumberBadges();

    // Query all interactive elements
    const elements = Array.from(document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"]), .role-chip, .nav-link, .mobile-tab-chip'
    )).filter(el => {
      // Must be visible in viewport
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
      return true;
    });

    let index = 1;
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const badge = document.createElement('div');
      badge.className = 'voice-tag-badge';
      badge.textContent = index;
      badge.dataset.number = index;
      badge.style.left = `${Math.max(4, rect.left + window.scrollX)}px`;
      badge.style.top = `${Math.max(4, rect.top + window.scrollY)}px`;
      document.body.appendChild(badge);

      this.numberBadges.push({ number: index, element: el, badgeEl: badge });
      index++;
    });

    this.isNumbersVisible = true;
  }

  hideNumberBadges() {
    this.numberBadges.forEach(item => {
      if (item.badgeEl && item.badgeEl.parentNode) {
        item.badgeEl.parentNode.removeChild(item.badgeEl);
      }
    });
    this.numberBadges = [];
    this.isNumbersVisible = false;
  }

  clickElementByNumber(num) {
    if (!this.isNumbersVisible) {
      this.showNumberBadges();
    }
    const match = this.numberBadges.find(b => b.number === num);
    if (match && match.element) {
      this.highlightElement(match.element);
      match.element.click();
      if (match.element.tagName === 'INPUT' || match.element.tagName === 'TEXTAREA') {
        match.element.focus();
      }
      this.speak(`Activated number ${num}`);
      this.showFeedback(`✓ Clicked [${num}]: ${match.element.textContent.trim().slice(0, 24) || 'Target'}`, 'success');
      this.playTone(800, 0.1, 'triangle');
      // Auto-hide tags after successful action
      setTimeout(() => this.hideNumberBadges(), 1000);
      return true;
    }
    return false;
  }

  parseSpokenNumber(text) {
    const wordNumbers = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
      'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
    };

    const digitsMatch = text.match(/\d+/);
    if (digitsMatch) {
      return parseInt(digitsMatch[0], 10);
    }

    for (const [word, val] of Object.entries(wordNumbers)) {
      if (new RegExp(`\\b${word}\\b`).test(text)) {
        return val;
      }
    }
    return null;
  }

  /* -------------------------------------------------------------
   * Screen Reader & Speech Synthesis (TTS)
   * ----------------------------------------------------------- */
  speak(text) {
    if (!this.speechFeedbackEnabled || !('speechSynthesis' in window)) return;
    
    // Cancel prior speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.95;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.updateStatus('speaking', 'Speaking...');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.updateStatus('listening', 'Monitoring Voice...');
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.updateStatus('listening', 'Monitoring Voice...');
    };

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }

  readPageContent() {
    const mainEl = document.querySelector('main, #app, .main-wrapper, article') || document.body;
    const headings = Array.from(mainEl.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent.trim())
      .filter(Boolean)
      .slice(0, 4);

    let summary = `Page heading: ${document.title}. `;
    if (headings.length > 0) {
      summary += `Sections on this page include: ${headings.join('. ')}. `;
    }

    const firstParagraph = mainEl.querySelector('p');
    if (firstParagraph) {
      summary += `Overview: ${firstParagraph.textContent.trim().slice(0, 200)}.`;
    }

    summary += ` Say "Show Numbers" to navigate clickable items.`;
    this.speak(summary);
    this.showFeedback("Reading page summary aloud...", "info");
  }

  /* -------------------------------------------------------------
   * Audio Chimes (Web Audio API Synthesizer)
   * ----------------------------------------------------------- */
  playTone(frequency = 440, duration = 0.1, type = 'sine') {
    if (!this.soundEffectsEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // AudioContext could be blocked by autoplay policies until gesture
    }
  }

  /* -------------------------------------------------------------
   * DOM Construction & UI Feedback
   * ----------------------------------------------------------- */
  buildWidgetDOM() {
    // Avoid double injection
    if (document.getElementById('i2i-voice-widget-root')) return;

    const root = document.createElement('div');
    root.id = 'i2i-voice-widget-root';
    root.className = 'voice-widget-root';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Voice Navigation and Control Assistant');

    root.innerHTML = `
      <!-- Live Voice Feedback Card -->
      <div class="voice-feedback-card" id="voice-feedback-card" aria-live="polite">
        <div class="voice-feedback-header">
          <div class="voice-status-pill status-idle" id="voice-status-pill">
            <span class="voice-status-dot"></span>
            <span id="voice-status-text">Voice Idle</span>
          </div>
          <div class="voice-audio-bars" id="voice-audio-bars" title="Audio Activity">
            <span class="voice-audio-bar"></span>
            <span class="voice-audio-bar"></span>
            <span class="voice-audio-bar"></span>
            <span class="voice-audio-bar"></span>
            <span class="voice-audio-bar"></span>
          </div>
        </div>
        <div class="voice-transcript-text" id="voice-transcript-text">
          <span class="voice-transcript-interim">Say "Help" or click the mic to begin voice control.</span>
        </div>
        <div class="voice-action-result hidden" id="voice-action-result"></div>
      </div>

      <!-- Action Pill & Orb -->
      <div class="voice-bar-row">
        <div class="voice-quick-pill" id="voice-quick-pill">
          <button type="button" class="voice-quick-btn" id="voice-tags-btn" title="Show numbers on clickable items">
            🔢 Numbers
          </button>
          <button type="button" class="voice-quick-btn" id="voice-read-btn" title="Read page content aloud">
            🔊 Read
          </button>
          <button type="button" class="voice-quick-btn" id="voice-help-btn" title="Open Voice Commands list">
            ❓ Guide
          </button>
        </div>

        <button type="button" class="voice-orb-btn" id="voice-orb-btn" aria-label="Toggle Voice Control (Alt + V)" title="Voice Control &amp; Monitoring (Shortcut: Alt + V)">
          <span class="voice-orb-icon" id="voice-orb-icon">🎙️</span>
        </button>
      </div>

      <!-- Hidden ARIA live region for screen readers -->
      <div id="voice-aria-announcer" class="sr-only" aria-live="assertive" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);"></div>
    `;

    document.body.appendChild(root);
    this.buildHelpModalDOM();

    // Cache elements
    this.domElements = {
      root,
      card: document.getElementById('voice-feedback-card'),
      statusPill: document.getElementById('voice-status-pill'),
      statusText: document.getElementById('voice-status-text'),
      audioBars: document.getElementById('voice-audio-bars'),
      transcript: document.getElementById('voice-transcript-text'),
      actionResult: document.getElementById('voice-action-result'),
      orbBtn: document.getElementById('voice-orb-btn'),
      orbIcon: document.getElementById('voice-orb-icon'),
      tagsBtn: document.getElementById('voice-tags-btn'),
      readBtn: document.getElementById('voice-read-btn'),
      helpBtn: document.getElementById('voice-help-btn'),
      ariaAnnouncer: document.getElementById('voice-aria-announcer')
    };

    // Event Listeners
    this.domElements.orbBtn.addEventListener('click', () => this.toggleListening());
    this.domElements.tagsBtn.addEventListener('click', () => {
      if (this.isNumbersVisible) {
        this.hideNumberBadges();
        this.domElements.tagsBtn.classList.remove('active');
      } else {
        this.showNumberBadges();
        this.domElements.tagsBtn.classList.add('active');
      }
    });
    this.domElements.readBtn.addEventListener('click', () => this.readPageContent());
    this.domElements.helpBtn.addEventListener('click', () => this.openHelpModal());
  }

  buildHelpModalDOM() {
    if (document.getElementById('voice-help-modal-backdrop')) return;

    const modalBackdrop = document.createElement('div');
    modalBackdrop.id = 'voice-help-modal-backdrop';
    modalBackdrop.className = 'voice-modal-backdrop';
    modalBackdrop.setAttribute('role', 'dialog');
    modalBackdrop.setAttribute('aria-modal', 'true');
    modalBackdrop.setAttribute('aria-labelledby', 'voice-modal-title-text');

    modalBackdrop.innerHTML = `
      <div class="voice-modal">
        <div class="voice-modal-header">
          <div class="voice-modal-title" id="voice-modal-title-text">
            <span>🎙️</span>
            <span>Idea2Impact Voice Accessibility Guide</span>
          </div>
          <button type="button" class="voice-modal-close" id="voice-modal-close-btn" aria-label="Close Guide">✕</button>
        </div>
        <div class="voice-modal-body">
          <p style="color:#94A3B8; font-size:0.9rem; margin-bottom:8px;">
            Full hands-free voice control designed for users with motor, dexterity, or visual impairments. Speak naturally or use the commands below:
          </p>
          <div class="voice-command-grid">
            <div class="voice-cmd-category">
              <div class="voice-cmd-category-title"><span>🧭</span> Workspace Navigation</div>
              <ul class="voice-cmd-list">
                <li class="voice-cmd-item"><span class="voice-phrase">"Go to jobs"</span><span class="voice-desc">Open Match tab</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Go to skills"</span><span class="voice-desc">Skill Passport</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Open messages"</span><span class="voice-desc">Direct Chat</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Post job"</span><span class="voice-desc">HR Job Creator</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Switch to HR"</span><span class="voice-desc">Recruiter Mode</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Go to Roadmap"</span><span class="voice-desc">Skill Curriculum</span></li>
              </ul>
            </div>

            <div class="voice-cmd-category">
              <div class="voice-cmd-category-title"><span>🔢</span> Numbered Target Clicks</div>
              <ul class="voice-cmd-list">
                <li class="voice-cmd-item"><span class="voice-phrase">"Show numbers"</span><span class="voice-desc">Tag all buttons [1, 2, 3]</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Click [number]"</span><span class="voice-desc">e.g. "Click 5"</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Choose 2"</span><span class="voice-desc">Select item #2</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Hide numbers"</span><span class="voice-desc">Dismiss tags</span></li>
              </ul>
            </div>

            <div class="voice-cmd-category">
              <div class="voice-cmd-category-title"><span>🖱️</span> Direct Element Clicking</div>
              <ul class="voice-cmd-list">
                <li class="voice-cmd-item"><span class="voice-phrase">"Click Apply"</span><span class="voice-desc">Click Apply button</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Click Send"</span><span class="voice-desc">Send chat message</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Click Sign In"</span><span class="voice-desc">Submit Login form</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Click [button name]"</span><span class="voice-desc">Any visible button</span></li>
              </ul>
            </div>

            <div class="voice-cmd-category">
              <div class="voice-cmd-category-title"><span>⌨️</span> Typing &amp; Forms</div>
              <ul class="voice-cmd-list">
                <li class="voice-cmd-item"><span class="voice-phrase">"Type [text]"</span><span class="voice-desc">Write in active input</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Search for React"</span><span class="voice-desc">Find in search box</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Focus message"</span><span class="voice-desc">Focus chat input</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Clear"</span><span class="voice-desc">Erase input box</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Submit"</span><span class="voice-desc">Press Enter / submit</span></li>
              </ul>
            </div>

            <div class="voice-cmd-category">
              <div class="voice-cmd-category-title"><span>📜</span> Scrolling Viewport</div>
              <ul class="voice-cmd-list">
                <li class="voice-cmd-item"><span class="voice-phrase">"Scroll down"</span><span class="voice-desc">Smooth scroll down</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Scroll up"</span><span class="voice-desc">Smooth scroll up</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Scroll to top"</span><span class="voice-desc">Jump to top</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Scroll to bottom"</span><span class="voice-desc">Jump to bottom</span></li>
              </ul>
            </div>

            <div class="voice-cmd-category">
              <div class="voice-cmd-category-title"><span>🔊</span> Voice Reading &amp; Controls</div>
              <ul class="voice-cmd-list">
                <li class="voice-cmd-item"><span class="voice-phrase">"Read page"</span><span class="voice-desc">Aloud page overview</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Stop reading"</span><span class="voice-desc">Silence voice speech</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Pause voice"</span><span class="voice-desc">Pause microphone</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">Alt + V</span><span class="voice-desc">Keyboard mic shortcut</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="voice-modal-footer">
          <span>Press <strong>Alt + V</strong> anytime to toggle voice control.</span>
          <button type="button" class="btn btn-primary btn-sm" id="voice-modal-ok-btn" style="padding: 6px 16px;">Got It</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalBackdrop);

    const closeBtn = document.getElementById('voice-modal-close-btn');
    const okBtn = document.getElementById('voice-modal-ok-btn');
    closeBtn.addEventListener('click', () => this.closeHelpModal());
    okBtn.addEventListener('click', () => this.closeHelpModal());
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) this.closeHelpModal();
    });
  }

  openHelpModal() {
    const backdrop = document.getElementById('voice-help-modal-backdrop');
    if (backdrop) backdrop.classList.add('open');
  }

  closeHelpModal() {
    const backdrop = document.getElementById('voice-help-modal-backdrop');
    if (backdrop) backdrop.classList.remove('open');
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Alt + V to toggle voice
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        this.toggleListening();
      }
      // Escape closes modal or numbers
      if (e.key === 'Escape') {
        if (this.isNumbersVisible) {
          this.hideNumberBadges();
          if (this.domElements.tagsBtn) this.domElements.tagsBtn.classList.remove('active');
        }
        this.closeHelpModal();
      }
    });
  }

  updateStatus(state, text) {
    if (!this.domElements.statusPill) return;
    this.domElements.statusPill.className = `voice-status-pill status-${state}`;
    this.domElements.statusText.textContent = text;

    if (this.domElements.orbBtn) {
      this.domElements.orbBtn.classList.toggle('listening', state === 'listening');
      this.domElements.orbBtn.classList.toggle('speaking', state === 'speaking');
    }
    if (this.domElements.orbIcon) {
      if (state === 'listening') this.domElements.orbIcon.textContent = '🟢';
      else if (state === 'speaking') this.domElements.orbIcon.textContent = '🔊';
      else if (state === 'processing') this.domElements.orbIcon.textContent = '⚡';
      else this.domElements.orbIcon.textContent = '🎙️';
    }

    if (this.domElements.card) {
      this.domElements.card.classList.add('visible');
    }
  }

  showTranscript(text, isInterim = false) {
    if (!this.domElements.transcript) return;
    if (isInterim) {
      this.domElements.transcript.innerHTML = `<span class="voice-transcript-interim">“${text}...”</span>`;
    } else {
      this.domElements.transcript.innerHTML = `<strong>“${text}”</strong>`;
    }
    if (this.domElements.card) {
      this.domElements.card.classList.add('visible');
    }
  }

  showFeedback(message, type = 'info') {
    if (!this.domElements.actionResult) return;
    this.domElements.actionResult.className = `voice-action-result ${type}`;
    this.domElements.actionResult.innerHTML = `<span>${type === 'success' ? '✓' : type === 'warning' ? '⚠️' : 'ℹ️'}</span> <span>${message}</span>`;
    this.domElements.actionResult.classList.remove('hidden');

    if (this.domElements.card) {
      this.domElements.card.classList.add('visible');
    }

    this.announceAria(message);

    clearTimeout(this.feedbackTimeout);
    this.feedbackTimeout = setTimeout(() => {
      if (this.domElements.actionResult) {
        this.domElements.actionResult.classList.add('hidden');
      }
      if (!this.isListening && this.domElements.card) {
        this.domElements.card.classList.remove('visible');
      }
    }, 4500);
  }

  animateWaveBars(animating) {
    if (!this.domElements.audioBars) return;
    const bars = this.domElements.audioBars.querySelectorAll('.voice-audio-bar');
    bars.forEach(b => {
      b.classList.toggle('animating', animating);
      if (!animating) b.style.height = '4px';
    });
  }

  highlightElement(el) {
    if (!el) return;
    el.classList.add('voice-active-target');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    setTimeout(() => {
      el.classList.remove('voice-active-target');
    }, 2000);
  }

  announceAria(message) {
    if (this.domElements.ariaAnnouncer) {
      this.domElements.ariaAnnouncer.textContent = message;
    }
  }
}

// Global auto-initializer singleton
export let voiceAssistant = null;

export function initVoiceControl(options = {}) {
  if (!voiceAssistant) {
    voiceAssistant = new VoiceAccessibilitySystem(options);
    window.voiceAssistant = voiceAssistant;
  }
  return voiceAssistant;
}

// Automatically mount when loaded in browser environments
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initVoiceControl());
  } else {
    initVoiceControl();
  }
}
