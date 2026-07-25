import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  useCreateProject,
  useDeleteProject,
  usePalettes,
  useProjects,
  useRecipes,
  useUpdateProject,
} from '@/hooks/useAppData'
import { PAINT_TYPE_LABELS } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ColorSwatch } from '@/components/color/ColorSwatch'

export function ProjectsPage() {
  const { data: projects = [] } = useProjects()
  const { data: palettes = [] } = usePalettes()
  const { data: recipes = [] } = useRecipes()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const deleteProject = useDeleteProject()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [paletteId, setPaletteId] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <div className="space-y-4 pb-4">
      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Projects</CardTitle>
            <CardDescription>
              Each project remembers its palette, references, recipes, and notes.
            </CardDescription>
          </div>
          <Button
            size="icon"
            onClick={() => {
              setName('')
              setNotes('')
              setPaletteId(palettes[0]?.id ?? '')
              setOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {projects.map((project) => {
        const palette = palettes.find((p) => p.id === project.paletteId)
        const linked = recipes.filter((r) => project.recipeIds.includes(r.id))
        return (
          <Card key={project.id} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>
                  {palette
                    ? `${palette.name} · ${PAINT_TYPE_LABELS[palette.paintType]}`
                    : 'Palette missing'}
                </CardDescription>
              </div>
              <Button
                size="icon"
                variant="danger"
                onClick={() => {
                  if (confirm('Delete project?')) {
                    void deleteProject.mutateAsync(project.id)
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <Textarea
              value={project.notes ?? ''}
              placeholder="Project notes…"
              onChange={(e) =>
                void updateProject.mutateAsync({
                  ...project,
                  notes: e.target.value,
                })
              }
            />

            <div className="space-y-2">
              <Label>Reference photos</Label>
              <label>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      void updateProject.mutateAsync({
                        ...project,
                        referenceImages: [
                          String(reader.result),
                          ...project.referenceImages,
                        ].slice(0, 12),
                      })
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                <Button asChild variant="secondary" className="w-full">
                  <span>Add reference photo</span>
                </Button>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {project.referenceImages.map((src, i) => (
                  <img
                    key={`${project.id}-${i}`}
                    src={src}
                    alt=""
                    className="aspect-square rounded-xl object-cover"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Saved mixtures</Label>
              {linked.length === 0 ? (
                <p className="text-xs text-[var(--color-muted)]">
                  Save mixes from Match/Live, then attach them here by re-saving with
                  this project selected in a future update — for now, favorites from
                  the same palette are listed below.
                </p>
              ) : null}
              <div className="space-y-2">
                {(linked.length
                  ? linked
                  : recipes.filter((r) => r.paletteId === project.paletteId).slice(0, 5)
                ).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-xl border border-white/8 px-3 py-2"
                  >
                    <ColorSwatch hex={r.target.hex} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {r.target.hex} · {r.matchPercent}%
                      </p>
                      <p className="text-xs text-[var(--color-muted)]">
                        ΔE {r.deltaE} · {r.components.length} paints
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={
                        project.favoriteRecipeIds.includes(r.id)
                          ? 'default'
                          : 'secondary'
                      }
                      onClick={() => {
                        const exists = project.favoriteRecipeIds.includes(r.id)
                        const recipeIds = project.recipeIds.includes(r.id)
                          ? project.recipeIds
                          : [r.id, ...project.recipeIds]
                        void updateProject.mutateAsync({
                          ...project,
                          recipeIds,
                          favoriteRecipeIds: exists
                            ? project.favoriteRecipeIds.filter((id) => id !== r.id)
                            : [r.id, ...project.favoriteRecipeIds],
                        })
                      }}
                    >
                      Fav
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Palette</Label>
              <select
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm"
                value={paletteId}
                onChange={(e) => setPaletteId(e.target.value)}
              >
                {palettes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button
              className="w-full"
              disabled={!name || !paletteId}
              onClick={() => {
                void createProject
                  .mutateAsync({ name, paletteId, notes })
                  .then(() => setOpen(false))
              }}
            >
              Create project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
