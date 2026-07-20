# Level Complete Modal - Debug & Testing Guide

## Summary of Changes

### Problem
Level Complete modal doesn't appear after module completion, and sequential progress-path animation isn't visibly executing.

### Root Causes Identified
1. **Event dispatch flow may be blocked**: Completion events may not dispatch properly
2. **Modal eligibility too strict**: State validation might reject valid modals
3. **Animation not clearly visible**: Need bold, sequential motion

### Solutions Implemented

#### 1. Debug Instrumentation Added

**templateBeta.html** (lines ~679):
```javascript
// Enable debug flag via URL: ?debug=fire
window.__DEBUG_FLOATING_FIRE = !!(window.location.search.indexOf('debug=fire') > -1 || window.__DEBUG_FLOATING_FIRE === true);

// Event monitoring
document.addEventListener('onboarding:modulesUpdated', function (e) {
    console.debug('[Event] onboarding:modulesUpdated fired', e.detail);
});

document.addEventListener('floatingFire:stateChange', function (e) {
    console.debug('[Event] floatingFire:stateChange fired', e.detail);
});
```

**onboardingBeta.js** (lines ~2120):
```javascript
// Debug wrapper for notifyModulesCompletedIfChanged()
// Logs: completion count changes, event dispatch status
```

**useFloatingFireState.js**:
- Already has `DEBUG` flag support
- `logRecompute()` traces state transitions
- Event handler logs modal eligibility

#### 2. Animation Implementation Status

**LevelComplete.js** (COMPLETE):
- ✅ Segment fill animation: 0.7s delay, 1.2s duration, overshoot easing [0.34, 1.56, 0.64, 1]
- ✅ Node pop-in: Spring physics (stiffness: 280, damping: 18) on new nodes only
- ✅ Glow pulse: 2.4s infinite loop, opacity 0.32-0.56, scale 1.5-1.68
- ✅ Replay guard: All durations = 0 when shouldAnimateProgress=false
- ✅ Reduced motion: Instant final state
- ✅ Mobile responsive: 640px breakpoints
- ✅ Accessibility: role="dialog", focus trap, ESC close

## Testing Instructions

### Step 1: Enable Debug Mode
1. Open onboarding page
2. Append `?debug=fire` to URL
   ```
   http://localhost/onboarding/?debug=fire
   ```
3. Open browser DevTools → Console tab

### Step 2: Test Completion Event Flow

**Complete a module (all steps in one stage):**

1. Look for these console logs (in order):
   ```
   [onboarding:notify] {previous: 0, current: 1, willDispatch: true}
   [onboarding:notify] Event dispatched! modulesCompleted=1
   [Event] onboarding:modulesUpdated fired {modulesCompleted: 1}
   [Event] floatingFire:stateChange fired {...}
   [FloatingFireState] recompute:start {reason: "modulesUpdated", ...}
   ```

2. Look for these console logs (modal opening):
   ```
   [FloatingFireState] modal open {reason: "modulesUpdated:next-pending", ...}
   [FloatingFireState] recompute {reason: "modulesUpdated", ...}
   ```

3. **Expected result**: Full-screen modal appears with:
   - Dark semi-transparent backdrop
   - Centered white modal card
   - "Module Complete" title (fades in 0.1s)
   - Progress stepper with filled/current/upcoming nodes
   - Checkmarks appear with 0.24s stagger (step, node, checkmark)
   - Segment fill animates from previous% to current% (0.7s delay, 1.2s fill)
   - Node pop-in with spring bounce
   - Glow pulse around current node (infinite 2.4s loop)
   - "Next module unlocked" feedback text (2.2s delay, 0.35s fade-in)
   - "Continue →" button (2.35s delay, 0.4s slide up)

### Step 3: Test Replay Prevention

1. **Don't** complete another stage
2. Close the modal (ESC, click background, or click "Continue")
3. Reopen without new completion (refresh page or navigate away/back)
4. **Expected result**: Modal shows final state with NO animation replay
   - All animations instant (duration: 0)
   - Segment fill at final percentage
   - Node checkmarks visible
   - Glow pulse NOT animating

### Step 4: Test Next Completion Delta Animation

