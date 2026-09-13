cd C:\Dev\d-eagle-hub

$backup = ".\backup-local-first-20260911-210139"
$files = @(
  "app\(tabs)\index.tsx",
  "app\(tabs)\dashboard.tsx",
  "app\(tabs)\review.tsx",
  "app\(tabs)\settings.tsx"
)

foreach ($file in $files) {
  $source = Join-Path $backup $file
  if (-not (Test-Path $source)) {
    Write-Host "Missing backup file: $source"
    exit 1
  }
  Copy-Item $source $file -Force
}

# Restore local guest-mode auth files from the successful earlier change.
@'
import type { ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
'@ | Set-Content "components\auth-gate.tsx" -Encoding UTF8

@'
export type GuestUser = {
  name?: string | null;
  email?: string | null;
};

export function useAuth(): {
  user: GuestUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
} {
  return {
    user: null,
    isAuthenticated: false,
    loading: false,
    logout: async () => {},
  };
}
'@ | Set-Content "hooks\use-auth.ts" -Encoding UTF8

# Dashboard: keep typed tRPC declarations, but make quote generation local-only.
$path = "app\(tabs)\dashboard.tsx"
$text = Get-Content $path -Raw
$pattern = '(?s)  const generatePersonalQuote = async \(\) => \{.*?\}; const generatePreview = async \(\) => \{'
$replacement = @'
  const generatePersonalQuote = async () => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  };
  const generatePreview = async () => {
'@
if ($text -notmatch $pattern) {
  Write-Host "Could not locate dashboard quote function."
  exit 1
}
$text = [regex]::Replace($text, $pattern, $replacement)
Set-Content $path $text -Encoding UTF8

# Settings: retain typed query declarations (disabled by isAuthenticated=false),
# remove sign-in/sign-out UI, and add local JSON export/import.
$path = "app\(tabs)\settings.tsx"
$text = Get-Content $path -Raw

$text = $text.Replace(
  'import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";',
  'import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";'
)
$text = $text.Replace(
  'import { DEFAULT_PREFERENCES, EaglePreferences, getLocalPreferences, mergePreferences, setLocalPreferences } from "@/lib/preferences";',
  'import { DEFAULT_PREFERENCES, EaglePreferences, getLocalPreferences, mergePreferences, setLocalPreferences } from "@/lib/preferences";' + "`r`n" + 'import { exportLocalData, importLocalData } from "@/lib/local-data";'
)

# Remove cloud preference merge effect; local preferences remain active.
$cloudEffect = '(?s)\r?\n  useEffect\(\(\) => \{\r?\n    if \(!isAuthenticated \|\| !cloudPreferences\.data\) return;.*?\r?\n  \}, \[isAuthenticated, cloudPreferences\.data\]\);'
$text = [regex]::Replace($text, $cloudEffect, '')

# Ensure preference saves are local-only.
$text = $text.Replace('    if (isAuthenticated) upsertPreferences.mutate(patch);', '    // Local-first mode: preferences stay on this device.')

# Remove sign-in and sign-out controls from the JSX.
$signIn = '(?s)\s*\{!loading && !isAuthenticated && <Pressable.*?</Pressable>\}'
$text = [regex]::Replace($text, $signIn, '')
$signOut = '(?s)\s*\{isAuthenticated && <Pressable.*?</Pressable>\}'
$text = [regex]::Replace($text, $signOut, '')

# Add backup functions before the hydration guard.
$anchor = '  if (!hydrated) return'
$functions = @'
  const exportBackup = async () => {
    try {
      const json = await exportLocalData();
      await Share.share({ title: "D-Eagle Hub backup", message: json });
    } catch {
      Alert.alert("Backup failed", "Could not create the local backup.");
    }
  };

  const importBackup = () => {
    if (Platform.OS !== "web") {
      Alert.alert("Import on web", "Open the app in a browser to import a JSON backup.");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const count = await importLocalData(String(reader.result ?? ""));
          Alert.alert("Backup imported", `${count} local items restored. Reload the app.`);
        } catch {
          Alert.alert("Import failed", "That file is not a valid D-Eagle Hub backup.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

'@
if ($text -notmatch [regex]::Escape($anchor)) {
  Write-Host "Could not locate settings hydration guard."
  exit 1
}
$text = $text.Replace($anchor, $functions + $anchor)

# Replace cloud-sync wording with local-storage wording.
$syncPattern = '<Text style=\{\[styles\.syncNote, \{ color: colors\.muted \}\]\}>.*?</Text>'
$syncReplacement = '<Text style={[styles.syncNote, { color: colors.muted }]}>Your data is stored locally on this device. Export a backup before changing devices or clearing browser storage.</Text>'
$text = [regex]::Replace($text, $syncPattern, $syncReplacement)

# Insert export/import controls before the sync note.
$backupUi = @'
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>DATA</Text>
    <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable onPress={exportBackup} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <Ionicons name="download-outline" size={19} color={colors.primary} />
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>Export local backup</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </Pressable>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Pressable onPress={importBackup} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <Ionicons name="cloud-upload-outline" size={19} color={colors.primary} />
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>Import local backup</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </Pressable>
    </View>
'@
$syncLine = '<Text style={[styles.syncNote, { color: colors.muted }]}>Your data is stored locally on this device. Export a backup before changing devices or clearing browser storage.</Text>'
$text = $text.Replace($syncLine, $backupUi + $syncLine)

Set-Content $path $text -Encoding UTF8

npx tsc --noEmit

if ($LASTEXITCODE -eq 0) {
  Write-Host "SAFE LOCAL-FIRST REPAIR COMPLETE"
  Write-Host "No cloud requests are enabled because useAuth() reports guest mode."
  Write-Host "Start with: npx expo start --web --clear"
} else {
  Write-Host "TypeScript still reports errors above."
  exit $LASTEXITCODE
}
