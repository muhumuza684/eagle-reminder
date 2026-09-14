import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";
import { useColors } from "@/hooks/use-colors";

export function AppCard({ children }: { children: ReactNode }) { const c=useColors(); return <View style={[styles.card,{backgroundColor:c.background,borderColor:c.border}]}>{children}</View>; }
export function AppButton({ label, variant="primary", ...props }: PressableProps & { label: string; variant?: "primary"|"secondary"|"danger" }) { const c=useColors(); return <Pressable accessibilityRole="button" {...props} style={[styles.button,{backgroundColor:variant==="primary"?c.primary:variant==="danger"?c.error:c.background,borderColor:c.border}]}><Text style={{color:variant==="secondary"?c.text:c.background,fontWeight:"700"}}>{label}</Text></Pressable>; }
const styles=StyleSheet.create({card:{borderWidth:1,borderRadius:16,padding:16,gap:10},button:{minHeight:48,borderWidth:1,borderRadius:12,paddingHorizontal:18,alignItems:"center",justifyContent:"center"}});
