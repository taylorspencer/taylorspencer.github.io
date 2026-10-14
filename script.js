// RobCo TERMLINK — Phase 2: navigation + typing engine
//
// The whole site is one page. Each terminal "screen" (main menu, whoami,
// projects, contact) is a <section> in index.html, and only one is visible
// at a time. Phase 1 built the screen swapping; Phase 2 adds the typing
// engine that makes text arrive character by character, like a real
// terminal printing to a CRT. The command input arrives in a later phase.

"use strict";

/* ------------------------------------------------------------
   TYPING ENGINE
   One reusable function reveals text one character at a time.
   Everything that types on this site — boot log, header,
   section text — goes through here, so behavior like
   click-to-skip and reduced-motion stays consistent site-wide.
   ------------------------------------------------------------ */

// Every timing knob lives here, named, so tuning the feel of the whole
// site never means digging through the functions below.

// Typing speed in milliseconds per character for section text and the
// header — the things a visitor actually reads.
const TYPE_SPEED_MS = 25;

// The boot log types slower than everything else: initialization should
// feel like an old machine warming up, deliberate line by deliberate
// line. Tuned against footage of a real Pip-Boy 3000 boot, whose log
// runs at close to this cadence.
const BOOT_TYPE_SPEED_MS = 28;

// How long a blank line holds the stage, in milliseconds. A blank line has
// no characters to type, so without this it would flash past in zero time
// instead of reading as a deliberate beat in the boot log.
const BLANK_LINE_PAUSE_MS = 400;

// How long the finished boot log pulses behind its blinking cursor —
// about one full blink — before the screen cuts to blank.
const BOOT_HOLD_MS = 1000;

// The beat of bare, empty glow between the log cutting away and the
// header starting to type — on the real hardware the tube sits blank
// for a moment before the next page appears.
const BOOT_BLANK_MS = 350;

// Visitors can tell their OS they want less motion, and the browser passes
// that on to us here. When it's set, every typing animation skips straight
// to the finished text — same end state, no waiting. This mirrors the
// cursor-blink rule in style.css: one preference, honored everywhere.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// The one typing run happening right now, or null when the site is idle.
// Only a single run ever exists at a time, which is what lets one shared
// click handler know exactly what to skip.
let activeRun = null;

// While true, typeText() completes instantly instead of animating. The
// click-to-skip handler flips this on, finishes the current run, and every
// chained run that follows (via onComplete) rushes to its end state in the
// same instant. That is how one click finishes a whole multi-line
// sequence, not just the line that happened to be mid-type.
let skipping = false;

// Reveal `text` inside `element` one character at a time, then call
// `onComplete` (if given). Multi-line sequences are built by passing the
// next step as onComplete, so a chain reads top to bottom like the
// terminal output it produces.
//
// Text is always written via textContent — never a property that parses
// markup — so nothing we print can ever be mistaken for HTML (see the
// house rules in README.md). That matters even for our own strings: one
// habit, no exceptions, means no mistakes when visitor input arrives in
// Phase 4.
function typeText(element, text, speedMs = TYPE_SPEED_MS, onComplete) {
  // A fresh call takes over cleanly: whatever was still typing anywhere on
  // the page stops first, so two timers can never fight over the screen
  // (e.g. when the visitor hops between sections faster than they type).
  cancelActiveRun();

  // The instant path: reduced-motion visitors and click-to-skip both land
  // here. Identical final text, zero animation.
  if (skipping || reducedMotion.matches) {
    element.textContent = text;
    if (onComplete) {
      onComplete();
    }
    return;
  }

  element.textContent = "";

  // A blank line types nothing but still deserves its moment: hand the
  // beat to pauseTyping so empty spacer lines read as a pause instead of
  // vanishing.
  if (text.length === 0) {
    pauseTyping(BLANK_LINE_PAUSE_MS, onComplete);
    return;
  }

  // The animation itself: one character appended per tick.
  // The run object is created before the timer so the timer reads its
  // text through it: if the text changes mid-type (the AUDIO RELAY line
  // flipping when the speaker is toggled), the rest of the line types
  // the new text instead of finishing the old one.
  const run = { element, text, onComplete, stop: null };
  let printed = 0;
  const timerId = setInterval(() => {
    element.textContent += run.text.charAt(printed);
    printed += 1;

    // Announce each printed character. bubbles: true lets the event climb
    // from this element up to `document`, so the audio module below hears
    // every character on the page with one listener instead of attaching
    // one to each line. Only this animated path fires it — the instant
    // path (skip, reduced motion) prints silently, so a skip never
    // produces a burst of ticks.
    element.dispatchEvent(new CustomEvent("charprinted", { bubbles: true }));

    if (printed >= run.text.length) {
      finishActiveRun();
    }
  }, speedMs);

  run.stop = () => clearInterval(timerId);
  activeRun = run;
}

