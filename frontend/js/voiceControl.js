/**
 * Idea2Impact - Voice Monitoring & Voice Control Accessibility System
 * 
 * Empowers motor-impaired and keyboard/mouse disabled users to effortlessly 
 * navigate, interact, type, and control the entire Idea2Impact platform hands-free.
 * 
 * Supports both English and conversational Hindi / Hinglish commands with 
 * smart interim speech detection so user commands execute instantaneously.
 */

export class VoiceAccessibilitySystem {
  constructor(options = {}) {
    this.options = Object.assign({
      continuous: true,
      autoStart: false,
      speechFeedback: true,
      soundEffects: true,
      lang: 'en-IN' // Supports English with Indian accent / Hinglish naturally
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
    this.interimDebounceTimer = null;
    this.lastExecutedPhrase = '';
    this.lastExecutedTimestamp = 0;
    this.domElements = {};

    this.init();
  }

  init() {
    this.buildWidgetDOM();
    this.makeWidgetDraggable();
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
      this.recognition.maxAlternatives = 3;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateStatus('listening', 'Monitoring Voice...');
        this.playTone(520, 0.12, 'sine');
        this.animateWaveBars(true);
        this.announceAria('Voice monitoring active. Listening for commands.');
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

        // Show live transcription immediately
        if (interimTranscript) {
          this.showTranscript(interimTranscript, true);

          // Fast interim execution: don't make user wait 3-5 seconds for browser to trigger isFinal!
          // Debounce 900ms after user stops uttering interim words, then auto-execute.
          clearTimeout(this.interimDebounceTimer);
          const candidateText = interimTranscript.trim();
          if (candidateText.length >= 2) {
            this.interimDebounceTimer = setTimeout(() => {
              if (this.isListening && candidateText) {
                this.executeIfNew(candidateText);
              }
            }, 950);
          }
        }

        if (finalTranscript) {
          clearTimeout(this.interimDebounceTimer);
          const cleanText = finalTranscript.trim();
          this.showTranscript(cleanText, false);
          this.executeIfNew(cleanText);
        }
      };

      this.recognition.onerror = (event) => {
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

  executeIfNew(phrase) {
    if (!phrase) return;
    const now = Date.now();
    const normalized = phrase.toLowerCase().trim().replace(/[.,!?;:]/g, '');

    // Avoid double execution within 2 seconds for exact same phrase
    if (this.lastExecutedPhrase === normalized && (now - this.lastExecutedTimestamp) < 2200) {
      return;
    }

    this.lastExecutedPhrase = normalized;
    this.lastExecutedTimestamp = now;
    this.handleCommand(phrase);
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
    clearTimeout(this.interimDebounceTimer);
    try {
      if (this.recognition) this.recognition.stop();
    } catch (e) {}
    this.updateStatus('idle', 'Voice Paused');
    this.animateWaveBars(false);
    this.announceAria('Voice monitoring paused.');
  }

  /* -------------------------------------------------------------
   * Command Interpretation & Action Dispatcher
   * (Supports English + Hinglish / Conversational Natural Language)
   * ----------------------------------------------------------- */
  handleCommand(phrase) {
    if (!phrase) return;
    const lower = phrase.toLowerCase().trim().replace(/[.,!?;:]/g, '');
    this.updateStatus('processing', 'Executing...');

    // 1. Conversational Queries ("Kya karna hai", "What to do", "Help", "Kaise chalega")
    if (this.isHelpOrGuidanceQuery(lower)) {
      this.openHelpModal();
      this.speak("You can say: Open jobs, Scroll down, Show numbers, or Send message. Opening guide.");
      this.showFeedback("Say 'Jobs', 'Scroll down', 'Show numbers', or 'Read page'.", "success");
      this.updateStatus('listening', 'Monitoring Voice...');
      return;
    }

    // 2. Number Tags Mode / Spoken Numbers
    // Checks "1", "2", "ek", "do", "click 3", "chuno 4"
    const numberMatched = this.parseSpokenNumber(lower);
    if (numberMatched !== null) {
      const handled = this.clickElementByNumber(numberMatched);
      if (handled) return;
    }

    // 3. Show / Hide Numbers overlay
    if (this.hasKeywords(lower, ['show numbers', 'numbers', 'tag', 'tags', 'badges', 'tag lagao', 'number dikhao', 'kya click'])) {
      this.showNumberBadges();
      this.speak("Showing numbers. Say any number to click it.");
      this.showFeedback("Numbered targets shown! Say '1', '2', 'Click 3' to activate.", "success");
      this.updateStatus('listening', 'Monitoring Voice...');
      return;
    }

    if (this.hasKeywords(lower, ['hide numbers', 'clear numbers', 'tag hatao', 'number hatao', 'hatao tags'])) {
      this.hideNumberBadges();
      this.speak("Hiding numbers.");
      this.showFeedback("Numbers hidden.", "info");
      this.updateStatus('listening', 'Monitoring Voice...');
      return;
    }

    // 4. Voice Widget Repositioning by Voice ("move to top", "move left", "reset position", etc.)
    if (this.tryWidgetMoveCommand(lower)) {
      return;
    }

    // 5. Viewport Scrolling (English & Hindi)
    if (this.tryScrollCommand(lower)) {
      return;
    }

    // 5. Navigation Commands (Tabs, Workspaces, Pages)
    if (this.tryNavigationCommand(lower)) {
      return;
    }

    // 6. Typing & Form Input ("type hello", "likho message", "search React")
    if (this.tryTypingCommand(lower, phrase)) {
      return;
    }

    // 7. Direct Click Commands ("click send", "bhejo", "click apply", "login karo")
    if (this.tryClickCommand(lower)) {
      return;
    }

    // 8. Screen Reading / Read Aloud
    if (this.hasKeywords(lower, ['read page', 'read', 'padho', 'sunao', 'padh ke batao', 'bol ke batao', 'read summary'])) {
      this.readPageContent();
      return;
    }

    if (this.hasKeywords(lower, ['stop reading', 'stop', 'quiet', 'silence', 'chup', 'ruko', 'ruk jao', 'band karo'])) {
      this.stopSpeaking();
      this.showFeedback("Speech audio silenced.", "info");
      this.updateStatus('listening', 'Monitoring Voice...');
      return;
    }

    // 9. Close Modal / Dialog
    if (this.hasKeywords(lower, ['close', 'close modal', 'cancel', 'dismiss', 'escape', 'hatao modal', 'band'])) {
      this.closeHelpModal();
      this.speak("Closed.");
      this.showFeedback("Modal closed", "info");
      this.updateStatus('listening', 'Monitoring Voice...');
      return;
    }

    // 10. Pause Voice Control
    if (this.hasKeywords(lower, ['pause voice', 'stop listening', 'mute mic', 'sleep', 'so jao'])) {
      this.speak("Pausing voice monitoring.");
      this.stopListening();
      return;
    }

    // 11. Smart Content Fallback: Does the spoken phrase contain any button or link text?
    if (this.tryFuzzyButtonClick(lower)) {
      return;
    }

    // Unrecognized phrase
    this.updateStatus('listening', 'Monitoring Voice...');
    this.showFeedback(`Heard: "${phrase}". Say "Kya karna hai" or "Help" for actions.`, 'warning');
  }

  isHelpOrGuidanceQuery(text) {
    const helpPhrases = [
      'kya karna hai', 'kya kare', 'kya kar sakte hai', 'kya karu', 
      'kaise chalega', 'kaise use kare', 'kya bolu', 'kya bole',
      'help', 'guide', 'what to do', 'what can i do', 'how to use',
      'commands', 'show commands', 'what can i say'
    ];
    return helpPhrases.some(hp => text.includes(hp));
  }

  hasKeywords(text, keywords) {
    return keywords.some(kw => text.includes(kw));
  }

  /* -------------------------------------------------------------
   * Navigation Handler (English + Hindi/Hinglish)
   * ----------------------------------------------------------- */
  tryNavigationCommand(lower) {
    // 1. Analyze & Match / Jobs tab
    if (this.hasKeywords(lower, ['job', 'jobs', 'naukri', 'analyze', 'match', 'roles'])) {
      this.navigateToTab('jobs');
      return true;
    }

    // 2. Competencies / Skill Passport tab
    if (this.hasKeywords(lower, ['competenc', 'skill', 'passport', 'hunar', 'certificate'])) {
      this.navigateToTab('competencies');
      return true;
    }

    // 3. Applied Roles tab
    if (this.hasKeywords(lower, ['applied', 'application', 'apply kiya'])) {
      this.navigateToTab('applications');
      return true;
    }

    // 4. HR Messages tab (Candidate view)
    if (this.hasKeywords(lower, ['hr message', 'message hr', 'hr se baat', 'recruiter message'])) {
      this.navigateToTab('hr-messages');
      return true;
    }

    // 5. Candidate Messages tab (HR view)
    if (this.hasKeywords(lower, ['candidate message', 'candidate chat', 'messages with candidate'])) {
      this.navigateToTab('candidate-messages');
      return true;
    }

    // Generic Message / Chat (works in both Candidate & HR mode)
    if (this.hasKeywords(lower, ['message', 'messages', 'chat', 'inbox', 'baat karo', 'khat'])) {
      const activeRole = this.getActiveRole();
      if (activeRole === 'hr') {
        this.navigateToTab('candidate-messages');
      } else {
        this.navigateToTab('hr-messages');
      }
      return true;
    }

    // 6. Meet with HR tab
    if (this.hasKeywords(lower, ['meet', 'interview', 'video call', 'meeting', 'mulaqat'])) {
      this.navigateToTab('meet-hr');
      return true;
    }

    // 7. Executive Dashboard / Overview (HR mode)
    if (this.hasKeywords(lower, ['overview', 'executive', 'dashboard pe', 'main dashboard'])) {
      this.navigateToTab('overview');
      return true;
    }

    // 8. Create Job / Post Job (HR mode)
    if (this.hasKeywords(lower, ['post job', 'create job', 'nayi job', 'job post', 'job banao'])) {
      this.navigateToTab('create-job');
      return true;
    }

    // 9. Candidates / Dossier (HR mode)
    if (this.hasKeywords(lower, ['candidate', 'candidates', 'talent', 'dossier', 'ummeedwar'])) {
      this.navigateToTab('candidates');
      return true;
    }

    // 10. Interviews / Offers (HR mode)
    if (this.hasKeywords(lower, ['offer', 'offers', 'pipeline'])) {
      this.navigateToTab('interviews');
      return true;
    }

    // 11. External Pages
    if (this.hasKeywords(lower, ['home', 'landing', 'homepage', 'ghar'])) {
      this.speak("Navigating to Home.");
      this.showFeedback("Opening Home page...", "success");
      setTimeout(() => { window.location.href = 'index.html'; }, 500);
      return true;
    }

    if (this.hasKeywords(lower, ['roadmap', 'learning', 'curriculum', 'padhai'])) {
      this.speak("Navigating to Skill Roadmap.");
      this.showFeedback("Opening Roadmap...", "success");
      setTimeout(() => { window.location.href = 'roadmap.html'; }, 500);
      return true;
    }

    if (this.hasKeywords(lower, ['login', 'sign in', 'portal', 'khata'])) {
      this.speak("Navigating to Login.");
      this.showFeedback("Opening Login...", "success");
      setTimeout(() => { window.location.href = 'login.html'; }, 500);
      return true;
    }

    // 12. Mode switching
    if (this.hasKeywords(lower, ['candidate mode', 'switch to candidate', 'candidate bano'])) {
      this.switchRole('candidate');
      return true;
    }
    if (this.hasKeywords(lower, ['hr mode', 'recruiter mode', 'switch to hr', 'recruiter bano'])) {
      this.switchRole('hr');
      return true;
    }

    // 13. Logout
    if (this.hasKeywords(lower, ['logout', 'sign out', 'log out', 'band karo session'])) {
      this.speak("Signing out.");
      const logoutBtn = Array.from(document.querySelectorAll('button, a')).find(el => /sign\s*out|log\s*out/i.test(el.textContent));
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

  getActiveRole() {
    if (window.state && window.state.currentRole) return window.state.currentRole;
    return sessionStorage.getItem('i2i_role') || localStorage.getItem('i2i_role') || 'candidate';
  }

  navigateToTab(tabKey) {
    const navLink = document.querySelector(`[data-tab="${tabKey}"]`);
    if (navLink) {
      navLink.click();
      const tabName = navLink.textContent.trim() || tabKey;
      this.speak(`Opened ${tabName}`);
      this.showFeedback(`✓ Navigated to: ${tabName}`, 'success');
      this.playTone(660, 0.1, 'sine');
      this.updateStatus('listening', 'Monitoring Voice...');
      return;
    }

    // Try state.js singleton
    if (window.state && typeof window.state.setTab === 'function') {
      window.state.setTab(tabKey);
      this.speak(`Switched tab to ${tabKey}`);
      this.showFeedback(`✓ Switched tab: ${tabKey}`, 'success');
      this.updateStatus('listening', 'Monitoring Voice...');
      return;
    }

    this.showFeedback(`Tab "${tabKey}" is not currently in this view.`, 'warning');
    this.updateStatus('listening', 'Monitoring Voice...');
  }

  switchRole(role) {
    const roleChip = document.querySelector(`[data-role="${role}"], .role-chip[data-role="${role}"]`);
    if (roleChip) {
      roleChip.click();
      this.speak(`Switched mode to ${role}`);
      this.showFeedback(`✓ Switched mode: ${role.toUpperCase()}`, 'success');
    } else if (window.state && typeof window.state.setRole === 'function') {
      window.state.setRole(role);
      this.speak(`Switched mode to ${role}`);
      this.showFeedback(`✓ Switched mode: ${role.toUpperCase()}`, 'success');
    } else {
      this.showFeedback(`Cannot switch to ${role} from current view.`, 'warning');
    }
    this.updateStatus('listening', 'Monitoring Voice...');
  }

  /* -------------------------------------------------------------
   * Viewport Scrolling (English + Hindi)
   * ----------------------------------------------------------- */
  tryScrollCommand(lower) {
    // Scroll Down
    if (this.hasKeywords(lower, ['scroll down', 'down', 'niche', 'niche jao', 'niche scroll', 'page down'])) {
      window.scrollBy({ top: 480, behavior: 'smooth' });
      this.showFeedback('↓ Scrolled down', 'info');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }

    // Scroll Up
    if (this.hasKeywords(lower, ['scroll up', 'up', 'upar', 'uupor', 'upar jao', 'upar scroll', 'page up'])) {
      window.scrollBy({ top: -480, behavior: 'smooth' });
      this.showFeedback('↑ Scrolled up', 'info');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }

    // Scroll to Top
    if (this.hasKeywords(lower, ['scroll to top', 'top', 'sabse upar', 'shuruat'])) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.showFeedback('↑ Scrolled to top', 'info');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }

    // Scroll to Bottom
    if (this.hasKeywords(lower, ['scroll to bottom', 'bottom', 'sabse niche', 'aakhri'])) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      this.showFeedback('↓ Scrolled to bottom', 'info');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }

    return false;
  }

  /* -------------------------------------------------------------
   * Voice Widget Repositioning by Voice (English + Hindi)
   * ----------------------------------------------------------- */
  tryWidgetMoveCommand(lower) {
    if (this.hasKeywords(lower, ['move top', 'move to top', 'widget top', 'upar karo widget', 'upar le jao widget', 'upar shift'])) {
      this.moveWidgetTo('top-right');
      this.showFeedback('↗ Moved voice widget to top', 'success');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }
    if (this.hasKeywords(lower, ['move bottom', 'move to bottom', 'widget bottom', 'niche karo widget', 'niche le jao widget', 'niche shift'])) {
      this.moveWidgetTo('bottom-right');
      this.showFeedback('↘ Moved voice widget to bottom', 'success');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }
    if (this.hasKeywords(lower, ['move left', 'move to left', 'widget left', 'left karo widget', 'baaye karo widget'])) {
      this.moveWidgetTo('bottom-left');
      this.showFeedback('↙ Moved voice widget to left', 'success');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }
    if (this.hasKeywords(lower, ['move right', 'move to right', 'widget right', 'right karo widget', 'daaye karo widget'])) {
      this.moveWidgetTo('bottom-right');
      this.showFeedback('↘ Moved voice widget to right', 'success');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }
    if (this.hasKeywords(lower, ['reset position', 'reset widget', 'wapas lagao', 'widget reset', 'default position'])) {
      this.moveWidgetTo('reset');
      this.showFeedback('↺ Reset voice widget position', 'success');
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }
    return false;
  }

  /* -------------------------------------------------------------
   * Typing & Form Input Handler
   * ----------------------------------------------------------- */
  tryTypingCommand(lower, rawPhrase) {
    // "type [text]", "likho [text]", "enter [text]"
    const typeMatch = rawPhrase.match(/^(?:type|likho|enter|write)\s+(.+)$/i);
    if (typeMatch) {
      const textToType = typeMatch[1];
      this.typeTextIntoActiveElement(textToType);
      return true;
    }

    // "search for [query]", "dhoondo [query]"
    const searchMatch = rawPhrase.match(/^(?:search(?:\s+for)?|dhoondo)\s+(.+)$/i);
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
        
        const enterEvt = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });
        searchInput.dispatchEvent(enterEvt);
        this.updateStatus('listening', 'Monitoring Voice...');
        return true;
      }
    }

