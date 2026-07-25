import { listFutureAiFeatures } from '@/ai/providers'
import { useSettings, useUpdateSettings } from '@/hooks/useAppData'
import { scaleRecipe } from '@/lib/mixer'
import { useRecipes } from '@/hooks/useAppData'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

export function SettingsPage() {
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const { data: recipes = [] } = useRecipes()
  const latest = recipes[0]

  if (!settings) return null

  const scaled = latest
    ? scaleRecipe(
        latest.components,
        settings.totalVolumeMl,
        settings.totalDrops,
        settings.densityGPerMl,
      )
    : []

  return (
    <div className="space-y-4 pb-4">
      <Card className="space-y-2">
        <CardTitle>Settings</CardTitle>
        <CardDescription>
          Paint calculator defaults, mixing preferences, and future AI hooks.
        </CardDescription>
      </Card>

      <Card className="space-y-4">
        <CardTitle>Paint calculator</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Need (ml)</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={settings.totalVolumeMl}
              onChange={(e) =>
                updateSettings.mutate({
                  totalVolumeMl: Number(e.target.value) || 1,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Need (drops)</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={settings.totalDrops}
              onChange={(e) =>
                updateSettings.mutate({
                  totalDrops: Number(e.target.value) || 1,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Drop size (ml)</Label>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              value={settings.dropMl}
              onChange={(e) =>
                updateSettings.mutate({ dropMl: Number(e.target.value) || 0.05 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Density (g/ml)</Label>
            <Input
              type="number"
              min={0.1}
              step={0.05}
              value={settings.densityGPerMl}
              onChange={(e) =>
                updateSettings.mutate({
                  densityGPerMl: Number(e.target.value) || 1,
                })
              }
            />
          </div>
        </div>

        {latest ? (
          <div className="space-y-2 rounded-2xl border border-white/8 bg-white/4 p-3">
            <p className="text-sm font-semibold">
              Scaled from latest mix ({latest.target.hex})
            </p>
            {scaled.map((c) => (
              <p key={c.paintId} className="text-xs text-[var(--color-muted)]">
                {c.paintName}: {c.drops} drops · {c.milliliters} ml · {c.grams} g
              </p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">
            Save a mix to preview calculator scaling.
          </p>
        )}
      </Card>

      <Card className="space-y-4">
        <CardTitle>Mixing defaults</CardTitle>
        <div className="flex items-center justify-between">
          <Label>Prioritize opaque paints</Label>
          <Switch
            checked={settings.prioritizeOpaque}
            onCheckedChange={(v) =>
              updateSettings.mutate({
                prioritizeOpaque: v,
                prioritizeTransparent: v ? false : settings.prioritizeTransparent,
              })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>Additive approximation</Label>
          <Switch
            checked={settings.mixingMode === 'additive'}
            onCheckedChange={(v) =>
              updateSettings.mutate({
                mixingMode: v ? 'additive' : 'acrylic_subtractive',
              })
            }
          />
        </div>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Future AI features</CardTitle>
        <CardDescription>
          Architecture reserved — local heuristics only in v1.
        </CardDescription>
        <div className="flex flex-wrap gap-2">
          {listFutureAiFeatures().map((label) => (
            <Badge key={label}>{label}</Badge>
          ))}
        </div>
      </Card>
    </div>
  )
}
