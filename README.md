# meredith simulator

A cozy browser adventure made for Meredith and her cat, Bear. Give Bear breakfast and she’ll follow Mere around the meadow. Spend the morning picking apples or learning a birdsong, then bring something home for the cottage. [Play on Vercel](https://meredith-sim.vercel.app/)

## Your first day

1. Walk up to Bear and choose **Serve breakfast** to earn 20 cozy points. Open the **Journal** for more errands.
2. Follow the meadow’s south trail past the sign to reach Bramblebrook Orchard. Pick apples, echo the birdsong, or follow the clues to the missing bell. The south trail in the orchard leads home.
3. Open **Shop → Furnishings**. Breakfast alone buys Bear’s bed for 12 points. Walk up the cottage steps and choose **Decorate** to put her basket at the **Window**, where she can watch the birds.
4. Walk down across the doormat to leave, or visit Mere’s bed to start a new day. Rest makes the daily errands available again and carries purchases and adventure progress forward.

| Action | Controls |
| --- | --- |
| Walk | Arrow keys, WASD, the on-screen directional pad, or tap the ground |
| Talk to Bear or use a landmark | Press E or Space nearby, use the gold A button, or tap the landmark |
| Travel | Walk through a doorway or trail exit, or choose a destination in **Places** |
| Open the journal | Press J or choose **Journal** |
| Go back | Press Escape or use the B button |
| Play the lo-fi soundtrack | Select **Sound off** to turn it on |

### Where progress lives

Progress saves automatically in the browser. Return to the production URL in the same browser profile to resume with your points, purchases, furniture placement, adventure progress, and last location. Localhost, Vercel previews, other devices, and other browser profiles have separate saves. Clearing the game’s site data erases that browser’s save.

## Run locally

From the directory containing `dist/` and `build_gift.py`, run the following command and open [the local game](http://localhost:8000/). In the original workspace that directory is `game/`. In a fresh GitHub clone it’s the repository root.

```sh
python3 -m http.server 8000 --bind localhost --directory dist
```

Edit the files in `dist/` directly and refresh the browser. The game uses HTML, CSS, canvas, and classic JavaScript. All art, sprites, and fonts ship with the game, and the browser synthesizes the music.

### Make an offline gift copy

```sh
python3 build_gift.py
```

With Python 3.9 or newer, this writes `../meredith simulator.html` beside the repository. Open that file directly in a browser or give it to someone to play offline. The Vercel release uses `dist/`.

## Deploy to Vercel

Vercel is the only deployment target. Its GitHub integration publishes pushes to `main`. Use these settings for the connected project. [Vercel build settings](https://vercel.com/docs/deployments/configure-a-build)

| Setting | Value |
| --- | --- |
| Git repository | `JeffMorhous/meredith-sim` |
| Production branch | `main` |
| Root Directory | Repository root (default, `.`) |
| Framework Preset | `Other` |
| Build Command | Enable Override and leave the command empty |
| Output Directory | Enable Override and enter `dist` |

If Vercel shows “nothing is here,” check that the deployed commit contains `dist/index.html` and that the output directory is `dist`. Save any corrected settings and redeploy that commit.

For the source map, save compatibility rules, and checks to run after a change, see the [contributor guide](AGENTS.md).