    // "focus message", "focus chat", "message [text]"
    if (lower.startsWith('focus message') || lower.startsWith('focus chat') || lower.startsWith('message ')) {
      const chatInput = document.querySelector('#chat-input, textarea[placeholder*="message" i], input[placeholder*="message" i], textarea');
      if (chatInput) {
        chatInput.focus();
        if (lower.startsWith('message ')) {
          const content = rawPhrase.slice(8);
          this.typeTextIntoActiveElement(content);
        } else {
          this.showFeedback('Chat input focused. Say "Type [text]" to write.', 'info');
        }
        this.updateStatus('listening', 'Monitoring Voice...');
        return true;
      }
    }

    // Send Message / Bhejo
    if (this.hasKeywords(lower, ['send', 'bhejo', 'send message', 'message bhejo', 'submit message'])) {
      const sendBtn = document.querySelector('#chat-send-btn, button[id*="send" i], button.chat-send-btn') ||
                      Array.from(document.querySelectorAll('button')).find(b => /send|bhejo/i.test(b.textContent));
      if (sendBtn) {
        sendBtn.click();
        this.speak("Message sent.");
        this.showFeedback("✓ Message Sent!", "success");
        this.playTone(880, 0.1, 'sine');
        this.updateStatus('listening', 'Monitoring Voice...');
        return true;
      }
    }

