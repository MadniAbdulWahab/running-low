import { useApp } from '../../app-context'
import { usePhoto } from '../../hooks/usePhoto'
import { mealEmoji } from './MealPlanner'

/** A meal's photo, like grocery items show theirs; its emoji when there's no photo. */
export function MealThumb({ name, photoId }: { name: string; photoId: string | null }) {
  const { household } = useApp()
  const photo = usePhoto(household.id, photoId)
  return photo ? (
    <span className="item-thumb meal-thumb">
      <img src={photo} alt="" />
    </span>
  ) : (
    <span className="recipe-emoji" aria-hidden="true">
      {mealEmoji(name)}
    </span>
  )
}
