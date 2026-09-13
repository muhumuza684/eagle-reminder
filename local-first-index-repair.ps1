cd C:\Dev\d-eagle-hub

$backup = ".\backup-local-first-20260911-210139"
$indexPath = "app\(tabs)\index.tsx"
$backupIndex = Join-Path $backup $indexPath

if (-not (Test-Path $backupIndex)) {
    Write-Host "Backup index file not found: $backupIndex"
    exit 1
}

Copy-Item $backupIndex $indexPath -Force
$text = Get-Content $indexPath -Raw

# Remove cloud imports.
$text = $text.Replace('import { useAuth } from "@/hooks/use-auth";' + "`r`n", "")
$text = $text.Replace('import { trpc } from "@/lib/trpc";' + "`r`n", "")

# Replace the cloud setup block with inert local-only adapters.
$cloudSetupPattern = '(?s)  const \{ isAuthenticated \} = useAuth\(\);.*?  const registerPushToken = trpc\.notifications\.registerToken\.useMutation\(\);'
$cloudSetupReplacement = @'
  // Local-first mode: no account, API, or cloud synchronization.
  const isAuthenticated = false;
  const cloudCommitments = { data: undefined, isLoading: false };
  const createCloudCommitment = { isPending: false, mutate: (..._args: any[]) => undefined };
  const updateCloudCommitment = { mutate: (..._args: any[]) => undefined };
  const deleteCloudCommitment = { mutate: (..._args: any[]) => undefined };
  const updateLocale = { mutate: (..._args: any[]) => undefined };
  const registerPushToken = { mutate: (..._args: any[]) => undefined };
'@
$text = [regex]::Replace($text, $cloudSetupPattern, $cloudSetupReplacement)

# Replace remaining tRPC mutation declarations.
$text = [regex]::Replace(
    $text,
    '  const upsertCloudSnapshot = trpc\.snapshots\.upsert\.useMutation\(\);',
    '  const upsertCloudSnapshot = { mutate: (..._args: any[]) => undefined };'
)
$text = [regex]::Replace(
    $text,
    '  const checkpointUpdateCloud = trpc\.checkpoints\.update\.useMutation\(\);',
    '  const checkpointUpdateCloud = { mutate: (..._args: any[]) => undefined };'
)

# Remove cloud hydration effect, preserving local AsyncStorage hydration below it.
$cloudHydrationPattern = '(?s)\r?\n  useEffect\(\(\) => \{\r?\n    if \(isAuthenticated && cloudCommitments\.data !== undefined\).*?\r?\n  \}, \[isAuthenticated, cloudCommitments\.data\]\);'
$text = [regex]::Replace($text, $cloudHydrationPattern, '')

# Replace the entire commitment persistence/snapshot effect with local-only logic.
$oldEffectPattern = '(?s)  useEffect\(\(\) => \{\r?\n    AsyncStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(commitments\)\);.*?\r?\n  \}, \[commitments, isAuthenticated, upsertCloudSnapshot\]\);'
$newEffect = @'
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(commitments));
    const snapshotItems = commitments.map((item) => ({
      status: item.status,
      category: item.category,
      priority: item.priority,
    }));
    recordTodaySnapshot(snapshotItems).catch(() => undefined);
  }, [commitments]);
'@
if ($text -notmatch $oldEffectPattern) {
    Write-Host "Could not locate the malformed persistence effect. Showing nearby matches:"
    Select-String -Path $indexPath -Pattern "AsyncStorage.setItem\(STORAGE_KEY|recordTodaySnapshot|upsertCloudSnapshot" -Context 2,3
    exit 1
}
$text = [regex]::Replace($text, $oldEffectPattern, $newEffect)

# Remove cloud loading condition from the UI and disable cloud mutation branches.
$text = $text.Replace('{isAuthenticated && cloudCommitments.isLoading && commitments.length === 0 && ', '{false && cloudCommitments.isLoading && commitments.length === 0 && ')
$text = $text.Replace('{!(isAuthenticated && cloudCommitments.isLoading && commitments.length === 0) && ', '{!(cloudCommitments.isLoading && commitments.length === 0) && ')
$text = $text.Replace(' || createCloudCommitment.isPending', '')

Set-Content $indexPath $text -Encoding UTF8

npx tsc --noEmit

if ($LASTEXITCODE -eq 0) {
    Write-Host "index.tsx repaired; TypeScript is clean."
} else {
    Write-Host "TypeScript still reports errors above."
    exit $LASTEXITCODE
}

Write-Host "Start with: npx expo start --web --clear"
