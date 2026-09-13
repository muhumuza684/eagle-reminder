# index.tsx — integration guide

`review.tsx` and `settings.tsx` are included in this package as finished
files. `index.tsx` is not, because the two patches genuinely split the
"Don't Let Me Forget" feature into complementary halves inside the same
file, and reconciling that requires your actual repo (styles, other hooks,
`_core`, `_layout.tsx`) that neither patch — nor this merge — has access to.
This is the precise map of what to take from where.

Apply against your real `app/(tabs)/index.tsx`, importing everything from
the merged `lib/critical-cascade.ts`, `lib/native-services.ts`, and
`lib/preferences.ts` in this package (all three replace the old
`critical-checkpoints.ts` / `user-preferences.ts` imports either patch used).

## 1. Imports

Replace whatever critical-commitment imports either patch added with:

```ts
import {
  acknowledgeCheckpoint,
  buildCriticalCheckpoints,
  cascadeStatus,
  escalateCheckpoint,
  expireUnacknowledged,
  parseCriticalCommitment,
  shouldEscalate,
  type Checkpoint,
} from "@/lib/critical-cascade";
import {
  cancelCriticalCascade,
  openMeeting,
  scheduleCommitmentMeeting,
  scheduleCriticalCascade,
  speakCheckpointEscalation,
  speakEagle,
} from "@/lib/native-services";
```

## 2. State — take from **both**

From **section7** (the acknowledge/escalate machine):
```ts
const [checkpoints, setCheckpoints] = useState<Record<string, Checkpoint[]>>({});
const escalatedRef = useRef<Set<string>>(new Set());
```

From **next-sequence** (the capture-time ambiguity flow):
```ts
const [showCriticalPrompt, setShowCriticalPrompt] = useState(false);
const [criticalDeadlineInput, setCriticalDeadlineInput] = useState("");
const [criticalAmbiguous, setCriticalAmbiguous] = useState(false);
const [criticalError, setCriticalError] = useState("");
const [pendingCriticalTitle, setPendingCriticalTitle] = useState<string | null>(null);
```

Drop next-sequence's `criticalNotificationIds = useRef<Record<string, string[]>>({})`
in favor of storing the returned ids **inside** each checkpoint's tracking
structure alongside `checkpoints` state above — otherwise you end up with
two parallel maps keyed by commitment id that can drift out of sync. Simplest
fix: keep a second small ref `cascadeNotificationIds = useRef<Record<string, string[]>>({})`
purely for cancellation, populated by the scheduling call in step 4.

## 3. Capture flow (from next-sequence, mostly as-is)

Keep next-sequence's capture handler that calls `parseCriticalCommitment(capture)`,
and on `result.ambiguous || !result.deadline`, sets `pendingCriticalTitle` and
opens `showCriticalPrompt`. Keep its `commitCritical(deadline, titleOverride?)`
function that builds the commitment with `criticalDeadline: deadline.toISOString()`.

**Change one thing:** wherever `commitCritical` calls
`scheduleCriticalCascade(...).then((ids) => { criticalNotificationIds.current[next.id] = ids; })`,
replace `criticalNotificationIds` with the `cascadeNotificationIds` ref from
step 2, and **also** seed local `checkpoints` state so the acknowledge/escalate
tick loop (step 5) has something to operate on:

```ts
const newCheckpoints = buildCriticalCheckpoints(deadline);
setCheckpoints((all) => ({ ...all, [next.id]: newCheckpoints }));
scheduleCriticalCascade(next.id, next.title, newCheckpoints).then((ids) => {
  cascadeNotificationIds.current[next.id] = ids;
});
```

This is the one real seam: next-sequence's flow produces the checkpoints but
never fed them into a status-tracked structure, because it had no
acknowledge/escalate model at all. This line is what connects the two halves.

## 4. Persistence (from section7, as-is)

Keep section7's local-persistence effects verbatim:

```ts
useEffect(() => {
  AsyncStorage.getItem(CHECKPOINTS_STORAGE_KEY).then((stored) => {
    if (stored) setCheckpoints(JSON.parse(stored));
  });
}, []);
useEffect(() => { AsyncStorage.setItem(CHECKPOINTS_STORAGE_KEY, JSON.stringify(checkpoints)); }, [checkpoints]);
```

## 5. The 30-second tick loop (from section7, as-is)

Keep section7's tick effect that walks `checkpoints`, calls `shouldEscalate` /
`escalateCheckpoint` / `expireUnacknowledged`, and calls
`speakCheckpointEscalation` once per checkpoint via the `escalatedRef` guard.
No changes needed here — it already operates purely on the merged
`Checkpoint[]` shape.

**Add one line** when a checkpoint's status becomes `"acknowledged"` (i.e. the
user taps to acknowledge it in the UI, wherever that control lives) or when it
finally clears: call `cancelCriticalCascade(cascadeNotificationIds.current[commitmentId])`
so the scheduled local notification for that checkpoint doesn't fire after
it's already been handled. Neither original patch did this — section7 had no
way to cancel (its scheduling function didn't return ids), and next-sequence
never wired its cancel function to anything. This is a genuine gap-fill, not
a pick between two options.

## 6. Cloud sync

Use next-sequence's `create`/`update` mutation calls (they already send
`criticalDeadline`), but change the `checkpoints` mutation call to
`trpc.checkpoints.update.mutate({ id, status })` — matching the merged
router — instead of section7's `setCritical`/`checkpoints.update` two-call
pattern or next-sequence's separate `acknowledge`/`escalate` calls.

## 7. Cascade status badge on Today

Keep section7's `cascadeMeta`/label helper (`"Both checkpoints acknowledged"` /
`"A checkpoint went unacknowledged"`) driven by `cascadeStatus(checkpoints[id] ?? [])`
— this works unchanged against the merged module.

## Suggested order to do this in

1. Drop in the merged `lib/` files and `server/` files from this package first — they don't depend on `index.tsx` at all and are fully self-contained.
2. Apply `review.tsx` and `settings.tsx` as complete replacements.
3. Do the `index.tsx` splice last, section by section as above, and run `tsc --noEmit` after each section rather than all at once — the two patches never saw each other's code, so the seams (step 3 and step 5's cancel call) are the only genuinely new logic; everything else is a straight copy from one side or the other.
