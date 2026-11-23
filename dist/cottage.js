(() => {
  "use strict";

  const items = [
    {id: "cat-bed", label: "Bear’s bed", description: "A soft rose cushion in a low wicker basket.", cost: 12},
    {id: "braided-rug", label: "Braided rug", description: "Sage and cream wool, braided by hand.", cost: 18},
    {id: "amber-lamp", label: "Amber lamp", description: "A pleated shade that glows like late afternoon.", cost: 26},
    {id: "fern-pot", label: "Potted fern", description: "A bright little fern in a blue stoneware pot.", cost: 32},
    {id: "reading-chair", label: "Reading chair", description: "A cushioned oak chair with room for a book and a cat.", cost: 42}
  ].map(item => Object.freeze({...item, category: "furniture"}));
  const purchaseOutcomes = {
    "cat-bed": "Mere tucks the cushion into its wicker basket. Bear follows it with curious eyes.",
    "braided-rug": "Mere carries home a roll of braided wool for the cottage floor.",
    "amber-lamp": "The new lamp casts a warm circle of light when Mere tries it.",
    "fern-pot": "Mere carries the fern home with both hands to keep its new fronds safe.",
    "reading-chair": "Mere brings home an oak chair. It looks just right for a long chapter."
  };
  const labels = Object.fromEntries(items.map(({id, label}) => [id, label]));
  labels["flower-box"] = "Flower box";

  const slots = [
    {id: "window", label: "Window", x: 342, y: 205},
    {id: "hearth", label: "Bookshelf", x: 658, y: 205},
    {id: "left", label: "Kitchen", x: 193, y: 274},
    {id: "middle", label: "Center", x: 502, y: 282},
    {id: "right", label: "Sunny spot", x: 786, y: 296},
    {id: "bedside", label: "Bedside", x: 907, y: 246}
  ].map(Object.freeze);
  const slotById = new Map(slots.map(slot => [slot.id, slot]));
  const canPlace = (itemId, slotId) => Object.hasOwn(labels, itemId) && slotById.has(slotId);
  const places = {
    "home-exit": {name: "Front door", line: "The path to the meadow is just outside."},
    bed: {name: "Mere’s bed", line: "The patchwork quilt is ready for another night."},
    decorate: {name: "Decorating table", line: "Choose where to put the pieces you’ve brought home."}
  };
  const box = (left, top, right, bottom) => [[left, top], [right, top], [right, bottom], [left, bottom]];

  const wood = {ink: "#4c2c24", deep: "#71422a", shade: "#955831", mid: "#b97843", light: "#d49051", gold: "#edb46b"};
  const cloth = {ink: "#704149", deep: "#9c525e", mid: "#c16e77", rose: "#de9091", pale: "#f0b3a8", cream: "#f7d2b4"};
  const fern = ["#264932", "#3c6134", "#5d843c", "#8da84a", "#b3c75a"];
  const cross = (p, x, y, color, center) => {
    p(x, y - 1, 1, 3, color);
    p(x - 1, y, 3, 1, color);
    p(x, y, 1, 1, center);
  };

  // Sprites use a one-pixel grid, then render at two world units per pixel.
  const art = {
    "cat-bed": {size: [31, 17], footprint: [25, 7], paint(p) {
      p(6, 1, 19, 15, wood.ink); p(3, 3, 25, 12, wood.ink); p(1, 5, 29, 8, wood.ink);
      p(4, 5, 23, 9, wood.shade); p(7, 2, 17, 3, wood.light); p(4, 4, 23, 2, wood.gold);
      p(2, 6, 27, 5, wood.light); p(7, 4, 17, 8, cloth.ink); p(5, 6, 21, 4, cloth.ink);
      p(8, 5, 15, 6, cloth.rose); p(6, 7, 19, 3, cloth.mid); p(9, 6, 13, 2, cloth.pale);
      p(11, 6, 6, 1, cloth.cream); p(22, 8, 2, 2, cloth.deep);
      p(3, 11, 25, 3, wood.mid); p(6, 14, 19, 1, wood.shade); p(4, 11, 23, 1, wood.gold);
      for (let x = 6; x < 27; x += 3) {
        p(x, 12, 1, 1, wood.deep); p(x - 1, 13, 2, 1, wood.light);
      }
    }},
    "braided-rug": {size: [48, 18], paint(p) {
      const rowEdges = [10, 7, 5, 3, 2, 1, 1, 0, 0, 0, 0, 1, 1, 2, 3, 5, 7, 10];
      const yarn = ["#526449", "#809063", "#acb07c", "#e7c994", "#f3da9f", "#a77b5a"];
      rowEdges.forEach((edge, y) => {
        p(edge, y, 48 - edge * 2, 1, yarn[0]);
        if (y > 0 && y < 17) p(edge + 1, y, 46 - edge * 2, 1, yarn[1]);
        if (y > 2 && y < 15) p(edge + 4, y, 40 - edge * 2, 1, yarn[3]);
        if (y > 4 && y < 13) p(edge + 6, y, 36 - edge * 2, 1, yarn[2]);
        for (let x = edge + 2; x < 47 - edge; x += 3) {
          if (y === 1 || y === 16 || x < edge + 6 || x > 41 - edge) p(x, y, 1, 1, yarn[y % 2 ? 4 : 2]);
        }
      });
      for (let center = 12; center < 42; center += 8) {
        p(center, 6, 1, 1, yarn[5]); p(center - 1, 7, 3, 3, yarn[5]); p(center, 10, 1, 1, yarn[5]);
        p(center, 8, 1, 1, yarn[4]);
      }
    }},
    "amber-lamp": {size: [20, 30], footprint: [13, 4], paint(p) {
      const shade = ["#5f362a", "#b96f40", "#dda158", "#f0ba6b", "#ffe4a4"];
      p(8, 11, 4, 15, wood.ink); p(9, 13, 1, 13, wood.gold);
      p(6, 25, 8, 3, wood.ink); p(4, 27, 12, 2, wood.ink); p(6, 27, 8, 1, wood.mid); p(7, 26, 5, 1, wood.gold);
      p(6, 1, 8, 13, shade[0]); p(4, 3, 12, 10, shade[0]); p(3, 6, 14, 7, shade[0]); p(2, 8, 16, 5, shade[0]);
      p(7, 2, 6, 10, shade[3]); p(5, 4, 10, 8, shade[2]); p(4, 7, 12, 4, shade[2]);
      p(7, 3, 1, 8, shade[1]); p(10, 3, 1, 8, shade[4]); p(13, 6, 1, 5, shade[3]);
      p(3, 11, 14, 1, shade[4]); p(6, 13, 8, 1, shade[2]); p(13, 14, 1, 4, shade[1]); p(13, 18, 1, 1, shade[4]);
    }},
    "fern-pot": {size: [27, 29], footprint: [15, 6], paint(p) {
      p(12, 2, 2, 17, fern[0]); p(12, 2, 1, 11, fern[3]);
      for (const [x,y,step] of [[11,4,-1],[13,6,1],[11,9,-1],[14,11,1],[12,14,-1],[14,15,1]]) {
        for (let i = 0; i < 4; i++) {
          const leafX = x + (i * 2 - 1) * step;
          p(leafX, y + 2 - i, 3, 3, fern[1]);
          p(leafX + 1, y + 1 - i, 2, 2, fern[(i % 3) + 2]);
        }
      }
      p(7, 17, 13, 3, "#263a49"); p(8, 20, 11, 5, "#263a49"); p(9, 25, 9, 3, "#263a49");
      p(8, 18, 11, 1, "#9cbeaf"); p(9, 20, 9, 5, "#578988"); p(10, 25, 7, 2, "#3c676e");
      p(10, 21, 3, 4, "#75a5a0"); p(15, 22, 2, 3, "#3c676e"); p(11, 26, 3, 1, "#578988");
    }},
    "reading-chair": {size: [28, 30], footprint: [22, 8], paint(p) {
      p(5, 3, 18, 20, wood.ink); p(8, 1, 12, 4, wood.ink); p(3, 11, 22, 13, wood.ink);
      p(6, 4, 16, 14, wood.mid); p(8, 2, 12, 3, wood.light); p(6, 4, 16, 1, wood.gold);
      p(8, 5, 12, 10, "#516348"); p(9, 6, 10, 8, "#889966"); p(10, 7, 8, 1, "#bdc086");
      p(6, 22, 3, 7, wood.ink); p(19, 22, 3, 7, wood.ink);
      p(7, 23, 1, 5, wood.mid); p(20, 23, 1, 5, wood.mid);
      p(3, 13, 4, 9, wood.deep); p(21, 13, 4, 9, wood.deep);
      p(2, 12, 6, 2, wood.ink); p(20, 12, 6, 2, wood.ink);
      p(3, 12, 4, 1, wood.gold); p(21, 12, 4, 1, wood.gold);
      p(8, 16, 12, 5, "#b2aa77"); p(6, 17, 16, 3, "#d7c991"); p(8, 18, 12, 1, "#ebdba6");
      p(4, 21, 20, 2, wood.light); p(5, 22, 18, 1, wood.mid);
      p(12, 10, 1, 1, "#667755"); p(16, 10, 1, 1, "#667755");
    }},
    "flower-box": {size: [30, 20], footprint: [25, 7], paint(p) {
      p(3, 10, 24, 8, wood.ink); p(5, 17, 20, 2, wood.ink); p(2, 10, 26, 3, wood.ink);
      p(4, 13, 22, 4, wood.mid); p(5, 17, 20, 1, wood.shade);
      p(3, 11, 24, 1, wood.gold); p(6, 14, 18, 1, wood.light);
      p(7, 14, 1, 3, wood.deep); p(22, 14, 1, 3, wood.deep);
      for (const [x,y,cream] of [[5,7,false],[8,5,true],[12,7,false],[15,3,false],[19,5,true],[23,4,false],[26,7,true]]) {
        p(x, y + 1, 1, 10 - y, fern[1]); p(x - 1, 9, 3, 1, fern[2]);
        cross(p, x, y, cream ? "#f9e7b7" : "#db858b", cream ? "#ce8d43" : "#f4bc9b");
      }
    }}
  };

  const spriteCache = new Map();
  function sprite(itemId) {
    if (spriteCache.has(itemId)) return spriteCache.get(itemId);
    const definition = art[itemId];
    const canvas = document.createElement("canvas");
    [canvas.width, canvas.height] = definition.size;
    const ctx = canvas.getContext("2d");
    definition.paint((x, y, width, height, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
    });
    spriteCache.set(itemId, canvas);
    return canvas;
  }

  function drawPiece(ctx, itemId, x, y, scale = 2) {
    const picture = sprite(itemId);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (art[itemId].footprint) {
      const [rx, ry] = art[itemId].footprint;
      ctx.fillStyle = "#502e2244";
      ctx.beginPath();
      ctx.ellipse(x, y - scale, rx * scale / 2, ry * scale / 2, 0, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.drawImage(picture, Math.round(x - picture.width * scale / 2), Math.round(y - picture.height * scale), picture.width * scale, picture.height * scale);
    ctx.restore();
  }

  function placedPieces(state) {
    return slots.flatMap(slot => {
      const itemId = state.decor?.[slot.id];
      return canPlace(itemId, slot.id) ? [{...slot, itemId}] : [];
    });
  }

  function drawFloor(ctx, pieces) {
    for (const {itemId, x, y} of pieces) {
      if (itemId === "braided-rug") drawPiece(ctx, itemId, x, y);
      if (itemId === "amber-lamp") {
        const glow = ctx.createRadialGradient(x, y - 20, 2, x, y - 20, 48);
        glow.addColorStop(0, "#ffcd7380");
        glow.addColorStop(1, "#ffc56b00");
        ctx.fillStyle = glow;
        ctx.fillRect(x - 48, y - 68, 96, 96);
      }
    }
  }

  const scene = {
    id: "interior",
    name: "Mere’s cottage",
    background: "cottage.webp",
    spawn: {x: 500, y: 322},
    bearSpawn: {x: 535, y: 321},
    morningSpawn: {x: 809, y: 225},
    spots: {
      "home-exit": {x: 500, y: 359, area: [425, 338, 575, 408]},
      bed: {x: 834, y: 218, area: [783, 67, 909, 207]},
      decorate: {x: 463, y: 191, area: [407, 69, 523, 178]}
    },
    boundary: [[90,160], [898,160], [938,211], [973,369], [579,369], [572,403], [428,403], [421,369], [28,369], [49,284], [71,245]],
    obstacles: [box(81, 155, 277, 173), box(412, 156, 518, 176), box(542, 154, 641, 171), box(784, 155, 912, 205)],
    draw(ctx, state, {floorOnly = false} = {}) {
      const pieces = placedPieces(state);
      drawFloor(ctx, pieces);
      if (!floorOnly) {
        for (const {itemId, x, y} of pieces.sort((a, b) => a.y - b.y)) {
          if (art[itemId].footprint) drawPiece(ctx, itemId, x, y);
        }
      }
    },
    entities(state) {
      return placedPieces(state).filter(({itemId}) => art[itemId].footprint)
        .map(({itemId, x, y}) => ({y, draw: ctx => drawPiece(ctx, itemId, x, y)}));
    },
    isBlocked(x, y, state) {
      return slots.some(slot => {
        const footprint = art[state?.decor?.[slot.id]]?.footprint;
        if (!footprint) return false;
        const [rx, ry] = footprint;
        return ((x - slot.x) / (rx + 3)) ** 2 + ((y - slot.y + 4) / (ry + 5)) ** 2 < 1;
      });
    }
  };

  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));

  function open({panel, shell, life, world, shop, close, onChange, initialItemId}) {
    shell("decor", "Decorate the cottage", `<section class="cottage-editor">
      <div class="cottage-tray" role="group" aria-label="Owned furnishings"></div>
      <div class="cottage-layout" role="group" aria-label="Cottage floor plan">
        <canvas class="cottage-preview" width="1000" height="409" aria-hidden="true"></canvas>
        <div class="cottage-markers"></div>
      </div>
      <p class="cottage-status" role="status"></p>
      <div class="cottage-actions"></div>
    </section>`);
    const editor = panel.querySelector(".cottage-editor");
    const tray = editor.querySelector(".cottage-tray");
    const markers = editor.querySelector(".cottage-markers");
    const status = editor.querySelector(".cottage-status");
    const buttons = editor.querySelector(".cottage-actions");
    const ctx = editor.querySelector(".cottage-preview").getContext("2d");
    let state = life.getState();
    const owned = Object.keys(labels).filter(id => state.owned.includes(id));
    let itemId = owned.includes(initialItemId) ? initialItemId : owned[0];
    const findSlot = () => slots.find(slot => state.decor?.[slot.id] === itemId);
    let target = findSlot()?.id;
    let message = "";

    function render(focusSelector) {
      state = life.getState();
      const current = findSlot();
      const selected = slotById.get(target);
      const occupant = selected && state.decor?.[selected.id];
      const replacing = occupant && occupant !== itemId;
      const canSave = itemId && selected && current?.id !== target;
      const hint = !itemId ? "Bring home a furnishing from the meadow market."
        : replacing ? `${labels[occupant]} will go back into storage.`
        : selected ? `${labels[itemId]} · ${selected.label}`
        : `Choose a spot for ${labels[itemId]}.`;
      const choices = owned.map(id => {
        const slot = slots.find(entry => state.decor?.[entry.id] === id);
        const location = slot?.label || "In storage";
        return `<button type="button" class="cottage-piece" data-piece="${id}" aria-label="${escapeHtml(labels[id])}, ${location}" aria-pressed="${id === itemId}"><canvas width="44" height="29" aria-hidden="true"></canvas><span>${escapeHtml(labels[id])}</span><small>${location}</small></button>`;
      }).join("");
      const marks = itemId ? slots.map(slot => {
        const id = state.decor?.[slot.id];
        const name = id ? `${slot.label}, ${labels[id]}` : `${slot.label}, empty`;
        return `<button type="button" class="cottage-slot" style="--slot-x:${slot.x / 10}%;--slot-y:${slot.y / 4.09}%" data-slot="${slot.id}" data-occupied="${Boolean(id)}" aria-pressed="${slot.id === target}" aria-label="${escapeHtml(name)}"><span>${slot.label}</span></button>`;
      }).join("") : "";
      const actions = itemId
        ? `<button type="button" class="small-action" data-decor-command="put"${canSave ? "" : " disabled"}>${replacing ? "Replace" : current ? "Move here" : "Place here"}</button>${current ? '<button type="button" class="cottage-secondary" data-decor-command="store">Put away</button>' : ""}`
        : '<button type="button" class="small-action" data-decor-command="shop">Browse furnishings</button>';
      tray.innerHTML = choices;
      markers.innerHTML = marks;
      status.textContent = message || hint;
      buttons.innerHTML = actions + (itemId ? '<button type="button" class="cottage-secondary cottage-done" data-decor-command="close">Done</button>' : "");
      for (const button of editor.querySelectorAll("[data-piece]")) {
        drawPiece(button.querySelector("canvas").getContext("2d"), button.dataset.piece, 22, 29, 0.9);
      }
      const preview = {...state.decor};
      if (canSave) {
        if (current) delete preview[current.id];
        preview[target] = itemId;
      }
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      scene.draw(ctx, {decor: preview});
      if (focusSelector) editor.querySelector(focusSelector)?.focus({preventScroll: true});
    }

    editor.addEventListener("click", event => {
      const button = event.target.closest("button");
      if (!button || button.disabled) return;
      const {piece, slot, decorCommand} = button.dataset;
      message = "";
      if (piece) {
        itemId = piece;
        target = findSlot()?.id;
        render(`[data-piece="${piece}"]`);
      } else if (slot) {
        target = slot;
        render(`[data-slot="${slot}"]`);
      } else if (decorCommand === "shop") shop();
      else if (decorCommand === "close") close();
      else if (decorCommand === "store" || decorCommand === "put") {
        const puttingAway = decorCommand === "store";
        const response = life.place(itemId, puttingAway ? null : target);
        if (response.ok) {
          if (puttingAway) target = undefined;
          if (onChange) onChange(response);
          else world.sync();
        }
        message = response.message;
        render(`[data-piece="${itemId}"]`);
      }
    });
    render();
  }

  function drawIcon(canvas, itemId) {
    drawPiece(canvas.getContext("2d"), itemId, canvas.width / 2, canvas.height - 2, 0.85);
  }

  window.CozyCottage = Object.freeze({scene, places, items, purchaseOutcomes, slots, canPlace, drawIcon, open});
})();
