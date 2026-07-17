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

// Typing speed in milliseconds per character. A named constant up here —
// not a magic number inside the function — so tuning the feel of the whole
// site is a one-line change.
const TYPE_SPEED_MS = 30;

// How long a blank line holds the stage, in milliseconds. A blank line has
// no characters to type, so without this it would flash past in zero time
// instead of reading as a deliberate beat in the boot log.
const BLANK_LINE_PAUSE_MS = 400;

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

  // A blank line types nothing but still deserves its moment: hold briefly,
  // then move on, so empty spacer lines read as a pause instead of
  // vanishing. setTimeout fires once; setInterval (below) fires repeatedly.
  if (text.length === 0) {
    const timerId = setTimeout(finishActiveRun, BLANK_LINE_PAUSE_MS);
    activeRun = {
      element,
      text,
      onComplete,
      stop: () => clearTimeout(timerId),
    };
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
  run.element.textContent = run.text;
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

function runBootSequence() {
  const preamble = document.querySelector(".boot-preamble");
  const mainElement = document.querySelector("main");
  const headerLines = document.querySelectorAll(".terminal-header .header-line");

  // Hide the menu for the duration of the boot. Added here, by script,
  // rather than written into the HTML — so a visitor without JavaScript
  // still gets the whole site immediately; for them, boot simply never
  // happens.
  mainElement.hidden = true;

  // Build the full ordered list of typing steps: the preamble lines, then
  // the three header lines. Header text is captured from the DOM and the
  // elements blanked, ready to be typed back in.
  const steps = [];
  for (const text of BOOT_LINES) {
    // element: null — each preamble line gets a fresh element created at
    // its turn (below), so the log grows downward like a real terminal.
    steps.push({ element: null, text });
  }
  for (const line of headerLines) {
    steps.push({ element: line, text: line.textContent });
    line.textContent = "";
  }

  // Type each step, then the next, by handing typeText this same function
  // as its onComplete. Because the steps chain through onComplete, the
  // click-to-skip handler's cascade finishes ALL of them at once — one
  // click anywhere mid-boot lands the visitor on the finished screen.
  let stepIndex = 0;
  function typeNextStep() {
    if (stepIndex >= steps.length) {
      // Boot finished. The menu appears all at once — menus are furniture
      // to navigate, not content to read, so they never type.
      mainElement.hidden = false;
      return;
    }
    const step = steps[stepIndex];
    stepIndex += 1;

    let element = step.element;
    if (!element) {
      element = document.createElement("p");
      preamble.appendChild(element);
    }
    typeText(element, step.text, TYPE_SPEED_MS, typeNextStep);
  }
  typeNextStep();
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

  // Type the screen's body text back in — the "reading an entry" moment.
  const paragraphs = screenParagraphs.get(targetId);
  if (!paragraphs) {
    return;
  }
  // Blank every paragraph up front, so the later ones don't sit fully
  // formed on screen while the first is still typing.
  for (const paragraph of paragraphs) {
    paragraph.element.textContent = "";
  }
  // Same chaining pattern as the boot sequence: each paragraph hands off
  // to the next through onComplete, so one click finishes them all.
  let paragraphIndex = 0;
  function typeNextParagraph() {
    if (paragraphIndex >= paragraphs.length) {
      return;
    }
    const paragraph = paragraphs[paragraphIndex];
    paragraphIndex += 1;
    typeText(paragraph.element, paragraph.text, TYPE_SPEED_MS, typeNextParagraph);
  }
  typeNextParagraph();
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
