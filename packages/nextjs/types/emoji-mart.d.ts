declare module "@emoji-mart/react" {
  import type { ComponentType } from "react";

  type PickerProps = {
    data: unknown;
    onEmojiSelect?: (emoji: { native: string; id: string; unified: string }) => void;
    theme?: "auto" | "light" | "dark";
    previewPosition?: "none" | "top" | "bottom";
    skinTonePosition?: "none" | "preview" | "search";
    [key: string]: unknown;
  };

  const Picker: ComponentType<PickerProps>;
  export default Picker;
}

declare module "@emoji-mart/data" {
  const data: unknown;
  export default data;
}
