// components/usePhotoCapture.tsx
// One place that handles: instructions popup (first time) -> camera or photo library -> your callback.
// Used by the vault and the AI hair check, so both take photos the same way.
import React, { useRef, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import PhotoGuideModal, { hasSeenPhotoGuide } from "@/components/PhotoGuide";
import HairCameraModal from "@/components/HairCameraModal";

type Action = "camera" | "library";

export function usePhotoCapture(onPhoto: (uri: string) => void) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const pending = useRef<Action | null>(null);

  const run = async (action: Action) => {
    if (action === "camera") {
      setCameraOpen(true);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos permission needed", "Allow photo library access in Settings to choose a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) onPhoto(result.assets[0].uri);
  };

  // First time: show the instructions, then carry on with what the user tapped
  const start = async (action: Action) => {
    if (!(await hasSeenPhotoGuide())) {
      pending.current = action;
      setGuideOpen(true);
      return;
    }
    run(action);
  };

  const ui = (
    <>
      <PhotoGuideModal
        visible={guideOpen}
        doneLabel="Got it, continue"
        onClose={() => {
          setGuideOpen(false);
          const action = pending.current;
          pending.current = null;
          // small pause so the instructions finish closing before the next screen opens
          if (action) setTimeout(() => run(action), 400);
        }}
      />
      <HairCameraModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCaptured={onPhoto}
      />
    </>
  );

  return {
    takePhoto: () => start("camera"),
    choosePhoto: () => start("library"),
    openGuide: () => {
      pending.current = null;
      setGuideOpen(true);
    },
    ui,
  };
}