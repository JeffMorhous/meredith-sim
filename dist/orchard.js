(() => {
  "use strict";

  const places = {
    "orchard-apples": {
      name: "The apple trees",
      line: "The ripe apples smell like cider. Someone left a wicker basket under the low branches."
    },
    "orchard-roost": {
      name: "The bird roost",
      line: "Three birds are taking turns on a little song. They leave a space for Mere to answer."
    },
    "orchard-brambles": {
      name: "Berry brambles",
      line: "The brambles curl around a flat gray rock, heavy with clusters of red berries."
    },
    "orchard-exit": {
      name: "Meadow trail",
      line: "Follow the sunlit path back to the meadow."
    }
  };

  const chores = [
    {
      id: "orchard-pick",
      label: "Pick a basket of apples",
      description: "Find three ripe apples among the low branches.",
      location: "orchard-apples",
      reward: 24
    },
    {
      id: "orchard-song",
      label: "Echo the birdsong",
      description: "Watch the birds take turns, then match their two songs.",
      location: "orchard-roost",
      reward: 22
    },
    {
      id: "orchard-tidy",
      label: "Set aside the windfalls",
      description: "Clear fallen apples from the trail for the woodland birds.",
      location: "orchard-apples",
      reward: 10
    }
  ];

  const outcomes = {
    "orchard-pick": [
      "Three crisp apples settle into the basket. The last one comes away with a leaf still on its stem.",
      "Mere tucks a red apple next to the other two. They’ll be good sliced thin for breakfast.",
      "The basket smells like sweet apples and the grass smells like sun."
    ],
    "orchard-song": [
      "The robin cocks its head when Mere sings the last note. Then all three birds chirp together.",
      "Mere hums the second tune once more on the way down the trail. A finch answers from the hedge.",
      "For a little while, there are four singers at the roost."
    ],
    "orchard-tidy": [
      "Mere sets the fallen apples beneath the hedge. A blackbird is already eyeing them.",
      "The trail is clear. A few soft apples wait in the shade for the birds to find.",
      "Mere brushes a leaf off the last fallen apple and sets it under the hedge."
    ]
  };

  const adventure = {
    title: "The Missing Bell",
    reward: 35,
    stages: [
      {
        spot: "orchard-roost",
        title: "The empty hook",
        description: "The finch nudges the empty hook under the birdhouse. A little brass bell used to hang there.",
        action: "Look for the bell",
        outcome: "The bluebird flies to the wicker basket under the big apple tree. Look for a clue at the apple trees."
      },
      {
        spot: "orchard-apples",
        title: "A torn ribbon",
        description: "A scrap of red ribbon is caught on the wicker handle. A few matching threads cling to the grass to the left.",
        action: "Follow the threads",
        outcome: "The last red thread is caught on a flat gray rock. Look in the berry brambles just below it, on the left edge of the orchard."
      },
      {
        spot: "orchard-brambles",
        title: "A glint in the berries",
        description: "Mere lifts a bramble leaf. Something brass catches the light, with a torn red ribbon looped through it.",
        action: "Free the bell",
        outcome: "Mere slips the bell free of the thorns. Bring it back to the bird roost and hang it under the teal-roofed birdhouse."
      },
      {
        spot: "orchard-roost",
        title: "One last note",
        description: "The three birds scoot along the perch. The hook under the birdhouse is just within reach.",
        action: "Hang the bell",
        outcome: "The bell rings once. Three birds chirp back in turn, and Bear’s ears swivel toward the roost."
      }
    ]
  };

  function draw(ctx, state, { elapsed = 0, reducedMotion = false } = {}) {
    ctx.save();

    ctx.fillStyle = "#633d24";
    ctx.font = "bold 8px monospace";
    ctx.textBaseline = "middle";
    ctx.fillText("MEADOW", 544, 324);

    ctx.fillStyle = "#5f4b36";
    ctx.fillRect(785, 136, 2, 6);
    ctx.fillRect(786, 141, 3, 2);

    if (state.bellStage === 1) {
      ctx.fillStyle = "#9b3b30";
      ctx.fillRect(264, 176, 5, 3);
      ctx.fillRect(264, 179, 2, 5);
      ctx.fillStyle = "#e26c5d";
      ctx.fillRect(266, 176, 3, 2);
      ctx.fillRect(267, 178, 2, 4);
    }

    if (state.bellStage === adventure.stages.length) {
      ctx.fillStyle = "#774b20";
      ctx.fillRect(785, 143, 5, 3);
      ctx.fillRect(783, 146, 9, 5);
      ctx.fillRect(781, 151, 13, 2);
      ctx.fillRect(786, 153, 3, 2);
      ctx.fillStyle = "#e8a644";
      ctx.fillRect(785, 146, 5, 1);
      ctx.fillRect(784, 147, 7, 4);
      ctx.fillRect(782, 151, 11, 1);
      ctx.fillStyle = "#fff1aa";
      ctx.fillRect(785, 147, 2, 3);
    }

    if (state.bellStage === 2) {
      const glow = reducedMotion ? 1 : .76 + .24 * Math.sin(elapsed * 3);
      ctx.globalAlpha = glow;
      ctx.fillStyle = "#774c30";
      ctx.fillRect(63, 322, 3, 11);
      ctx.fillRect(59, 326, 11, 3);
      ctx.fillStyle = "#ffec9a";
      ctx.fillRect(64, 323, 1, 9);
      ctx.fillRect(60, 327, 9, 1);
      ctx.fillStyle = "#fff8db";
      ctx.fillRect(63, 326, 3, 3);
      ctx.globalAlpha = 1;
    }

    if (state.completed.includes("orchard-pick")) {
      for (const [x, y] of [[267, 182], [274, 181], [281, 183]]) {
        ctx.fillStyle = "#9c3321";
        ctx.fillRect(x, y, 6, 5);
        ctx.fillStyle = "#ee6545";
        ctx.fillRect(x + 1, y, 4, 3);
        ctx.fillStyle = "#ffab66";
        ctx.fillRect(x + 1, y + 1, 2, 1);
      }
    }

    if (!reducedMotion) {
      const notes = [
        [706, "#b8e5f4"],
        [734, "#ffd5be"],
        [763, "#ffe7a0"]
      ];
      const beat = elapsed % 8;
      notes.forEach(([x, fill], index) => {
        const phase = beat - index * 0.34;
        if (phase < 0 || phase > 1.5) return;
        const y = Math.round(129 - phase * 11);
        ctx.globalAlpha = Math.min(1, (1.5 - phase) * 2);
        ctx.fillStyle = "#4b5632";
        ctx.fillRect(x - 1, y + 5, 6, 4);
        ctx.fillRect(x + 3, y - 1, 3, 8);
        ctx.fillRect(x + 5, y, 4, 3);
        ctx.fillStyle = fill;
        ctx.fillRect(x, y + 6, 4, 2);
        ctx.fillRect(x + 4, y, 1, 7);
        ctx.fillRect(x + 5, y + 1, 3, 1);
      });
    }
    ctx.restore();
  }

  const scene = {
    id: "orchard",
    name: "Bramblebrook Orchard",
    background: "orchard.webp",
    spawn: { x: 489, y: 301 },
    bearSpawn: { x: 519, y: 285 },
    spots: {
      "orchard-apples": { x: 315, y: 232, area: [89, 33, 419, 215] },
      "orchard-roost": { x: 737, y: 207, area: [671, 73, 842, 223] },
      "orchard-brambles": { x: 125, y: 325, area: [3, 291, 114, 384] },
      "orchard-exit": { x: 488, y: 363, area: [448, 308, 588, 408] }
    },
    boundary: [
      [13, 157], [42, 143], [68, 139], [89, 156], [124, 173],
      [180, 175], [211, 165], [241, 167], [259, 208], [399, 216],
      [420, 203], [440, 173], [431, 132], [458, 127], [484, 124],
      [514, 117], [541, 111], [566, 110], [599, 115], [639, 106],
      [682, 105], [736, 108], [755, 116], [770, 126], [806, 128],
      [837, 138], [861, 155], [887, 152], [905, 151], [931, 169],
      [971, 170], [987, 179], [990, 245], [970, 270], [930, 293],
      [888, 303], [847, 325], [812, 332], [785, 354], [746, 364],
      [696, 392], [655, 402], [211, 403], [191, 387], [153, 371],
      [120, 359], [92, 324], [55, 309], [23, 282], [8, 251]
    ],
    obstacles: [
      [[135, 154], [165, 152], [174, 166], [162, 173], [140, 169]],
      [[257, 180], [286, 174], [304, 158], [342, 167], [359, 176], [401, 181], [405, 210], [266, 211]],
      [[673, 157], [788, 148], [790, 180], [809, 173], [828, 178], [828, 193], [806, 196], [787, 190], [677, 194]],
      [[794, 122], [822, 120], [821, 184], [796, 186]],
      [[852, 177], [866, 162], [889, 164], [900, 186], [886, 193], [858, 191]],
      [[907, 195], [986, 166], [993, 180], [935, 210], [920, 221], [913, 218]],
      [[1, 179], [28, 179], [94, 208], [93, 224], [75, 234], [36, 217], [6, 207]],
      [[30, 269], [41, 259], [60, 257], [76, 267], [81, 282], [53, 293], [33, 282]],
      [[301, 363], [341, 351], [392, 339], [443, 328], [449, 344], [440, 372], [401, 372], [329, 391], [314, 395], [308, 373]],
      [[533, 332], [540, 305], [582, 305], [588, 329], [572, 335], [679, 362], [678, 375], [660, 395], [572, 377], [531, 371]]
    ],
    draw
  };

  const branches = [
    [
      { name: "Rosy red", detail: "Firm and smooth", color: "red", ripe: true },
      { name: "Pale green", detail: "Hard as a pebble", color: "green", hint: "That apple needs a few more sunny days." },
      { name: "Dusty red", detail: "A soft bruise", color: "bruised", hint: "The birds can have this soft one." }
    ],
    [
      { name: "Green and pink", detail: "Clings to the branch", color: "green", hint: "Leave the ones that still cling to the branch." },
      { name: "Crimson red", detail: "A split in the skin", color: "bruised", hint: "Look for an apple with its skin intact." },
      { name: "Coral red", detail: "Turns with a twist", color: "red", ripe: true }
    ],
    [
      { name: "Deep red", detail: "A soft bottom", color: "bruised", hint: "Feel for an apple that’s firm all the way around." },
      { name: "Blush red", detail: "Firm and fragrant", color: "red", ripe: true },
      { name: "Pale gold", detail: "Still hard and sour", color: "green", hint: "This one has more growing to do." }
    ]
  ];

  const birds = {
    bluebird: { label: "Bluebird", mark: "◆" },
    robin: { label: "Robin", mark: "●" },
    finch: { label: "Finch", mark: "▲" }
  };
  const birdNames = Object.keys(birds);
  const songs = [
    [["bluebird", "robin", "finch"], ["robin", "finch", "finch", "bluebird"]],
    [["finch", "bluebird", "robin"], ["bluebird", "robin", "robin", "finch"]],
    [["robin", "finch", "bluebird"], ["finch", "bluebird", "bluebird", "robin"]]
  ];

  let cleanup = null;

  function stop() {
    cleanup?.();
    cleanup = null;
  }

  function appleActivity({ panel, shell, complete, audio }) {
    let picked = 0;
    shell("orchard-game-pick", "Pick ripe apples", `
      <section class="orchard-activity" aria-label="Apple picking">
        <p class="note">Pick an apple from each branch. Look for firm, rosy fruit that’s ready to come away.</p>
        <div class="orchard-pick-board">
          <div class="orchard-choice-row" aria-label="Apples on this branch">
            ${branches[0].map((_, index) => `
              <button type="button" class="orchard-choice" data-orchard-apple="${index}">
                <span class="orchard-apple" aria-hidden="true"><i></i></span>
                <strong></strong><small></small>
              </button>
            `).join("")}
          </div>
          <div class="orchard-meter">
            <span data-orchard-count>Basket 0 / 3</span>
            <div aria-hidden="true">${branches.map(() => '<i class="orchard-apple-dot"></i>').join("")}</div>
          </div>
        </div>
        <p class="orchard-feedback" role="status">Choose an apple from the first branch.</p>
      </section>
    `);
    const activity = panel.querySelector(".orchard-activity");
    const choices = [...activity.querySelectorAll("[data-orchard-apple]")];
    const basket = [...activity.querySelectorAll(".orchard-apple-dot")];
    const count = activity.querySelector("[data-orchard-count]");
    const feedback = activity.querySelector("[role='status']");

    function showBranch() {
      choices.forEach((button, index) => {
        const apple = branches[picked][index];
        button.dataset.fruit = apple.color;
        button.querySelector("strong").textContent = apple.name;
        button.querySelector("small").textContent = apple.detail;
      });
    }

    function choose(event) {
      const button = event.target.closest("[data-orchard-apple]");
      if (!button || picked === branches.length) return;
      const apple = branches[picked][Number(button.dataset.orchardApple)];
      if (!apple.ripe) {
        feedback.textContent = apple.hint;
        return;
      }
      basket[picked].classList.add("picked");
      picked++;
      count.textContent = `Basket ${picked} / ${branches.length}`;
      if (picked === branches.length) {
        complete("orchard-pick");
        return;
      }
      audio?.cue("interaction");
      showBranch();
      feedback.textContent = picked === 1 ? "One apple tucked away. Here’s the next branch." : "Two in the basket. One more branch to go.";
      choices[0].focus({ preventScroll: true });
    }

    showBranch();
    activity.addEventListener("click", choose);
    choices[0].focus({ preventScroll: true });
    return () => activity.removeEventListener("click", choose);
  }

  function birdActivity({ panel, shell, complete, audio }) {
    const pair = songs[Math.floor(Math.random() * songs.length)];
    let round = 0;
    let phase = "ready";
    let guess = [];
    let timer = 0;

    shell("orchard-game-song", "Echo the birdsong", `
      <section class="orchard-activity" aria-label="Birdsong game">
        <p class="note">Watch the birds take turns. When you’re ready, tap them in the same order.</p>
        <div class="orchard-song-board">
          <div class="orchard-song-tray">
            <span data-orchard-round>Song 1 / 2</span>
            <div class="orchard-song-strip" aria-hidden="true"></div>
          </div>
          <div class="orchard-choice-row" aria-label="Birds at the roost">
            ${birdNames.map((name) => `
              <button type="button" class="orchard-choice orchard-bird-choice" data-orchard-bird="${name}" disabled>
                <span class="orchard-bird" aria-hidden="true"><i></i></span>
                <strong><span aria-hidden="true">${birds[name].mark}</span> ${birds[name].label}</strong>
              </button>
            `).join("")}
          </div>
        </div>
        <div class="orchard-song-actions">
          <button type="button" class="small-action" data-orchard-watch>Watch song</button>
          <button type="button" class="small-action" data-orchard-try hidden disabled>Try this song</button>
        </div>
        <p class="orchard-feedback" role="status">You can play with sound off.</p>
      </section>
    `);
    const activity = panel.querySelector(".orchard-activity");
    const choices = [...activity.querySelectorAll("[data-orchard-bird]")];
    const watchButton = activity.querySelector("[data-orchard-watch]");
    const tryButton = activity.querySelector("[data-orchard-try]");
    const strip = activity.querySelector(".orchard-song-strip");
    const roundLabel = activity.querySelector("[data-orchard-round]");
    const feedback = activity.querySelector("[role='status']");

    function showStrip(notes = []) {
      strip.innerHTML = pair[round].map((_, index) => {
        const note = notes[index];
        return note ? `<span data-orchard-bird="${note}">${birds[note].mark}</span>` : `<span>${index + 1}</span>`;
      }).join("");
    }

    function showBird(name) {
      choices.forEach((button) => button.classList.toggle("singing", button.dataset.orchardBird === name));
    }

    function enableChoices(enabled) {
      choices.forEach((button) => { button.disabled = !enabled; });
    }

    function enableTry(enabled) {
      tryButton.hidden = !enabled;
      tryButton.disabled = !enabled;
    }

    function watch() {
      if (phase === "playing" || phase === "done") return;
      phase = "playing";
      guess = [];
      enableTry(false);
      enableChoices(false);
      watchButton.setAttribute("aria-disabled", "true");
      watchButton.textContent = "Playing song…";
      feedback.textContent = "Watch the birds and remember their order.";

      const song = pair[round];
      let noteIndex = 0;
      function playNote() {
        if (noteIndex === song.length) {
          phase = "study";
          showBird();
          watchButton.removeAttribute("aria-disabled");
          watchButton.textContent = "Replay song";
          enableTry(true);
          feedback.textContent = `The song goes ${song.map((note) => birds[note].label).join(", ")}.`;
          if (document.activeElement === watchButton) tryButton.focus({ preventScroll: true });
          return;
        }
        const note = song[noteIndex++];
        showBird(note);
        showStrip(song.slice(0, noteIndex));
        audio?.cue(note);
        timer = window.setTimeout(() => {
          showBird();
          timer = window.setTimeout(playNote, 150);
        }, 390);
      }
      playNote();
    }

    function attempt() {
      if (phase !== "study") return;
      phase = "answer";
      enableTry(false);
      enableChoices(true);
      showStrip();
      feedback.textContent = "Your turn. Pick the birds in the same order.";
      choices[0].focus({ preventScroll: true });
    }

    function answer(note) {
      if (phase !== "answer") return;
      audio?.cue(note);
      guess.push(note);
      showStrip(guess);

      const song = pair[round];
      if (guess.length < song.length) {
        feedback.textContent = `You chose ${birds[note].label}. ${guess.length} of ${song.length} notes.`;
        return;
      }
      if (!song.every((name, index) => guess[index] === name)) {
        guess = [];
        showStrip();
        feedback.textContent = "That was a different tune. Try again or replay the song.";
        return;
      }
      round++;
      if (round === pair.length) {
        phase = "done";
        complete("orchard-song");
        return;
      }
      phase = "ready";
      guess = [];
      enableChoices(false);
      roundLabel.textContent = `Song ${round + 1} / ${pair.length}`;
      watchButton.textContent = "Watch next song";
      watchButton.focus({ preventScroll: true });
      showStrip();
      feedback.textContent = "You matched the first song. The birds have one more for you.";
    }

    function choose(event) {
      const button = event.target.closest("button");
      if (button === watchButton) watch();
      else if (button === tryButton) attempt();
      else if (button?.dataset.orchardBird) answer(button.dataset.orchardBird);
    }

    showStrip();
    activity.addEventListener("click", choose);
    watchButton.focus({ preventScroll: true });
    return () => {
      clearTimeout(timer);
      activity.removeEventListener("click", choose);
    };
  }

  function start(id, controller) {
    stop();
    if (id === "orchard-pick") cleanup = appleActivity(controller);
    if (id === "orchard-song") cleanup = birdActivity(controller);
    return Boolean(cleanup);
  }

  window.CozyOrchard = { scene, places, chores, outcomes, adventure, start, stop };
})();
