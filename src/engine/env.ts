import { createContext, useContext } from "react";
import * as THREE from "three";
/** Studio reflection map, handed only to the materials that actually need reflections (Pip, glass): keeps big surfaces cheap. */
export const EnvContext = createContext<THREE.Texture | null>(null);
export const useEnv = () => useContext(EnvContext);