1. Complete another full stage
2. Watch console for event again
3. **Expected result**: Modal animates ONLY new nodes and segments
   - Previous nodes remain static (no popping)
   - Only new nodes pop with spring
   - Segment fill only animates new range (e.g., 50% → 75%)
   - Glow pulses on new current node

### Step 5: Reduced Motion Test

1. Enable reduced motion in OS:
   - **Windows**: Settings → Ease of Access → Display → Show animations
   - **macOS**: System Preferences → Accessibility → Display → Reduce motion
   - **Linux/Browser**: DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion`

2. Complete a stage
3. **Expected result**: Modal appears with instant state (no animations)
   - All 0s durations
   - Segment fill at 100%
   - All nodes visible immediately

### Step 6: Mobile Test

1. Open DevTools → Device Emulation (640px or smaller)
2. Complete a stage
3. **Expected result**: 
   - Modal responsive (max-width: 42rem)
   - Labels readable at smaller sizes
   - Node spacing proportional
   - Button width fits

## Console Output Reference

### Good Flow
```
[onboarding:notify] {previous: 0, current: 1, willDispatch: true}
[onboarding:notify] Event dispatched! modulesCompleted=1
[Event] onboarding:modulesUpdated fired {modulesCompleted: 1}
[FloatingFireState] recompute:start {reason: "modulesUpdated", latestCompleted: 1, lastShown: 0, pendingList: [1], modalOpen: false}
[FloatingFireState] recompute: opening next pending 1
[FloatingFireState] modal open {reason: "modulesUpdated:next-pending", modalModule: 1, previousModalModule: 0}
[FloatingFireState] recompute {reason: "modulesUpdated", pending: [1], modalOpen: true, modalModule: 1}
[Event] floatingFire:stateChange fired {modalOpen: true, modalModule: 1, previousModalModule: 0, ...}
```

### Duplicate Event (no new completion)
```
[onboarding:notify] {previous: 1, current: 1, willDispatch: false}
→ NO event dispatches (correct - no change)
```

### Error Indicators
```
// ERROR: Function not available
[FloatingFireStreak] getOnboardingCompletedModulesCount unavailable after retries
→ FIX: onboardingBeta.js not loaded or exports missing

// ERROR: Modal not eligible
[FloatingFireState] recompute: no pending modals
→ ANALYSIS: lastShownModule >= latestCompletedModule (expected after celebrating once)

// ERROR: Component missing
[FloatingFireStreak] celebration script ready, re-rendering
→ INFO: LevelComplete.js loaded after init, re-rendering tree

// ERROR: Render exception
[FloatingFireStreak] Render error: [error details]
→ FIX: Check React/Framer Motion availability
```

## Files Modified

1. **vsls:/app/template/html/templateBeta.html**
   - Added `__DEBUG_FLOATING_FIRE` flag
   - Added event listeners for debug logging

2. **vsls:/app/static/js/onboardingBeta.js**
   - Wrapped `notifyModulesCompletedIfChanged()` with debug instrumentation

3. **vsls:/app/static/js/hooks/useFloatingFireState.js**
   - Added debug function stub (already had DEBUG flag)

4. **vsls:/app/static/js/components/LevelComplete.js**
   - COMPLETE with full animation implementation (no changes needed)

## Next Steps

1. **Test with debug mode** using instructions above
2. **Review console output** for any errors or missing events
3. **Identify bottleneck**:
   - If event doesn't dispatch → problem in onboardingBeta.js
   - If event dispatches but state doesn't change → problem in useFloatingFireState.js
   - If state changes but modal doesn't show → problem in FloatingFireStreak/LevelComplete mounting
   - If modal shows but no animation → problem in Framer Motion library loading
4. **Report findings** with console logs for further debugging

## Quick Test Checklist

- [ ] Complete first stage
- [ ] See modal appear
- [ ] See segment fill animate (1.2s bold motion)
- [ ] See node checkmarks pop (spring bounce)
- [ ] See glow pulse around current node
- [ ] Close modal
- [ ] Reopen without new stage → no replay animations
- [ ] Complete next stage
- [ ] Only new nodes animate
- [ ] Reduce motion setting → instant final state
- [ ] Mobile size (640px) → responsive layout