// Hold the stage for `ms` with nothing typing, then move on. Registered
// as a run like any typing, so click-to-skip and Escape cut it short the
// same way. Used for the boot log's blank spacer line and for the beat
// before the boot screen wipes.
function pauseTyping(ms, onComplete) {
  cancelActiveRun();
  if (skipping || reducedMotion.matches) {
    if (onComplete) {
      onComplete();
    }
    return;
  }
  const timerId = setTimeout(finishActiveRun, ms);
  // element: null — a pause owns no element, so finishActiveRun knows to
  // leave the screen alone and just chain onward.
  activeRun = {
    element: null,
    text: "",
    onComplete,
    stop: () => clearTimeout(timerId),
  };
}

// Jump the active run straight to its finished state: timer stopped, full
// text in place, onComplete fired. Used by the click-to-skip handler and
// by the run itself when it types its last character.
function finishActiveRun() {
  if (!activeRun) {
    return;
  }
  // Clear the shared slot BEFORE calling onComplete — onComplete usually
  // starts the next run, which will claim the slot for itself.
  const run = activeRun;
  activeRun = null;
  run.stop();
  if (run.element) {
    run.element.textContent = run.text;
  }
  if (run.onComplete) {
    run.onComplete();
  }
}

// Stop the active run where it stands, mid-text, without finishing it or
// chaining onward. This is for abandoning text nobody is looking at
// anymore (the visitor navigated away) — the next visit retypes it from
// the beginning rather than resuming.
function cancelActiveRun() {
  if (!activeRun) {
    return;
  }
  activeRun.stop();
  activeRun = null;
}

// Skip the active run AND everything chained after it, in one instant.
// While `skipping` is true, every typeText call completes immediately —
// so finishing the current run cascades through the whole remaining
// sequence: boot log, header, section text, whatever was queued up.
function skipActiveSequence() {
  if (!activeRun) {
    return;
  }
  skipping = true;
  finishActiveRun();
  skipping = false;
}

// Click anywhere to skip. One listener on the document covers every typing
// run, current and future; when nothing is typing, clicks pass through
// untouched. The `true` registers it in the capture phase, which runs
// before any button's own click handler — so a click on a menu item first
// finishes the text already on screen, THEN navigates. In the default
// bubble phase the order flips, and a menu click would instantly finish
// the very text it had just started typing.
//
// One exemption: the speaker toggle. Turning sound on mid-boot is the
// whole point of having it visible during boot, so a press on it must
// not also skip the boot it wants to hear.
document.addEventListener(
  "click",
  (event) => {
    if (event.target.closest(".speaker-toggle")) {
      return;
    }
    skipActiveSequence();
  },
  true
);

/* ------------------------------------------------------------
   AUDIO
   Optional sound: typing ticks and menu clicks. Off on every
   visit, and silent until the visitor presses the speaker
   toggle. Browsers refuse to play sound before a user gesture,
   and this site remembers nothing between visits, so "off until
   pressed" is both the polite default and the only reliable one.

   THE SWAP POINT: every sound is made inside playTick() and
   playClick(). Today they synthesize placeholder sounds; when
   real samples arrive, only the insides of those two functions
   change. Nothing that calls them needs to know.
   ------------------------------------------------------------ */

