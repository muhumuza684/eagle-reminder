import { useEffect, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";

export function useLayoutWidth() {
  const rnWidth = useWindowDimensions().width;
  const [domWidth, setDomWidth] = useState<number | null>(
    Platform.OS === "web" && typeof window !== "undefined" ? window.innerWidth : null
  );

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onResize = () => setDomWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return Platform.OS === "web" && domWidth !== null ? domWidth : rnWidth;
}