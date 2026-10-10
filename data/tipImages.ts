// data/tipImages.ts
// Optional: use pictures that live inside your app instead of web links.
// 1) Put the picture in assets/tips/ (for example assets/tips/scalp-massage.jpg)
// 2) Add a line below
// 3) In tips.json write  "image": "local:scalp-massage"
// Web links (https://...) work without any of this.
import { ImageSourcePropType } from "react-native";

export const tipImages: Record<string, ImageSourcePropType> = {
  // "scalp-massage": require("../assets/tips/scalp-massage.jpg"),
};