// Sound knobs, named like the typing knobs above. The tick numbers come
// from measuring a real Pip-Boy boot recording: a short noise click
// peaking near 3.4 kHz, never closer together than about 45 ms. The site
// prints a character every 25–28 ms, so ticking on every character
// would blur into a buzz; the minimum gap thins them to the hardware's
// rhythm instead.
const TICK_MIN_GAP_MS = 45;
const TICK_LENGTH_S = 0.015;   // one tick: a 15 ms burst of noise
const TICK_PITCH_HZ = 3400;    // centre of the tick's narrow band
const TICK_PITCH_JITTER_HZ = 200; // per-tick wobble so it never sounds looped
const TICK_VOLUME = 0.25;
const CLICK_LENGTH_S = 0.04;   // the select chirp: a 40 ms falling square
const CLICK_START_HZ = 1200;
const CLICK_END_HZ = 800;
const CLICK_VOLUME = 0.12;

// The one AudioContext (the browser's sound engine), or null until the
// toggle is first pressed. Created lazily on purpose: making one at page
// load would start the engine for visitors who never want sound.
let audioContext = null;

// The single source of truth for "should anything make noise".
let speakerOn = false;

// When the last tick played, in AudioContext seconds — used to enforce
// TICK_MIN_GAP_MS.
let lastTickTime = 0;

// A reusable buffer of white noise, built once on first use. Every tick
// plays a slice of it through a filter rather than generating fresh noise.
let noiseBuffer = null;

// Shape a sound's volume: a near-instant rise, then a quick fade to
// silence. Without the fade every sound would end in an audible pop.
function envelope(gainNode, startTime, peak, lengthS) {
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(peak, startTime + 0.002);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + lengthS);
}

// One typing tick. Called for every printed character; whitespace and
// the minimum gap decide whether this one actually sounds.
function playTick(character) {
  if (!speakerOn || !audioContext) {
    return;
  }
  if (character && character.trim() === "") {
    return; // a space isn't a keystroke on a terminal printer
  }
  const now = audioContext.currentTime;
  if (now - lastTickTime < TICK_MIN_GAP_MS / 1000) {
    return;
  }
  lastTickTime = now;

  // --- placeholder synthesis (swap a sample in here later) ---
  if (!noiseBuffer) {
    const length = Math.ceil(audioContext.sampleRate * TICK_LENGTH_S);
    noiseBuffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      samples[i] = Math.random() * 2 - 1;
    }
  }
  const source = audioContext.createBufferSource();
  source.buffer = noiseBuffer;
  const band = audioContext.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = TICK_PITCH_HZ + (Math.random() * 2 - 1) * TICK_PITCH_JITTER_HZ;
  band.Q.value = 4;
  const gain = audioContext.createGain();
  envelope(gain, now, TICK_VOLUME * (0.8 + Math.random() * 0.4), TICK_LENGTH_S);
  source.connect(band).connect(gain).connect(audioContext.destination);
  source.start(now);
  source.stop(now + TICK_LENGTH_S);
}

// One UI click: menu selections and the speaker toggle itself.
function playClick() {
  if (!speakerOn || !audioContext) {
    return;
  }
  // --- placeholder synthesis (swap a sample in here later) ---
  const now = audioContext.currentTime;
  const tone = audioContext.createOscillator();
  tone.type = "square";
  tone.frequency.setValueAtTime(CLICK_START_HZ, now);
  tone.frequency.exponentialRampToValueAtTime(CLICK_END_HZ, now + CLICK_LENGTH_S);
  const gain = audioContext.createGain();
  envelope(gain, now, CLICK_VOLUME, CLICK_LENGTH_S);
  tone.connect(gain).connect(audioContext.destination);
  tone.start(now);
  tone.stop(now + CLICK_LENGTH_S);
}

