import BotClient from "./BotClient";

export * from "./arguments/...string";
export * from "./arguments/boolean";
export * from "./arguments/command";
export * from "./arguments/duration";
export * from "./arguments/number";
export * from "./arguments/string";
export * from "./arguments/subcommand";
export * from "./BotClient";
export * from "./commands/ping";
export * from "./inhibitors/allowedIn";
export * from "./inhibitors/cooldown";
export * from "./monitors/commands";
export * from "./monitors/messageCollector";
export * from "./structures/Argument";
export * from "./structures/Command";
export * from "./structures/Inhibitor";
export * from "./structures/Monitor";
export * from "./utils/walk";
export default BotClient;