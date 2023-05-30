import type { Client } from "./Client";
import { Base } from "./Base";
import type { User } from "./User";
import type { Member } from "./Member";
import {
  buildMemberKey,
  buildReactionKey,
  resolveContentToData,
} from "../util";
import { Embed } from "./Embed";
import type { Server } from "./Server";
import type { Channel } from "./channels";
import type { MessageContent } from "../typings";
import {
  ChatMessagePayload,
  EmotePayload,
  MentionsPayload,
  WSPayload,
} from "@guildedjs/api";

export enum MessageType {
  Default,
  System,
}

export class Message extends Base<ChatMessagePayload> {
  /** The ID of the channel */
  readonly channelId: string;
  /** The ID of the server this message belongs to */
  readonly serverId: string | null;
  /** The ID of the group this message was posted in */
  readonly groupId: string | null;
  /** The type of chat message. "system" messages are generated by Guilded, while "default" messages are user or bot-generated. */
  readonly type: MessageType;
  /** The content of the message */
  content: string;
  /** The mentions within this message */
  mentions?: MentionsPayload;
  /** The ID of the messages that this is replying to. */
  readonly replyMessageIds: string[] = [];
  /** If set, this message will only be seen by those mentioned or replied to. */
  readonly isPrivate: boolean;
  /** If set, this message did not notify, mention or reply recipients. */
  readonly isSilent: boolean;
  /** The ID of the user who created this message (Note: If this event has createdByBotId or createdByWebhookId present, this field will still be populated, but can be ignored. In these cases, the value of this field will always be Ann6LewA) */
  readonly createdById: string;
  /** Bool value to wether message is a reply or not  */
  readonly isReply: boolean;
  /** The ID of the webhook who created this message, if it was created by a webhook */
  readonly createdByWebhookId: string | null;
  /** The timestamp that the message was created at. */
  readonly _createdAt: number;
  /** The timestamp that the message was updated at, if relevant */
  _updatedAt: number | null;
  /** Whether the message has been deleted */
  deleted = false;
  /** When the message was deleted, if it was */
  _deletedAt: number | null = null;
  /** Embeds contained within this message */
  embeds: Embed[] = [];

  constructor(client: Client, data: ChatMessagePayload) {
    super(client, data);
    this.isReply = !!data.replyMessageIds;
    this.channelId = data.channelId;
    this.groupId = data.groupId ?? null;
    this.content = data.content ?? "";
    this.serverId = data.serverId ?? null;
    this.replyMessageIds = data.replyMessageIds ?? [];
    this.createdById = data.createdBy;
    this.createdByWebhookId = data.createdByWebhookId ?? null;
    this._createdAt = Date.parse(data.createdAt);
    this._updatedAt = null;
    this.isPrivate = data.isPrivate ?? false;
    this.isSilent = data.isSilent ?? false;
    this.type =
      data.type === "system" ? MessageType.System : MessageType.Default;

    this._update(data);
  }