// Every printed character, from anywhere on the page, arrives here
// (the typing engine's event bubbles up to document). The character is
// the last one now on screen in the element that printed it.
document.addEventListener("charprinted", (event) => {
  const text = event.target.textContent;
  playTick(text.charAt(text.length - 1));
});

// The toggle. Its click is the user gesture browsers require before
// sound: the AudioContext is born here, on the first press, and never
// earlier. Each press flips the state, relabels the button, keeps the
// boot log's AUDIO RELAY line honest, and (when turning on) clicks, so
// the visitor hears that it worked.
const speakerToggle = document.querySelector(".speaker-toggle");
speakerToggle.hidden = false;
speakerToggle.addEventListener("click", () => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  // Mobile browsers can start (or later park) the engine suspended;
  // resuming inside the gesture is what makes iOS Safari actually play.
  audioContext.resume();
  speakerOn = !speakerOn;
  speakerToggle.setAttribute("aria-pressed", String(speakerOn));
  speakerToggle.textContent = speakerOn ? "[ SPEAKER: ON ]" : "[ SPEAKER: OFF ]";
  updateAudioRelayLine();
  playClick();
});

/* ------------------------------------------------------------
   BOOT SEQUENCE
   On load, a short boot log types out above the header, then
   the header itself types, then the main menu appears at once.
   ------------------------------------------------------------ */

// The flavor lines typed before the header. The header lines themselves
// are deliberately NOT listed here: their text lives in index.html and is
// read from the DOM below, so the real content exists in exactly one
// place. The empty string is a genuine blank line in the log — the typing
// engine pauses on it instead of skipping it.
// The audio status line is the one boot line whose text depends on the
// visitor: it reports the speaker's state as it is at the moment it
// types, and flips if the toggle is pressed while it's on screen. It
// sits in BOOT_LINES as a marker; its real text comes from
// audioRelayText().
const AUDIO_RELAY_LINE_MARKER = "AUDIO_RELAY";

function audioRelayText() {
  return "AUDIO RELAY ....... " + (speakerOn ? "ENGAGED" : "STANDBY");
}

// The element the audio line was typed into, or null before it exists
// and after the boot log is cut away.
let audioRelayElement = null;

// Called by the speaker toggle. If the audio line is still typing, the
// new text replaces the run's target (both words are seven characters,
// so the line finishes cleanly); if it's already printed, it flips in
// place.
function updateAudioRelayLine() {
  if (!audioRelayElement || !audioRelayElement.isConnected) {
    return;
  }
  if (activeRun && activeRun.element === audioRelayElement) {
    // Mid-type: rewrite what's already on screen to the new text's
    // prefix, and the rest types from the new text. Both status words
    // are seven characters, so the lengths always match.
    const newText = audioRelayText();
    audioRelayElement.textContent = newText.slice(0, audioRelayElement.textContent.length);
    activeRun.text = newText;
    return;
  }
  audioRelayElement.textContent = audioRelayText();
}

const BOOT_LINES = [
  "ROBCO TERMLINK PROTOCOL v2.0",
  "INITIALIZING TERMINAL...",
  "",
  "STACK CHECK: HTML / CSS / JAVASCRIPT — NO FRAMEWORKS DETECTED",
  "HOST LINK: GITHUB PAGES NETWORK ... ESTABLISHED",
  AUDIO_RELAY_LINE_MARKER,
];

