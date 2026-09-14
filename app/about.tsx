import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { AppCard } from "@/components/ui/primitives";
import { useColors } from "@/hooks/use-colors";

export default function AboutScreen() { const c=useColors(); return <ScreenContainer><ScrollView contentContainerStyle={styles.content}><Text style={[styles.title,{color:c.text}]}>D-Eagle Hub</Text><Text style={{color:c.muted}}>Commitments, signal and intelligent follow-through.</Text><AppCard><Text style={[styles.heading,{color:c.text}]}>Built around trust</Text><Text style={{color:c.muted}}>Your commitments remain explicit, recoverable and explainable. Eagle recommendations are guidance, not hidden decisions.</Text></AppCard><AppCard><Text style={[styles.heading,{color:c.text}]}>Architecture</Text><Text style={{color:c.muted}}>Local-first data, explicit synchronization, secure platform boundaries and deterministic analytical foundations.</Text></AppCard></ScrollView></ScreenContainer>; }
const styles=StyleSheet.create({content:{padding:20,gap:16},title:{fontSize:32,fontWeight:"800"},heading:{fontSize:18,fontWeight:"700"}});
