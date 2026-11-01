import {worlds,type ProductInput} from "./product";

export const SAMPLE_PREVIEW_LABEL="Przykładowy podgląd — ilustracje z Twoim zdjęciem powstaną po płatności";

// Local, authored vector illustrations contain no photographs or likenesses.
// Sample content is never saved as the generated book or counted as AI output.
export function samplePreview(p:ProductInput){
 return {
  samplePreview:true,
  sampleImage:`/samples/${p.format}-${p.world}-${p.style}.svg`,
  title:p.title||`${p.name} — ${worlds[p.world]}`,
  dedication:p.dedication,
  previewText:`${p.name} odkrywa niezwykłą przygodę. Jeden mały krok otwiera drogę do wielkich odkryć!`,
 };
}