// The boot plays out in six phases, modeled on real Pip-Boy hardware
// (which shares the in-game terminals' operating system):
//   1. the boot log types out, deliberate, line by line
//   2. the finished log pulses behind a blinking cursor for a beat
//   3. the cut: the log vanishes in a single frame — a terminal clears
//      its screen instantly, it doesn't ease anything away
//   4. the bare glow holds for a moment
//   5. the header types onto the clean screen
//   6. the menu pops in all at once, timed to the final header
//      character (menus are furniture to navigate, not content to
//      read, so they never type)
// Every phase chains through onComplete, which is what lets one click or
// Escape press flush the entire boot — all six phases — in one instant.
function runBootSequence() {
  const preamble = document.querySelector(".boot-preamble");
  const mainElement = document.querySelector("main");
  const headerLines = document.querySelectorAll(".terminal-header .header-line");
  const skipHint = document.querySelector(".boot-skip-hint");

  // Hide the menu for the duration of the boot. Added here, by script,
  // rather than written into the HTML — so a visitor without JavaScript
  // still gets the whole site immediately; for them, boot simply never
  // happens. The skip hint is the reverse: hidden in the HTML (a no-JS
  // visitor has nothing to skip) and shown only while boot runs.
  mainElement.hidden = true;
  skipHint.hidden = false;

  // Capture the header text and blank the elements, ready to be typed
  // back in after the wipe. The text itself keeps living in index.html.
  const headerSteps = [];
  for (const line of headerLines) {
    headerSteps.push({ element: line, text: line.textContent });
    line.textContent = "";
  }

  // Phase 1 — each log line gets a fresh element appended as its turn
  // comes, so the log grows downward like a real terminal printing.
  function typeLogLine(index) {
    if (index >= BOOT_LINES.length) {
      holdThenCut();
      return;
    }
    const element = document.createElement("p");
    preamble.appendChild(element);
    let text = BOOT_LINES[index];
    if (text === AUDIO_RELAY_LINE_MARKER) {
      text = audioRelayText();
      audioRelayElement = element;
    }
    typeText(element, text, BOOT_TYPE_SPEED_MS, () => typeLogLine(index + 1));
  }

  // Phases 2 through 4 — the blinking cursor reuses the same .cursor
  // class (and CSS animation) as the resting prompt, built with
  // createElement rather than markup strings, like everything else on
  // the site.
  function holdThenCut() {
    const cursorLine = document.createElement("p");
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    cursor.textContent = "█"; // the block character the prompt uses
    cursorLine.appendChild(cursor);
    preamble.appendChild(cursorLine);

    pauseTyping(BOOT_HOLD_MS, () => {
      // The cut. The log (cursor included) is gone until the next boot.
      preamble.textContent = "";
      pauseTyping(BOOT_BLANK_MS, () => typeHeaderLine(0));
    });
  }

  // Phases 5 and 6.
  function typeHeaderLine(index) {
    if (index >= headerSteps.length) {
      // The menu pops in, all at once, no fade — a terminal draws its
      // screen; it doesn't ease into it. The skip hint leaves with the
      // boot: there's nothing left to skip.
      skipHint.hidden = true;
      mainElement.hidden = false;
      return;
    }
    const step = headerSteps[index];
    typeText(step.element, step.text, TYPE_SPEED_MS, () => typeHeaderLine(index + 1));
  }

  // The boot animation plays only on a genuine arrival. The browser
  // reports how this load happened — "navigate" is a fresh visit, while
  // "reload" is a refresh and "back_forward" the history buttons — so no
  // cookies or storage are needed to tell them apart, and the house rule
  // that nothing on this site remembers anything still holds. On a repeat
  // view the whole sequence runs through the same instant path
  // click-to-skip uses: identical finished screen, none of the waiting.
  // (Browsers too old to report a navigation type just get the show.)
  const navigation = performance.getEntriesByType("navigation")[0];
  const isRepeatView = Boolean(navigation) && navigation.type !== "navigate";
  if (isRepeatView) {
    skipping = true;
    typeLogLine(0); // all five phases complete synchronously while skipping
    skipping = false;
    return;
  }
  typeLogLine(0);
}

/* ------------------------------------------------------------
   SCREEN NAVIGATION
   ------------------------------------------------------------ */

// Every screen we can switch between. Phase 2 never adds or removes
// sections after load, so grabbing them once up front is enough.
const screens = document.querySelectorAll("main > section");

