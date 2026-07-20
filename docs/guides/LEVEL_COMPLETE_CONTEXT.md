# Level Complete Modal Context

## Purpose
This document explains how the Level Complete celebration modal works so future AI/code updates can safely modify UI and animation behavior without breaking state logic.

## Source Of Truth Files
- Modal renderer: app/static/js/components/LevelCompleteVanilla.js
- State lifecycle: app/static/js/hooks/useFloatingFireState.js
- Bootstrap/integration: app/template/html/templateBeta.html

## Runtime Wiring
1. templateBeta bootstraps FloatingFireStreak and obtains state from useFloatingFireState.
2. If window.renderLevelCompleteModal exists, templateBeta calls it with:
   - isOpen
   - currentLevel
   - previousLevel
   - stepLabels
   - totalStages
   - completionPercent
   - previousCompletionPercent
   - shouldAnimateProgress
   - onClose
3. LevelCompleteVanilla renders/updates a single modal root and plays animation sequences.

## Critical State Rules
- previousModalModule must come from completion history, not transient modalModule that may reset to 0.
- useFloatingFireState.openModal should anchor previousModalModule to lastShownModule/previous history.
- closeModal should persist lastShownModule and clear pending modal safely.

## Progress Fill Contract
- Fill should start from previous completion and end at current completion.
- Rail fill should align to node centers, not naive linear stage fraction.
- Recommended conversion:
  - stageToRailPercent(completed, total) => ((index + 0.5) / total) * 100, where index = completed - 1.
- First completion must show visible fill to node 1 (not 0-width look).

## Node-Hit Animation Contract
- As fill reaches each newly completed node, trigger in this order:
  1. Node hit scale: 1 -> 1.16 -> 1
  2. Soft glow pulse
  3. Checkmark draw/fade-in
- Trigger timing should be computed from fill travel ratio so hit happens when fill reaches node center.
- Future nodes should stay visible but inactive.
- Previously completed nodes can render as done immediately.

## Open/Close Modal Animation Contract
- Backdrop should opacity-ramp on open and fade on close.
- Modal shell enters independently (translate/scale/opacity).
- Avoid instant class add on first mount if browser skips transition paint:
  - force closed paint first, then set open class on next frame.

## Reduced Motion
- Reduced motion should skip scale/glow/keyframed effects.
- Completed checks should appear instantly.
- Keep modal still functional and readable.

## Common Regression Symptoms
- Fill starts from zero unexpectedly:
  - previousModalModule likely derived from modalModule instead of lastShownModule history.
- No visible backdrop animation:
  - open class applied in same paint as mount or backdrop opacity too subtle.
- First module looks unfilled:
  - fill math not targeting node center.
- Node hit timing feels detached from fill:
  - fixed delays used instead of fill-ratio-based timing.

## Safe Edit Checklist
- Keep window.renderLevelCompleteModal and window.destroyLevelCompleteModal exports intact.
- Preserve focus trap, Escape close, backdrop click close, and focus restore behavior.
- Validate all changed files after edits:
  - app/static/js/components/LevelCompleteVanilla.js
  - app/static/js/hooks/useFloatingFireState.js
  - app/template/html/templateBeta.html
- Prefer minimal edits and do not change unrelated onboarding logic.
