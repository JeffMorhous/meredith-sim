(function (window) {
  "use strict";

  const storageKey = "mere-and-bear.life.v1";
  const toyBonus = 8;
  const milestone = Object.freeze({
    id: "cottage-tradition",
    title: "A letter for Meredith",
    description: "Earn 260 points over your days with Bear to open this keepsake.",
    letter: "For Meredith, with love. I made you and Bear a little place where the flowers always come back and there's time to watch the pond go still. When Bear settles beside you, stay as long as you like.",
    target: 260
  });

  const chores = Object.freeze([
    {
      id: "breakfast",
      label: "Serve breakfast",
      description: "Set out Bear's breakfast.",
      location: "bear",
      reward: 20
    },
    {
      id: "cuddle",
      label: "Sit with Bear",
      description: "Make a little room for Bear to settle in beside you.",
      location: "bear",
      reward: 12
    },
    {
      id: "play",
      label: "Play with Bear",
      description: "Bring out something for Bear to chase.",
      location: "bear",
      reward: 24
    },
    {
      id: "flowers",
      label: "Tend the flowers",
      description: "Give the garden a drink and see what's blooming.",
      location: "garden",
      reward: 18
    },
    {
      id: "mailbox",
      label: "Check the mail",
      description: "See whether anything has arrived at the mailbox.",
      location: "mailbox",
      reward: 10
    },
    {
      id: "pond",
      label: "Visit the pond",
      description: "Take a moment by the water.",
      location: "pond",
      reward: 16
    }
  ].map(Object.freeze));

  const items = Object.freeze([
    {
      id: "toy",
      label: "Ribbon wand",
      description: "A fluttery toy that adds 8 points each time you play with Bear.",
      cost: 45
    },
    {
      id: "flower-box",
      label: "Cottage flower box",
      description: "Put a box of pink and cream flowers by the cottage window.",
      cost: 65
    },
    {
      id: "cottage-lights",
      label: "Cottage string lights",
      description: "Hang a strand of warm lights along the cottage.",
      cost: 105
    },
    {
      id: "sunroom",
      label: "Cottage sunroom",
      description: "Build a glass sunroom beside the cottage, with flowers and a sunny spot for Bear.",
      cost: 180
    }
  ].map(Object.freeze));

  const outcomes = {
    breakfast: [
      "Bear circles Mere's ankles once before settling in at the breakfast bowl.",
      "Mere sets the bowl down. Bear is already in position.",
      "Breakfast earns Mere a quiet little chirp from Bear."
    ],
    cuddle: [
      "Bear leans into Mere's side and lets out a slow purr.",
      "Mere sits down, and Bear claims the warm spot beside her.",
      "Mere and Bear sit together long enough for the whole cottage to go quiet."
    ],
    play: [
      "A scrap of paper skitters across the floor. Bear is after it in a flash.",
      "Mere rolls a paper ball past Bear. The first pounce sends it right back.",
      "Bear waits very still until Mere moves the paper ball, then springs."
    ],
    flowers: [
      "Mere waters the flowers. A drop hangs from the edge of a petal.",
      "Mere finds a new bud tucked beneath the older blooms.",
      "The soil darkens under the watering can, and the garden smells like rain."
    ],
    mailbox: [
      "Inside the mailbox is a card with a tiny paw print drawn in one corner.",
      "Mere finds an envelope and takes a moment to admire the postage stamp.",
      "Mere brings in a postcard with a drawing of a little house."
    ],
    pond: [
      "Mere watches a ring of ripples travel all the way to the reeds.",
      "A leaf drifts past while Mere sits at the edge of the pond.",
      "For a moment, the pond holds a perfect reflection of the sky."
    ]
  };

  const playWithToy = [
    "Mere flicks the ribbon, and Bear catches it between two paws.",
    "The ribbon dips out of sight. Bear peeks around the corner, then pounces.",
    "Bear chases the ribbon in a wide circle and settles down with it under one paw."
  ];

  const purchaseOutcomes = {
    toy: "Mere brings home a ribbon wand. Bear watches the tassel all the way to the door.",
    "flower-box": "Mere sets the flower box by the cottage window, where the petals can catch the sun.",
    "cottage-lights": "Mere hangs the lights along the cottage. A soft glow spills over the doorstep.",
    sunroom: "The new sunroom fills with light. Mere sets down the last flowerpot just as Bear finds a sunny spot."
  };

  function readCount(value, fallback, minimum) {
    return Number.isSafeInteger(value) && value >= minimum ? value : fallback;
  }

  function readIds(value, options) {
    if (!Array.isArray(value)) return [];
    return options.filter(({ id }) => value.includes(id)).map(({ id }) => id);
  }

  function readPosition(value) {
    if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
    return { x: value.x, y: value.y };
  }

  function load() {
    let saved;
    try {
      saved = JSON.parse(window.localStorage.getItem(storageKey));
    } catch {
      // The game can still be played if storage is unavailable.
    }

    const data = saved && typeof saved === "object" ? saved : {};
    const points = readCount(data.points, 0, 0);
    return {
      day: readCount(data.day, 1, 1),
      points,
      totalPoints: Math.max(points, readCount(data.totalPoints, 0, 0)),
      completed: readIds(data.completed, chores),
      owned: readIds(data.owned, items),
      position: readPosition(data.position)
    };
  }

  const state = load();

  function save() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Keep the current session playable if a write fails.
    }
  }

  function getState() {
    return {
      ...state,
      completed: [...state.completed],
      owned: [...state.owned],
      position: state.position && { ...state.position },
      milestone: { ...milestone, reached: state.totalPoints >= milestone.target }
    };
  }

  function act(id) {
    const chore = chores.find((entry) => entry.id === id);
    if (!chore) return { ok: false, message: "Choose an activity from your journal." };
    if (state.completed.includes(id)) {
      return { ok: false, message: "Mere has already done that today." };
    }

    const usesToy = id === "play" && state.owned.includes("toy");
    const reward = chore.reward + (usesToy ? toyBonus : 0);
    const crossedMilestone = state.totalPoints < milestone.target
      && state.totalPoints + reward >= milestone.target;
    const lines = usesToy ? playWithToy : outcomes[id];
    let message = lines[(state.day - 1) % lines.length];
    if (crossedMilestone) {
      message += " A letter for Meredith is ready to open in the journal.";
    }

    state.completed.push(id);
    state.points += reward;
    state.totalPoints += reward;
    save();
    return { ok: true, message, reward };
  }

  function buy(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return { ok: false, message: "That item is missing from the shop." };
    if (state.owned.includes(id)) {
      return { ok: false, message: "Mere already has this at the cottage." };
    }
    if (state.points < item.cost) {
      return {
        ok: false,
        message: `Mere needs ${item.cost - state.points} more points for this.`
      };
    }

    state.points -= item.cost;
    state.owned.push(id);
    save();
    return { ok: true, message: purchaseOutcomes[id] };
  }

  function rest() {
    state.day += 1;
    state.completed = [];
    save();
    return { ok: true, message: "Morning comes through the cottage window. Bear stirs." };
  }

  function savePosition(x, y) {
    const position = readPosition({ x, y });
    if (!position || (state.position?.x === x && state.position?.y === y)) return;
    state.position = position;
    save();
  }

  window.CozyLife = Object.freeze({ getState, act, buy, rest, savePosition, items, chores });
})(window);
