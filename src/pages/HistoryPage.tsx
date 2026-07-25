import { Heart, Trash2 } from 'lucide-react'
import {
  useDeleteRecipe,
  useRecipes,
  useUpdateRecipe,
} from '@/hooks/useAppData'
import { MixResultCard } from '@/components/mix/MixResultCard'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function HistoryPage() {
  const { data: recipes = [] } = useRecipes()
  const updateRecipe = useUpdateRecipe()
  const deleteRecipe = useDeleteRecipe()

  return (
    <div className="space-y-4 pb-4">
      <Card>
        <CardTitle>Mix history</CardTitle>
        <CardDescription className="mt-1">
          Every saved recipe with ratios, DeltaE, and notes.
        </CardDescription>
      </Card>

      {recipes.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--color-muted)]">
            No mixes yet. Save a recommendation from Match or Live.
          </p>
        </Card>
      ) : null}

      {recipes.map((recipe) => (
        <div key={recipe.id} className="space-y-2">
          <MixResultCard
            targetRgb={recipe.target.rgb}
            targetHex={recipe.target.hex}
            result={{
              components: recipe.components,
              predicted: recipe.predicted,
              deltaE: recipe.deltaE,
              matchPercent: recipe.matchPercent,
              mixingMode: recipe.mixingMode,
            }}
            paletteName={recipe.paletteName}
            recipe={recipe}
            onToggleFavorite={() =>
              void updateRecipe.mutateAsync({
                ...recipe,
                favorite: !recipe.favorite,
              })
            }
          />
          <Card className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[var(--color-muted)]">
                {new Date(recipe.createdAt).toLocaleString()}
                {recipe.favorite ? ' · Favorite' : ''}
              </p>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() =>
                    void updateRecipe.mutateAsync({
                      ...recipe,
                      favorite: !recipe.favorite,
                    })
                  }
                >
                  <Heart
                    className="h-4 w-4"
                    fill={recipe.favorite ? 'currentColor' : 'none'}
                  />
                </Button>
                <Button
                  size="icon"
                  variant="danger"
                  onClick={() => {
                    if (confirm('Delete this mix?')) {
                      void deleteRecipe.mutateAsync(recipe.id)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Input
              placeholder="Add notes…"
              value={recipe.notes ?? ''}
              onChange={(e) =>
                void updateRecipe.mutateAsync({
                  ...recipe,
                  notes: e.target.value,
                })
              }
            />
            {recipe.imageThumb ? (
              <img
                src={recipe.imageThumb}
                alt="Reference"
                className="h-28 w-full rounded-xl object-cover"
              />
            ) : null}
          </Card>
        </div>
      ))}
    </div>
  )
}
