import { SceneFn } from "./types";
import { hook } from "./hook";
import { setup } from "./setup";
import { walk } from "./walk";
import { cars } from "./cars";
import { grip } from "./grip";
import { payoff } from "./payoff";
import { epilogue } from "./epilogue";

export const SCENE_FNS: Record<string, SceneFn> = { hook, setup, walk, cars, grip, payoff, epilogue };