    // Clear input
    if (this.hasKeywords(lower, ['clear', 'erase', 'saf karo', 'hatao text'])) {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        activeEl.value = '';
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        activeEl.dispatchEvent(new Event('change', { bubbles: true }));
        this.showFeedback("Cleared input text", "info");
        this.updateStatus('listening', 'Monitoring Voice...');
        return true;
      }
    }

    // Submit / Press Enter
    if (this.hasKeywords(lower, ['submit', 'press enter', 'enter karo', 'dakhil karo'])) {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.form) {
        activeEl.form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        this.showFeedback("Submitted form", "success");
        this.updateStatus('listening', 'Monitoring Voice...');
        return true;
      }
      const submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        submitBtn.click();
        this.showFeedback("Submitted form", "success");
        this.updateStatus('listening', 'Monitoring Voice...');
        return true;
      }
    }

    return false;
  }

  typeTextIntoActiveElement(text) {
    let target = document.activeElement;
    
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
      this.showFeedback('No input field focused. Click an input or say "Focus message".', 'warning');
      this.updateStatus('listening', 'Monitoring Voice...');
    }
  }

  /* -------------------------------------------------------------
   * Direct Clicking by Name / Text
   * ----------------------------------------------------------- */
  tryClickCommand(lower) {
    const clickMatch = lower.match(/^(?:click|press|select|open|tap|chuno|daba)(?:\s+on|\s+pe)?\s+(.+)$/);
    if (!clickMatch) return false;

    const targetLabel = clickMatch[1].trim();
    return this.clickMatchingElement(targetLabel);
  }

  tryFuzzyButtonClick(lower) {
    // If user mentions a notable button name, auto click it
    const candidateButtons = Array.from(document.querySelectorAll(
      'button, a, input[type="button"], input[type="submit"], [role="button"], .btn'
    )).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
    });

    for (const btn of candidateButtons) {
      const txt = (btn.textContent || '').trim().toLowerCase();
      if (txt.length >= 3 && lower.includes(txt)) {
        this.highlightElement(btn);
        btn.click();
        this.speak(`Clicked ${txt}`);
        this.showFeedback(`✓ Clicked: "${txt}"`, 'success');
        this.playTone(740, 0.1, 'sine');
        this.updateStatus('listening', 'Monitoring Voice...');
        return true;
      }
    }
    return false;
  }

  clickMatchingElement(targetLabel) {
    const candidates = Array.from(document.querySelectorAll(
      'button, a, input[type="button"], input[type="submit"], [role="button"], label, .role-chip, .tab-chip, .mobile-tab-chip, .nav-link'
    )).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
    });

    let bestEl = null;
    let bestScore = 0;

    for (const el of candidates) {
      const text = (el.textContent || '').trim().toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const val = (el.value || '').toLowerCase();
      const id = (el.id || '').toLowerCase();

      if (text === targetLabel || ariaLabel === targetLabel || val === targetLabel) {
        bestEl = el;
        bestScore = 100;
        break;
      }

      if (text.startsWith(targetLabel) || ariaLabel.startsWith(targetLabel)) {
        if (bestScore < 80) { bestEl = el; bestScore = 80; }
      }

      if (text.includes(targetLabel) || ariaLabel.includes(targetLabel) || id.includes(targetLabel)) {
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

    this.showFeedback(`Could not find "${targetLabel}". Say "Show numbers" to see all targets.`, 'warning');
    this.updateStatus('listening', 'Monitoring Voice...');
    return false;
  }

  /* -------------------------------------------------------------
   * Vimium Number Badges (Hands-Free Accessibility)
   * ----------------------------------------------------------- */
  showNumberBadges() {
    this.hideNumberBadges();

    const elements = Array.from(document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"]), .role-chip, .nav-link, .mobile-tab-chip'
    )).filter(el => {
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
    if (this.domElements.tagsBtn) this.domElements.tagsBtn.classList.add('active');
  }

  hideNumberBadges() {
    this.numberBadges.forEach(item => {
      if (item.badgeEl && item.badgeEl.parentNode) {
        item.badgeEl.parentNode.removeChild(item.badgeEl);
      }
    });
    this.numberBadges = [];
    this.isNumbersVisible = false;
    if (this.domElements.tagsBtn) this.domElements.tagsBtn.classList.remove('active');
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
      this.showFeedback(`✓ Activated [${num}]: ${(match.element.textContent || 'Element').trim().slice(0, 24)}`, 'success');
      this.playTone(800, 0.1, 'triangle');
      setTimeout(() => this.hideNumberBadges(), 1200);
      this.updateStatus('listening', 'Monitoring Voice...');
      return true;
    }
    return false;
  }

  parseSpokenNumber(text) {
    // English + Hindi spoken numbers
    const wordNumbers = {
      'zero': 0, 'shunya': 0,
      'one': 1, 'ek': 1,
      'two': 2, 'do': 2,
      'three': 3, 'teen': 3,
      'four': 4, 'char': 4,
      'five': 5, 'panch': 5,
      'six': 6, 'chhe': 6, 'che': 6,
      'seven': 7, 'saat': 7,
      'eight': 8, 'aath': 8,
      'nine': 9, 'nau': 9,
      'ten': 10, 'dus': 10,
      'eleven': 11, 'gyarah': 11,
      'twelve': 12, 'barah': 12,
      'thirteen': 13, 'terah': 13,
      'fourteen': 14, 'chaudah': 14,
      'fifteen': 15, 'pandrah': 15,
      'sixteen': 16, 'solah': 16,
      'seventeen': 17, 'satrah': 17,
      'eighteen': 18, 'atharah': 18,
      'nineteen': 19, 'unnis': 19,
      'twenty': 20, 'bees': 20
    };

    // If it's a direct digit or "click 3"
    const digitsMatch = text.match(/\b\d+\b/);
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
      summary += `Sections include: ${headings.join('. ')}. `;
    }

    const firstParagraph = mainEl.querySelector('p');
    if (firstParagraph) {
      summary += `Overview: ${firstParagraph.textContent.trim().slice(0, 200)}.`;
    }

    summary += ` Say "Show Numbers" to navigate clickable targets.`;
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
    } catch (e) {}
  }

  /* -------------------------------------------------------------
   * DOM Construction & UI Feedback
   * ----------------------------------------------------------- */
  buildWidgetDOM() {
    if (document.getElementById('i2i-voice-widget-root')) return;

    const root = document.createElement('div');
    root.id = 'i2i-voice-widget-root';
    root.className = 'voice-widget-root';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Voice Navigation and Control Assistant');

    root.innerHTML = `
      <!-- Live Voice Feedback Card (Draggable) -->
      <div class="voice-feedback-card visible" id="voice-feedback-card" aria-live="polite" title="Drag to move anywhere on screen">
        <div class="voice-feedback-header voice-drag-handle" id="voice-card-drag-handle" title="Click and drag to move Voice Control">
          <div class="voice-status-pill status-idle" id="voice-status-pill">
            <span class="voice-status-dot"></span>
            <span id="voice-status-text">Voice Ready</span>
          </div>
          <div class="voice-drag-cue" title="Click and drag to move Voice Control">
            <span class="voice-drag-dots">⠿</span>
            <span>DRAG</span>
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
          <span class="voice-transcript-interim">Say "Jobs", "Scroll down", or "Kya karna hai"</span>
        </div>
        <div class="voice-action-result hidden" id="voice-action-result"></div>
      </div>

      <!-- Action Pill & Orb -->
      <div class="voice-bar-row">
        <div class="voice-quick-pill" id="voice-quick-pill" title="Drag to move Voice Control">
          <span class="voice-pill-drag-grip" id="voice-pill-drag-grip" title="Click and drag to move Voice Control">⠿</span>
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

      <div id="voice-aria-announcer" class="sr-only" aria-live="assertive" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);"></div>
    `;

    document.body.appendChild(root);
    this.buildHelpModalDOM();

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

    this.domElements.orbBtn.addEventListener('click', () => this.toggleListening());
    this.domElements.tagsBtn.addEventListener('click', () => {
      if (this.isNumbersVisible) {
        this.hideNumberBadges();
      } else {
        this.showNumberBadges();
      }
    });
    this.domElements.readBtn.addEventListener('click', () => this.readPageContent());
    this.domElements.helpBtn.addEventListener('click', () => this.openHelpModal());
  }

  /* -------------------------------------------------------------
   * Draggable Widget Capability (Free-floating Anywhere on Screen)
   * ----------------------------------------------------------- */
  makeWidgetDraggable() {
    const root = this.domElements.root;
    if (!root) return;

    const clampX = (x) => {
      const w = root.offsetWidth || 340;
      const maxX = Math.max(0, window.innerWidth - w - 12);
      return Math.min(Math.max(12, x), maxX);
    };

    const clampY = (y) => {
      const h = root.offsetHeight || 130;
      const maxY = Math.max(0, window.innerHeight - h - 12);
      return Math.min(Math.max(12, y), maxY);
    };

    // Restore saved position from localStorage
    try {
      const rawPos = localStorage.getItem('i2i_voice_widget_pos');
      if (rawPos) {
        const pos = JSON.parse(rawPos);
        if (typeof pos.x === 'number' && typeof pos.y === 'number') {
          requestAnimationFrame(() => {
            root.style.left = `${clampX(pos.x)}px`;
            root.style.top = `${clampY(pos.y)}px`;
            root.style.right = 'auto';
            root.style.bottom = 'auto';
          });
        }
      }
    } catch (e) {}

    // Maintain within screen bounds when window is resized
    window.addEventListener('resize', () => {
      if (root.style.left && root.style.left !== 'auto') {
        const currentX = parseInt(root.style.left, 10);
        const currentY = parseInt(root.style.top, 10);
        root.style.left = `${clampX(currentX)}px`;
        root.style.top = `${clampY(currentY)}px`;
      }
    });

    // Drag tracking variables
    let isDragging = false;
    let hasMoved = false;
    let startPointerX = 0;
    let startPointerY = 0;
    let startWidgetLeft = 0;
    let startWidgetTop = 0;

    const onPointerDown = (e) => {
      // Only primary mouse button or touch
      if (e.button && e.button !== 0) return;

      // Do not initiate drag when clicking actionable buttons, inputs, links
      if (e.target.closest('button')) {
        return;
      }
      if (e.target.closest('input') || e.target.closest('a')) {
        return;
      }

      const rect = root.getBoundingClientRect();
      startWidgetLeft = rect.left;
      startWidgetTop = rect.top;
      startPointerX = e.clientX;
      startPointerY = e.clientY;
      isDragging = true;
      hasMoved = false;

      // Switch to explicit left/top in px before moving
      root.style.left = `${startWidgetLeft}px`;
      root.style.top = `${startWidgetTop}px`;
      root.style.right = 'auto';
      root.style.bottom = 'auto';

      document.addEventListener('pointermove', onPointerMove, { passive: false });
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startPointerX;
      const deltaY = e.clientY - startPointerY;

      if (!hasMoved && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
        hasMoved = true;
        root.classList.add('is-dragging');
      }

      if (hasMoved) {
        e.preventDefault();
        const nextX = clampX(startWidgetLeft + deltaX);
        const nextY = clampY(startWidgetTop + deltaY);
        root.style.left = `${nextX}px`;
        root.style.top = `${nextY}px`;
      }
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;

      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);

      if (hasMoved) {
        root.classList.remove('is-dragging');
        const rect = root.getBoundingClientRect();
        try {
          localStorage.setItem('i2i_voice_widget_pos', JSON.stringify({
            x: Math.round(rect.left),
            y: Math.round(rect.top)
          }));
        } catch (err) {}
      } else {
        root.classList.remove('is-dragging');
      }
    };

    // Attach listeners to draggable areas: feedback card and quick pill
    if (this.domElements.card) {
      this.domElements.card.addEventListener('pointerdown', onPointerDown);
    }
    const quickPill = root.querySelector('#voice-quick-pill');
    if (quickPill) {
      quickPill.addEventListener('pointerdown', onPointerDown);
    }
  }

  moveWidgetTo(position) {
    const root = this.domElements.root;
    if (!root) return;
    const w = root.offsetWidth || 340;
    const h = root.offsetHeight || 130;
    let targetX = 24;
    let targetY = 24;

    switch (position) {
      case 'top-left':
        targetX = 24;
        targetY = 24;
        break;
      case 'top-right':
        targetX = window.innerWidth - w - 24;
        targetY = 24;
        break;
      case 'bottom-left':
        targetX = 24;
        targetY = window.innerHeight - h - 24;
        break;
      case 'bottom-right':
      case 'reset':
      default:
        targetX = window.innerWidth - w - 24;
        targetY = window.innerHeight - h - 24;
        break;
    }

    root.style.transition = 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
    root.style.left = `${targetX}px`;
    root.style.top = `${targetY}px`;
    root.style.right = 'auto';
    root.style.bottom = 'auto';

    setTimeout(() => {
      root.style.transition = '';
    }, 400);

    try {
      localStorage.setItem('i2i_voice_widget_pos', JSON.stringify({ x: Math.round(targetX), y: Math.round(targetY) }));
    } catch(e) {}
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
            <span>Idea2Impact Voice Accessibility Guide (English &amp; Hinglish)</span>
          </div>
          <button type="button" class="voice-modal-close" id="voice-modal-close-btn" aria-label="Close Guide">✕</button>
        </div>
        <div class="voice-modal-body">
          <p style="color:#94A3B8; font-size:0.9rem; margin-bottom:8px;">
            Hands-free voice control designed for motor-impaired and keyboard/mouse disabled users. Speak in English, Hindi, or conversational Hinglish:
          </p>
          <div class="voice-command-grid">
            <div class="voice-cmd-category">
              <div class="voice-cmd-category-title"><span>🧭</span> Workspace Navigation</div>
              <ul class="voice-cmd-list">
                <li class="voice-cmd-item"><span class="voice-phrase">"Jobs" / "Jobs kholo"</span><span class="voice-desc">Open Match tab</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Skills" / "Skills dikhao"</span><span class="voice-desc">Skill Passport</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Messages" / "Chat kholo"</span><span class="voice-desc">Direct Messaging</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Meet" / "Interview call"</span><span class="voice-desc">Video Meeting</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Post job" / "Nayi job"</span><span class="voice-desc">Post 75/25 Job</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Roadmap" / "Learning"</span><span class="voice-desc">Skill Roadmap</span></li>
              </ul>
            </div>

            <div class="voice-cmd-category">
              <div class="voice-cmd-category-title"><span>🔢</span> Numbered Target Clicks</div>
              <ul class="voice-cmd-list">
                <li class="voice-cmd-item"><span class="voice-phrase">"Show numbers" / "Tag lagao"</span><span class="voice-desc">Tag all buttons [1, 2, 3]</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"1" / "Ek" / "Click 1"</span><span class="voice-desc">Click item #1</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"5" / "Panch" / "Click 5"</span><span class="voice-desc">Click item #5</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Hide numbers" / "Tag hatao"</span><span class="voice-desc">Dismiss tags</span></li>
              </ul>
            </div>

            <div class="voice-cmd-category">
              <div class="voice-cmd-category-title"><span>📜</span> Scrolling Viewport</div>
              <ul class="voice-cmd-list">
                <li class="voice-cmd-item"><span class="voice-phrase">"Scroll down" / "Niche jao"</span><span class="voice-desc">Scroll down</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Scroll up" / "Upar jao"</span><span class="voice-desc">Scroll up</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Scroll to top" / "Sabse upar"</span><span class="voice-desc">Jump to top</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Scroll to bottom"</span><span class="voice-desc">Jump to bottom</span></li>
              </ul>
            </div>

            <div class="voice-cmd-category">
              <div class="voice-cmd-category-title"><span>⌨️</span> Typing &amp; Messages</div>
              <ul class="voice-cmd-list">
                <li class="voice-cmd-item"><span class="voice-phrase">"Type [text]" / "Likho [text]"</span><span class="voice-desc">Type in active field</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Send" / "Bhejo"</span><span class="voice-desc">Send chat message</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Search for Python"</span><span class="voice-desc">Find in search box</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Clear" / "Hatao"</span><span class="voice-desc">Clear field text</span></li>
              </ul>
            </div>

            <div class="voice-cmd-category">
              <div class="voice-cmd-category-title"><span>🖱️</span> Direct Element Clicking</div>
              <ul class="voice-cmd-list">
                <li class="voice-cmd-item"><span class="voice-phrase">"Click Apply"</span><span class="voice-desc">Apply button</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Click Sign In"</span><span class="voice-desc">Login button</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Click [Button Name]"</span><span class="voice-desc">Any visible button</span></li>
              </ul>
            </div>

            <div class="voice-cmd-category">
              <div class="voice-cmd-category-title"><span>🔊</span> Voice Reading &amp; Help</div>
              <ul class="voice-cmd-list">
                <li class="voice-cmd-item"><span class="voice-phrase">"Kya karna hai" / "Help"</span><span class="voice-desc">Voice instructions</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Move to top" / "Move left"</span><span class="voice-desc">Reposition widget</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Reset position"</span><span class="voice-desc">Reset bottom-right</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Read page" / "Padho"</span><span class="voice-desc">Read summary aloud</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">"Stop" / "Ruko"</span><span class="voice-desc">Stop voice speech</span></li>
                <li class="voice-cmd-item"><span class="voice-phrase">Alt + V</span><span class="voice-desc">Mic toggle shortcut</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="voice-modal-footer">
          <span>Press <strong>Alt + V</strong> anytime or say <strong>"Kya karna hai"</strong> for assistance.</span>
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
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        this.toggleListening();
      }
      if (e.key === 'Escape') {
        if (this.isNumbersVisible) {
          this.hideNumberBadges();
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
    }, 5000);
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

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initVoiceControl());
  } else {
    initVoiceControl();
  }
}
