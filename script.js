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
// about one full blink — before the CRT roll carries it away.
const BOOT_HOLD_MS = 1000;

// How long the CRT vertical roll takes to carry the log up and off the
// screen. This must stay in step with --roll-duration in style.css: the
// CSS plays the roll, this constant tells the boot chain when it's over.
const BOOT_ROLL_MS = 400;

// The beat of bare, empty glow between the log rolling off and the
// header starting to type — on the real hardware the tube sits blank
// for a moment before the next page blooms in.
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
  let printed = 0;
  const timerId = setInterval(() => {
    element.textContent += text.charAt(printed);
    printed += 1;

    // Announce each printed character on the element. Nothing listens yet —
    // this is the hook a future sound pass will attach to, added now so
    // that feature never needs to reopen this function.
    element.dispatchEvent(new CustomEvent("charprinted"));

    if (printed >= text.length) {
      finishActiveRun();
    }
  }, speedMs);

  activeRun = {
    element,
    text,
    onComplete,
    stop: () => clearInterval(timerId),
  };
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
document.addEventListener("click", skipActiveSequence, true);

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
const BOOT_LINES = [
  "ROBCO TERMLINK PROTOCOL v2.0",
  "INITIALIZING TERMINAL...",
  "",
  "STACK CHECK: HTML / CSS / JAVASCRIPT — NO FRAMEWORKS DETECTED",
  "HOST LINK: GITHUB PAGES NETWORK ... ESTABLISHED",
];

// The boot plays out in six phases, modeled on real Pip-Boy hardware
// (which shares the in-game terminals' operating system):
//   1. the boot log types out, deliberate, line by line
//   2. the finished log pulses behind a blinking cursor for a beat
//   3. the CRT roll: the whole log climbs up and off the screen like
//      the tube losing sync, and is wiped once it's gone
//   4. the bare glow holds for a moment
//   5. the header types onto the clean screen
//   6. the menu pops in all at once (menus are furniture to navigate,
//      not content to read, so they never type)
// Every phase chains through onComplete, which is what lets one click or
// Escape press flush the entire boot — all six phases — in one instant.
function runBootSequence() {
  const preamble = document.querySelector(".boot-preamble");
  const mainElement = document.querySelector("main");
  const headerLines = document.querySelectorAll(".terminal-header .header-line");

  // Hide the menu for the duration of the boot. Added here, by script,
  // rather than written into the HTML — so a visitor without JavaScript
  // still gets the whole site immediately; for them, boot simply never
  // happens.
  mainElement.hidden = true;

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
      holdRollAndWipe();
      return;
    }
    const element = document.createElement("p");
    preamble.appendChild(element);
    typeText(element, BOOT_LINES[index], BOOT_TYPE_SPEED_MS, () => typeLogLine(index + 1));
  }

  // Phases 2 through 4 — the blinking cursor reuses the same .cursor
  // class (and CSS animation) as the resting prompt, built with
  // createElement rather than markup strings, like everything else on
  // the site. The roll itself is a CSS animation; the timing chain stays
  // in pauseTyping so a click or Escape can still cut through any of it.
  function holdRollAndWipe() {
    const cursorLine = document.createElement("p");
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    cursor.textContent = "█"; // the block character the prompt uses
    cursorLine.appendChild(cursor);
    preamble.appendChild(cursorLine);

    pauseTyping(BOOT_HOLD_MS, () => {
      // On the instant paths the roll never plays — the log just goes.
      if (!skipping && !reducedMotion.matches) {
        preamble.classList.add("boot-roll");
      }
      pauseTyping(BOOT_ROLL_MS, () => {
        // The wipe. The log (cursor included) is gone until the next
        // boot, and the class comes off so a rolled-empty container
        // isn't left carrying a stale animation.
        preamble.classList.remove("boot-roll");
        preamble.textContent = "";
        pauseTyping(BOOT_BLANK_MS, () => typeHeaderLine(0));
      });
    });
  }

  // Phases 5 and 6.
  function typeHeaderLine(index) {
    if (index >= headerSteps.length) {
      // The menu pops in, all at once, no fade — a terminal draws its
      // screen; it doesn't ease into it.
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
  button.addEventListener("click", () => showScreen(button.dataset.target));
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