  /** Update details of this structure */
  _update(data: Partial<ChatMessagePayload> | { deletedAt: string }): this {
    if ("content" in data && typeof data.content !== "undefined") {
      this.content = data.content;
    }

    if ("mentions" in data) {
      this.mentions = data.mentions;
    }

    if ("updatedAt" in data) {
      this._updatedAt = data.updatedAt ? Date.parse(data.updatedAt) : null;
    }

    if ("deletedAt" in data) {
      this.deleted = true;
      this._deletedAt = Date.parse(data.deletedAt);
    }

    if ("embeds" in data) {
      this.embeds = data.embeds?.map((x) => new Embed(x)) ?? [];
    }

    return this;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  /**
   * Returns the date and time the message was last updated, if relevant.
   */
  get updatedAt(): Date | null {
    return this._updatedAt ? new Date(this._updatedAt) : null;
  }

  /**
   * Returns the date and time the message was deleted, if it was.
   */
  get deletedAt(): Date | null {
    return this._deletedAt ? new Date(this._deletedAt) : null;
  }

  /** Returns the url of this message */
  get url(): string {
    if (!this.serverId) return "";
    return `https://www.guilded.gg/chat/${this.channelId}?messageId=${this.id}`;
  }

  /**
   * Returns the author of this message, or null if the author is not cached.
   */
  get author(): User | null {
    return this.client.users.cache.get(this.createdById) ?? null;
  }

  /**
   * Returns the ID of the user who sent this message.
   */
  get authorId(): string {
    return this.createdByWebhookId ?? this.createdById;
  }

  /**
   * Returns the member of this message, if the message is in a server, or null otherwise or if the member is not cached.
   */
  get member(): Member | null {
    return this.serverId
      ? this.client.members.cache.get(
          buildMemberKey(this.serverId, this.authorId)
        ) ?? null
      : null;
  }

  /**
   * Returns the channel that this message belongs to, or null if the channel is not cached.
   */
  get channel(): Channel | null {
    return this.client.channels.cache.get(this.channelId) ?? null;
  }

  get server(): Server | null {
    return this.serverId
      ? this.client.servers.cache.get(this.serverId) ?? null
      : null;
  }

  /**
   * Edit message content.
   * @param newContent - The new content of the message.
   * @returns A promise that resolves with the updated message.
   */
  edit(newContent: MessageContent): Promise<Message> {
    return this.client.messages
      .update(this.channelId, this.id, newContent)
      .then(() => this);
  }

  /**
   * Send a message in the same channel as this message.
   * @param content - The content of the message.
   * @example
   * let replyObj = {
   *  content: 'This is text, supports **markdown**.',
   *  embeds: [{
   *    title: 'This is an embed title!',
   *    description: 'A description may go here'
   *  }]
   * };
   * message.send(replyObj)
   */
  send(content: MessageContent) {
    return this.client.messages.send(this.channelId, content);
  }

  /**
   * Send a message that replies to this message. It mentions the user who sent this message.
   * @param content - The content of the message to send.
   * @example
   * let replyObj = {
   *  content: 'This is text, supports **markdown**.',
   *  embeds: [{
   *    title: 'This is an embed title!',
   *    description: 'A description may go here'
   *  }]
   * };
   * message.reply(replyObj)
   */
  reply(content: MessageContent) {
    return this.client.messages.send(this.channelId, {
      ...resolveContentToData(content),
      replyMessageIds: [this.id],
    });
  }

  /**
   * Add a reaction emote.
   * @param emoteId - The ID of the emote to add.
   * @returns A promise that resolves when the emote has been added.
   */
  addReaction(emoteId: number): Promise<void> {
    return this.client.rest.router.reactions
      .channelMessageReactionCreate({
        channelId: this.channelId,
        messageId: this.id,
        emoteId,
      })
      .then(() => void 0);
  }

  /**
   * Delete a reaction emote.
   * @param emoteId - The ID of the emote to delete.
   * @returns A promise that resolves when the emote has been deleted.
   */
  deleteReaction(emoteId: number): Promise<void> {
    return this.client.rest.router.reactions
      .channelMessageReactionDelete({
        channelId: this.channelId,
        messageId: this.id,
        emoteId,
      })
      .then(() => void 0);
  }

  /**
   * Delete this message.
   * @returns A promise that resolves when the message has been deleted.
   */
  delete(): Promise<void> {
    return this.client.messages.delete(this.channelId, this.id);
  }
}

/**
 * Represents a reaction to a message.
 */
export class MessageReaction extends Base<FlattenedReactionData> {
  /**
   * The ID of the channel where the message was sent.
   */
  readonly channelId: string;

  /**
   * The ID of the message this reaction belongs to.
   */
  readonly messageId: string;

  /**
   * The ID of the user who created the reaction.
   */
  readonly createdBy: string;

  /**
   * The emote associated with this reaction.
   */
  readonly emote: EmotePayload;

  /**
   * The ID of the server where the reaction was made.
   */
  readonly serverId: string;

  /**
   * Creates a new instance of the MessageReaction class.
   * @param client The client that instantiated this object.
   * @param data The data representing the reaction.
   */
  constructor(client: Client, data: FlattenedReactionData) {
    const formedId = buildReactionKey(data.createdBy, data.emote.id);
    super(client, { ...data, id: formedId });

    this.id = formedId;
    this.channelId = data.channelId;
    this.messageId = data.messageId;
    this.createdBy = data.createdBy;
    this.emote = data.emote;
    this.serverId = data.serverId;
  }
}

type FlattenedReactionData =
  WSPayload<"ChannelMessageReactionCreated">["reaction"] & {
    serverId: string;
  };
