(() => {
  "use strict";

  const width = 320, height = 128;
  const pending = new WeakMap();
  let pictures;

  function loadPicture(path) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "assets/" + path;
    });
  }

  // Frame the same painted cottage at the scale of each little scene.
  function backdrop(ctx, cottage, left, top, span) {
    ctx.fillStyle = "#b68053";
    ctx.fillRect(0, 0, width, height);
    if (!cottage) return;
    const scale = cottage.naturalWidth / 800;
    ctx.drawImage(cottage, left * scale, top * scale, span * scale, span * height / width * scale,
      0, 0, width, height);
  }

  function glow(ctx, x, y, radius, color) {
    const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
    light.addColorStop(0, color);
    light.addColorStop(1, "rgba(255,204,117,0)");
    ctx.fillStyle = light;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function book(ctx, step) {
    // The spine stays in place as the right page lifts and settles.
    ctx.save();
    ctx.translate(135, 67);
    ctx.fillStyle = "#653f34";
    ctx.fillRect(0, 0, 13, 14);
    ctx.fillRect(13, 2, 4, 14);
    ctx.fillRect(17, 0, 13, 14);
    ctx.fillStyle = "#b7604a";
    ctx.fillRect(1, 1, 12, 12);
    ctx.fillRect(17, 1, 12, 12);
    ctx.fillStyle = "#f6e0a8";
    ctx.fillRect(2, 0, 10, 11);
    ctx.fillRect(12, 2, 3, 10);
    ctx.fillStyle = "#fff0c8";
    ctx.fillRect(18, 0, 10, 11);
    ctx.fillRect(16, 2, 3, 10);
    ctx.fillStyle = "#a78960";
    for (const y of [3, 6, 9]) {
      ctx.fillRect(4, y, 6, 1);
      ctx.fillRect(20, y, 5, 1);
    }
    if (step === 1) {
      ctx.fillStyle = "#c7ad83";
      ctx.fillRect(14, -3, 4, 15);
      ctx.fillStyle = "#fff4cc";
      ctx.fillRect(14, -4, 3, 14);
      ctx.fillRect(17, -3, 2, 13);
    }
    ctx.restore();
  }

  function reading(ctx, [cottage, mere, bear], step) {
    backdrop(ctx, cottage, 398, 45, 258);
    ctx.fillStyle = "rgba(53,39,53,0.32)";
    ctx.fillRect(0, 0, width, height);
    glow(ctx, 224, 62, 95, "rgba(255,211,127,0.64)");
    const piece = window.CozyCottage.drawPiece;
    piece(ctx, "amber-lamp", 220, 118, 2.1);
    piece(ctx, "reading-chair", 157, 124, 2.95);
    if (mere) {
      // Her shoes peek out below the cushion, with her skirt resting on the seat.
      ctx.drawImage(mere, 29, 88, 40, 16, 143, 99, 29, 12);
      ctx.drawImage(mere, step === 2 ? 192 : 0, 0, 96, 86, 110, 10, 91, 82);
    }
    book(ctx, step);
    if (bear) {
      // Bear offers a paw, listens, then closes her eyes in Mere's lap.
      const [column, row] = [[1, 3], [0, 0], [3, 0]][step];
      ctx.drawImage(bear, column * 96, row * 104, 96, 104, 147, step === 2 ? 62 : 55, 35, step === 2 ? 31 : 38);
    }
  }

  function robin(ctx, x, y, flying) {
    // A left-facing robin, feet at the supplied perch.
    const pixels = flying ? [
      "         ww    ", "        wlw    ", "       wllw    ", "   www wlllww  ",
      "  wlwlwwlllww  ", " bbwrrrrllww   ", "   wrrrrwwwwwww", "    wrrrllwwwww",
      "     wwwww     "
    ] : [
      "    www        ", "   wlllw       ", "   wlwllw      ", " bbwrrrllww    ",
      "   wrrrllldww  ", "   wrrrlllddw  ", "    wrrlwwwwwww", "     wllww  www",
      "      www      ", "      b b      ", "     bb bb     "
    ];
    const colors = {w:"#583d33", l:"#b78757", d:"#81583f", r:"#e48751", b:"#926234"};
    const scale = 2;
    for (const [row, line] of pixels.entries()) {
      for (let col = 0; col < line.length; col++) {
        const color = colors[line[col]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x + col * scale, y + (row - pixels.length) * scale, scale, scale);
      }
    }
    const beakY = y + ((flying ? 5 : 3) - pixels.length) * scale;
    ctx.fillStyle = "#485331";
    ctx.fillRect(x - 1, beakY + 2, 7, 2);
    ctx.fillRect(x - 5, beakY, 5, 2);
    ctx.fillStyle = "#91a644";
    ctx.fillRect(x - 4, beakY, 4, 1);
  }

  function chirp(ctx, x, y) {
    ctx.fillStyle = "#4c5037";
    ctx.fillRect(x, y + 6, 5, 4); ctx.fillRect(x + 3, y, 2, 8); ctx.fillRect(x + 5, y, 4, 3);
    ctx.fillStyle = "#ffe8a6";
    ctx.fillRect(x + 1, y + 7, 3, 2); ctx.fillRect(x + 4, y + 1, 1, 6); ctx.fillRect(x + 5, y + 1, 3, 1);
  }

  function windowBirds(ctx, [cottage, , bear], step) {
    backdrop(ctx, cottage, 502, 42, 160);
    const piece = window.CozyCottage.drawPiece;
    piece(ctx, "cat-bed", 112, 123, 2.8);
    if (bear) {
      if (step === 0) ctx.drawImage(bear, 0, 0, 96, 104, 74, 26, 74, 80);
      else {
        // Lift Bear into a side-on pose, with the lower paws tucked behind the wicker rim.
        ctx.save();
        ctx.beginPath(); ctx.rect(62, 28, 110, 78); ctx.clip();
        ctx.drawImage(bear, 2 * 96, 104, 96, 104, step === 1 ? 68 : 71, 23, 93, 96);
        ctx.restore();
      }
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(64, 106, 96, 17); ctx.clip();
    piece(ctx, "cat-bed", 112, 123, 2.8);
    ctx.restore();
    if (step === 2) {
      ctx.save();
      ctx.translate(247, 0);
      ctx.scale(-1, 1);
      robin(ctx, 0, 44, true);
      ctx.restore();
    } else robin(ctx, step === 0 ? 183 : 177, 80, false);
    if (step === 1) {
      chirp(ctx, 155, 50);
      chirp(ctx, 201, 35);
    }
  }

  async function draw(canvas, kind, step) {
    const paint = kind === "home-reading" ? reading : windowBirds;
    // A player can turn another page or leave before the pictures have loaded.
    const request = {};
    pending.set(canvas, request);
    pictures ??= Promise.all(["cottage.webp", "pets/mere-atlas.webp", "pets/bear-atlas.webp"].map(loadPicture));
    const images = await pictures;
    if (pending.get(canvas) !== request || !canvas.isConnected) return;
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.scale(canvas.width / width, canvas.height / height);
    ctx.imageSmoothingEnabled = false;
    paint(ctx, images, step);
    ctx.restore();
  }

  window.CottageMoments = Object.freeze({draw});
})();
