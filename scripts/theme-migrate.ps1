$pages = Get-ChildItem -Path 'D:\Task Manager\Ethara-task-manager\frontend\src\pages' -Filter '*.tsx'

# Order matters: compound patterns (hover:, placeholder:, focus:) BEFORE their bare counterparts
$pairs = @(
  @{ from = 'hover:text-brand-700'; to = 'hover:text-brand-hover' },
  @{ from = 'hover:bg-brand-700'; to = 'hover:bg-brand-hover' },
  @{ from = 'hover:bg-rose-700'; to = 'hover:bg-destructive-hover' },
  @{ from = 'hover:bg-rose-50'; to = 'hover:bg-destructive-subtle' },
  @{ from = 'hover:bg-slate-50'; to = 'hover:bg-surface-muted' },
  @{ from = 'hover:bg-slate-100'; to = 'hover:bg-surface-muted' },
  @{ from = 'hover:bg-white'; to = 'hover:bg-surface' },
  @{ from = 'hover:border-slate-400'; to = 'hover:border-border-strong' },
  @{ from = 'hover:border-slate-300'; to = 'hover:border-border-strong' },
  @{ from = 'hover:text-slate-900'; to = 'hover:text-foreground' },
  @{ from = 'hover:text-slate-700'; to = 'hover:text-foreground' },
  @{ from = 'hover:text-slate-600'; to = 'hover:text-foreground' },
  @{ from = 'hover:ring-brand-400'; to = 'hover:ring-brand' },
  @{ from = 'placeholder:text-slate-400'; to = 'placeholder:text-subtle' },
  @{ from = 'placeholder:text-slate-500'; to = 'placeholder:text-subtle' },
  @{ from = 'focus:border-brand-500'; to = 'focus:border-brand' },
  @{ from = 'group-hover:text-brand-700'; to = 'group-hover:text-brand-hover' },

  # Word-boundary-safe simple replaces
  @{ from = '\btext-slate-900\b'; to = 'text-foreground' },
  @{ from = '\btext-slate-800\b'; to = 'text-foreground' },
  @{ from = '\btext-slate-700\b'; to = 'text-foreground' },
  @{ from = '\btext-slate-600\b'; to = 'text-muted-foreground' },
  @{ from = '\btext-slate-500\b'; to = 'text-muted-foreground' },
  @{ from = '\btext-slate-400\b'; to = 'text-subtle' },
  @{ from = '\btext-slate-300\b'; to = 'text-subtle' },
  @{ from = '\btext-white\b'; to = 'text-brand-foreground' },

  @{ from = '\bbg-white\b'; to = 'bg-surface' },
  @{ from = '\bbg-slate-50\b'; to = 'bg-surface-muted' },
  @{ from = '\bbg-slate-100\b'; to = 'bg-surface-muted' },
  @{ from = '\bbg-slate-200\b'; to = 'bg-border' },

  @{ from = '\bborder-slate-200\b'; to = 'border-border' },
  @{ from = '\bborder-slate-100\b'; to = 'border-border' },
  @{ from = '\bborder-slate-300\b'; to = 'border-border-strong' },
  @{ from = '\bdivide-slate-200\b'; to = 'divide-border' },
  @{ from = '\bdivide-slate-100\b'; to = 'divide-border' },

  @{ from = '\bring-slate-200\b'; to = 'ring-border' },
  @{ from = '\bring-slate-100\b'; to = 'ring-border' },
  @{ from = '\bring-slate-300\b'; to = 'ring-border-strong' },

  @{ from = '\bbg-brand-50\b'; to = 'bg-brand-subtle' },
  @{ from = '\bbg-brand-100\b'; to = 'bg-brand-subtle' },
  @{ from = '\bbg-brand-500\b'; to = 'bg-brand' },
  @{ from = '\bbg-brand-600\b'; to = 'bg-brand' },
  @{ from = '\btext-brand-600\b'; to = 'text-brand' },
  @{ from = '\btext-brand-700\b'; to = 'text-brand-subtle-foreground' },
  @{ from = '\bring-brand-200\b'; to = 'ring-brand-subtle-border' },
  @{ from = '\bring-brand-400\b'; to = 'ring-brand' },
  @{ from = '\bborder-brand-600\b'; to = 'border-brand' },

  @{ from = '\bbg-rose-50\b'; to = 'bg-destructive-subtle' },
  @{ from = '\btext-rose-700\b'; to = 'text-destructive-subtle-foreground' },
  @{ from = '\btext-rose-600\b'; to = 'text-destructive' },
  @{ from = '\bring-rose-200\b'; to = 'ring-destructive-subtle-border' },
  @{ from = '\bborder-rose-400\b'; to = 'border-destructive' },
  @{ from = '\bbg-rose-600\b'; to = 'bg-destructive' },

  @{ from = '\bbg-amber-50\b'; to = 'bg-warning-subtle' },
  @{ from = '\btext-amber-700\b'; to = 'text-warning-subtle-foreground' },
  @{ from = '\bring-amber-200\b'; to = 'ring-warning-subtle-border' },

  @{ from = '\bbg-emerald-50\b'; to = 'bg-success-subtle' },
  @{ from = '\btext-emerald-700\b'; to = 'text-success-subtle-foreground' },
  @{ from = '\bring-emerald-200\b'; to = 'ring-success-subtle-border' },

  # Emerald glow rgba -> CSS var (Dashboard TONE_CLASSES drop-shadows)
  @{ from = 'rgba\(16,\s*185,\s*129,\s*0\.35\)'; to = 'rgb(var(--brand)/0.35)' },
  @{ from = 'rgba\(16,\s*185,\s*129,\s*0\.45\)'; to = 'rgb(var(--brand)/0.45)' }
)

foreach ($file in $pages) {
  $c = Get-Content -Raw $file.FullName
  $orig = $c
  foreach ($p in $pairs) {
    $c = $c -replace $p.from, $p.to
  }
  if ($c -ne $orig) {
    Set-Content -NoNewline -Path $file.FullName -Value $c
    Write-Host "Migrated: $($file.Name)"
  }
}
