import type { Plugin } from "@elizaos/core";
import { tipAction } from "./actions";
export * as actions from "./actions";

export const tippingPlugin: Plugin = {
    name: "tipping",
    description: "Agent tipping and facilitating tipping actions",
    actions: [
        tipAction,
    ],
    evaluators: [],
    providers: [],
};
export default tippingPlugin;