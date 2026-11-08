import Ably from "ably";

let restClient: Ably.Rest | null = null;

export function getAblyRestClient(): Ably.Rest {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    throw new Error("ABLY_API_KEY environment variable is not configured.");
  }

  if (!restClient) {
    restClient = new Ably.Rest({ key: apiKey });
  }

  return restClient;
}

export async function createAblyTokenRequest(clientId: string) {
  const client = getAblyRestClient();
  // Provide full capabilities for private chat channels/rooms scoped to the authenticated user clientId
  const tokenRequest = await client.auth.createTokenRequest({
    clientId,
    capability: {
      "*": ["*"],
    },
  });

  return tokenRequest;
}

export function getConversationRoomName(conversationId: string): string {
  return `room:conv-${conversationId}`;
}
