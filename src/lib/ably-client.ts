import * as Ably from "ably";
import { createChatClient } from "@ably/chat";

let chatClientInstance: any = null;
let realtimeInstance: Ably.Realtime | null = null;

export function getAblyRealtimeClient(): Ably.Realtime {
  if (typeof window === "undefined") {
    throw new Error("Ably Realtime client can only be initialized on the client-side.");
  }

  if (!realtimeInstance || realtimeInstance.connection.state === "closed") {
    realtimeInstance = new Ably.Realtime({
      authUrl: "/api/chat/auth",
      autoConnect: true,
    });
  }

  return realtimeInstance;
}

export function getAblyChatClient(): any {
  if (typeof window === "undefined") {
    return null;
  }

  if (!chatClientInstance) {
    const realtime = getAblyRealtimeClient();
    chatClientInstance = createChatClient(realtime);
  }

  return chatClientInstance;
}
