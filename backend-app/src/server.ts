/**
 * Entry point. Boots the app-data layer (§5.4) and the Express app (§3.10's
 * full route contract, wired in app.ts as of Iteration 2).
 */
import { createApp } from "./app";
import { loadAppData } from "./data";

const PORT = process.env.PORT || 8080;

const appData = loadAppData();
console.log(
  `[boot] Loaded ${appData.recipes.length} recipes, ${appData.ingredientsById.size} ingredients.`
);

const app = createApp(appData);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
