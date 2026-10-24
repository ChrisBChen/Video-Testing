# Science notes

## The hypothetical, stated precisely

> **For exactly 30 seconds, every contact (dry) friction force between solid surfaces is zero**: static, kinetic and rolling, including the friction inside bearings and hinges, and the friction that holds knots, screws and nails.  
> **Unchanged:** gravity, normal (contact) forces, air drag, fluid viscosity, and the elasticity and internal strength of materials.

This is the interpretation the video uses everywhere, and it is stated on screen (✗ SNAGGING, ✓ AIR DRAG). It is deliberately *not* "all dissipation switches off": if air drag and internal damping also vanished, a coasting car would never slow down even to air, a dropped ball would bounce forever, and sound would not decay, which is a different (and much less visual) video.

Because normal forces still exist and are perpendicular to the surface, a frictionless contact can only push, never drag sideways. Almost every consequence follows from that one sentence.

## Claim-by-claim

| Moment | What we show | Why it is physically right |
|---|---|---|
| Hook: bench vs Dr. Pip | He shoves the bench; the bench slides one way and he slides the other. The mug stays where it is, then falls. | No horizontal ground force ⇒ horizontal momentum of (bench + person) is conserved; equal-and-opposite recoil. The mug is only coupled to the bench by friction, so the bench leaves from under it (the tablecloth trick, only without needing speed). The bench is drawn as the lighter body, so it moves faster, which is a modelling choice for a cartoon. |
| Hook: standing still is fine | He is upright at frame 0 | On a level floor you need no friction to stand: gravity and the normal force balance. |
| Setup: bumps | Mated teeth: the block must climb a flank to move; bumps flatten and the block glides. | Standard asperity picture. **Simplification:** modern tribology says friction also has an *adhesion* component (and deformation/ploughing), so the narration says "mostly". "×1000" is an illustrative magnification of micrometre-scale asperities. |
| Setup: glide | The block keeps moving, slightly slowed by air. | Newton's first law; air drag still on. |
| Walk | Legs whirl, no travel; he falls straight down. | Walking needs a horizontal ground reaction force (the "push forward" from pushing the ground back); with zero friction that force is zero. Leaning moves the centre of mass out past the feet, but with no horizontal force on the feet the centre of mass can only fall vertically, so he drops straight down and goes nowhere. |
| Pigeon | Flies overhead | Flapping flight uses air, not ground friction (air drag is on). |
| Car: brake / steer / throttle | Throttle: wheels spin, car stays; brake: it doesn't slow; steering: no turn | Tyre–road friction is the only horizontal force a wheel can transmit, and brake pads work by friction too. A car already moving keeps its velocity (minus air drag), and a wheel that was already spinning keeps spinning. |
| Car: hill | Parked cars (and Dr. Pip) all slide down at the same rate; wheels are drawn **not rotating** | Along a slope with no friction a = g·sin θ for any mass (Galileo). Wheels are not turned by the road without friction, so they do not spin. |
| Grip: donut | Pinched donut drops straight out | A pinch holds a weight only through friction; the normal force from the fingers is horizontal. |
| Grip: screws | Screws turn out and drop | A threaded fastener under axial load acts as an inclined plane; it stays put only if it is *self-locking*, i.e. the thread's lead angle is less than the friction angle. With μ = 0 any pull on it unwinds it. (Shear loads are carried by the shank; real-life failures are mostly tension/vibration related, which is the case shown.) |
| Grip: knots and laces | Bow loosens and the lace slithers out | A knot is held entirely by rope-on-rope friction (capstan effect). |
| Grip: glasses | Slide down the nose and fall | They rest on the nose by friction. |
| Return of friction | Everything that was sliding "grabs"; whatever is on top keeps going | Friction acts at the contact patch; the rest of the body keeps its momentum until forces transmit through it: the same mechanism as tripping on a kerb. A car sliding sideways whose tyres suddenly grip can **trip** and roll (tripped rollover). A sled-and-crate and a curb-trip show the same idea. |

## Things deliberately simplified or left out

* **The 30-second HUD clock** runs at 0.97× real time: it reaches 0:30 at video time 31.0 s, so the "friction returns" moment lands on the narration's beat. Everything else runs at normal playback speed except the deliberate quarter-speed slow-motion during the impact.
* The video has the *whole world* switch friction off at once, but shows only a street and a lab. Things we do not show: shoes that cannot keep feet in them, bolts that fall out of bridges, planetary rotation (over 30 s a surface frictionlessly "leaving" the ground's motion is tiny), tools that cannot be used, wind-driven drift, and sound.
* The return of friction is shown as instantaneous for every contact. How violent the real jolt would be depends on everything's velocity: here, the cars and Dr. Pip are the fast things, which is why they are the ones that suffer.
* Hot dogs stopping a distance after the cart: real contact forces take a few milliseconds; the animation exaggerates/slows it for readability.

## References

1. R. P. Feynman, R. B. Leighton, M. Sands, *The Feynman Lectures on Physics*, Vol. I, ch. 12 "Characteristics of Force" (friction as a surface phenomenon). https://www.feynmanlectures.caltech.edu/I_12.html
2. F. P. Bowden and D. Tabor, *The Friction and Lubrication of Solids* (Oxford University Press, 1950/1964): asperity contact, adhesion and ploughing components of friction.
3. B. N. J. Persson, *Sliding Friction: Physical Principles and Applications* (Springer, 2nd ed., 2000).
4. HyperPhysics, "Friction". http://hyperphysics.phy-astr.gsu.edu/hbase/frict.html
5. R. McNeill Alexander, *Principles of Animal Locomotion* (Princeton University Press, 2003): ground reaction forces in walking.
6. R. G. Budynas and J. K. Nisbett, *Shigley's Mechanical Engineering Design*, power screws and self-locking threads (condition: tan λ ≤ μ).
7. B. F. Bayman, "Theory of hitches", *American Journal of Physics* 45, 185 (1977): knots and hitches are held by friction (capstan equation).
8. Galileo Galilei, *Discourses and Mathematical Demonstrations Relating to Two New Sciences* (1638): acceleration on an inclined plane independent of mass.
9. "Tripped rollover" in vehicle-safety literature (e.g. NHTSA rollover research): a sliding vehicle whose tyres suddenly grip a surface can roll over.

Reference details were written from the author's knowledge of these standard sources and not re-checked online during production; check the editions before citing them in anything formal.