// Each screen's body text, captured once at load. The text keeps living in
// index.html — this map just remembers it so every visit can blank the
// paragraphs and retype them. Only direct <p> children are captured:
// headings, buttons, and the Vault Boy figure are structure and navigation,
// which appear instantly — body text is the "entry" you read, so it alone
// types. (The main menu has no <p> children, so it never lands in the map
// and never types.) Nothing is stored beyond this page load, by design.
const screenParagraphs = new Map();
for (const screen of screens) {
  const paragraphs = [];
  for (const paragraph of screen.querySelectorAll(":scope > p")) {
    paragraphs.push({ element: paragraph, text: paragraph.textContent });
  }
  if (paragraphs.length > 0) {
    screenParagraphs.set(screen.id, paragraphs);
  }
}

// Show the screen whose id matches `targetId`; hide all the others.
// The `hidden` attribute removes a section from both sight and the
// keyboard order, so visitors can't tab into an invisible screen.
function showScreen(targetId) {
  // Whatever the old screen was still typing stops where it stands — no
  // finishing, no chaining onward, no remembering how far it got. The
  // next visit to that screen retypes from the top.
  cancelActiveRun();

  for (const screen of screens) {
    screen.hidden = screen.id !== targetId;
  }

  // Send keyboard focus to the new screen's heading. Without this, focus
  // would die on the now-hidden button the visitor just activated, and
  // keyboard or screen-reader users would be stranded.
  const heading = document.querySelector("#" + targetId + " h2");
  if (heading) {
    heading.focus();
  }

  // The "reading an entry" moment: only the FIRST paragraph — the
  // in-universe loading line ("Accessing personnel record...") — actually
  // types. The rest of the entry pops in complete the instant that line
  // finishes: the terminal has "fetched" the record, and making a visitor
  // reread a whole entry at typing speed gets tedious fast.
  const paragraphs = screenParagraphs.get(targetId);
  if (!paragraphs) {
    return;
  }
  // Blank everything up front, so the entry isn't sitting fully formed
  // on screen while its loading line is still typing.
  for (const paragraph of paragraphs) {
    paragraph.element.textContent = "";
  }
  const loadingLine = paragraphs[0];
  typeText(loadingLine.element, loadingLine.text, TYPE_SPEED_MS, () => {
    for (const paragraph of paragraphs.slice(1)) {
      paragraph.element.textContent = paragraph.text;
    }
  });
}

// Wire-up: every navigation button declares its destination with a
// data-target attribute, so adding a menu entry later means touching
// only the HTML — no new JavaScript.
for (const button of document.querySelectorAll("button[data-target]")) {
  button.addEventListener("click", () => {
    playClick();
    showScreen(button.dataset.target);
  });
}

// Escape mirrors the in-game "back out of the entry" key, in two layers.
// First press while text is typing: skip it — the keyboard counterpart of
// click-to-skip, so skipping (including the whole boot) never requires a
// mouse. Once everything is still: back out of the open section to the
// main menu, the previous layer of the terminal. Tab is deliberately NOT
// used for this even though the in-game terminals use it — in a browser,
// Tab is how keyboard users move focus between the menu buttons, and
// stealing it would strand them.
document.addEventListener("keydown", (event) => {
  // Enter is the advertised skip key — the boot hint names it — and it
  // does exactly one thing: fast-forward whatever is typing. Navigation
  // stays Escape's job.
  if (event.key === "Enter") {
    // Enter on the focused speaker toggle means "press the toggle", not
    // "skip" — the button's own click does the rest.
    if (document.activeElement === speakerToggle) {
      return;
    }
    skipActiveSequence();
    return;
  }
  if (event.key !== "Escape") {
    return;
  }
  if (activeRun) {
    skipActiveSequence();
    return;
  }
  // During boot the whole <main> is hidden but the menu section inside it
  // still counts as the "open" one, so this stays a harmless no-op until
  // boot finishes. On the main menu itself there is no previous layer.
  const openScreen = document.querySelector("main > section:not([hidden])");
  if (openScreen && openScreen.id !== "main-menu") {
    showScreen("main-menu");
  }
});

// Everything is wired — power on. This runs as soon as the script loads,
// which is after the DOM is parsed (the <script> tag sits at the end of
// <body>), so every element the boot needs already exists.
runBootSequence();
