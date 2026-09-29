import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { radii } from "@/constants/theme";

interface Props {
  // Swap this for a require('../assets/technique.mp4') or your own hosted URL.
  source?: string;
}

const DEFAULT_SOURCE =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export default function MediaPlayer({ source }: Props) {
  const [muted, setMuted] = useState(true);

  const player = useVideoPlayer(source ?? DEFAULT_SOURCE, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    // eslint-disable-next-line react-hooks/immutability
    player.muted = next;
  };

  return (
    <View style={styles.wrapper}>
      <VideoView
        style={styles.video}
        player={player}
        contentFit="cover"
        nativeControls={false}
      />
      <Pressable style={styles.muteBtn} onPress={toggleMute}>
        <Ionicons
          name={muted ? "volume-mute" : "volume-high"}
          size={18}
          color="#fff"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  video: { width: "100%", height: "100%" },
  muteBtn: {
    position: "absolute",
    right: 10,
    bottom: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
