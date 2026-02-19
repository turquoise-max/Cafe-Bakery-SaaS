import { getItems } from "@/app/dashboard/items/actions";
import { RecipeBuilder } from "@/components/recipes/recipe-builder";

export default async function NewRecipePage() {
  const items = await getItems();

  return (
    <div className="space-y-6">
      <RecipeBuilder items={items} mode="create" />
    </div>
  );
}