/**
 * Public chatbot client.
 *
 * Three modes, selected by environment:
 *
 * 1. VITE_CHAT_API_URL -> hosted conversation service with admin takeover.
 * 2. VITE_BOT_API_URL  -> standalone ANN Node server.
 * 3. Neither set       -> bundled ANN model running entirely in the browser.
 *
 * Modes 2 and 3 persist the short conversation locally so the widget can keep
 * the same message list and polling shape as the hosted service.
 */

type ChatMode = "hosted" | "node" | "local";

const HOSTED_BASE = (import.meta.env.VITE_CHAT_API_URL as string | undefined)?.trim()
const NODE_BASE = (import.meta.env.VITE_BOT_API_URL as string | undefined)?.trim()
const HOSTED_API_BASE = HOSTED_BASE?.replace(/\/+$/, "")
const NODE_API_BASE = NODE_BASE?.replace(/\/+$/, "")

export const chatMode: ChatMode = HOSTED_API_BASE
    ? "hosted"
    : NODE_API_BASE
        ? "node"
        : "local"

const MODEL_URL = `${import.meta.env.BASE_URL}bot-model.json`
const STATIC_FALLBACK =
    "Sorry, I couldn't reach the chat service right now. Please call or WhatsApp +94 77 420 0919 and our team will help."
const STATIC_FALLBACK_SIN =
    "කථා සේවාව දැනට ලබා ගත නොහැකි වී ඇත. කරුණාකර +94 77 420 0919 අමතන්න හෝ WhatsApp කරන්න."

export interface ServerMessage {
    id: string
    sender: "guest" | "bot" | "admin"
    text: string
    sender_name?: string | null
    timestamp: string
}

export interface ConversationState {
    conversation_id: string
    messages: ServerMessage[]
    assigned_admin_name: string | null
}

type Respond = (model: unknown, text: string, lang?: string) => { text: string }

let localModelPromise: Promise<{ model: unknown; respond: Respond }> | null = null

function ids(): { conversationId: string; guestId: string } {
    let conversationId = localStorage.getItem("ll_chat_conversation_id")
    let guestId = localStorage.getItem("ll_chat_guest_id")
    if (!conversationId) {
        conversationId = crypto.randomUUID()
        localStorage.setItem("ll_chat_conversation_id", conversationId)
    }
    if (!guestId) {
        guestId = crypto.randomUUID()
        localStorage.setItem("ll_chat_guest_id", guestId)
    }
    return { conversationId, guestId }
}

export function getChatIds(): { conversationId: string; guestId: string } {
    return ids()
}

function localMessagesKey(conversationId: string): string {
    return `ll_chat_messages_${conversationId}`
}

function readLocalMessages(conversationId: string): ServerMessage[] {
    try {
        const raw = localStorage.getItem(localMessagesKey(conversationId))
        return raw ? (JSON.parse(raw) as ServerMessage[]) : []
    } catch {
        return []
    }
}

function writeLocalMessages(conversationId: string, messages: ServerMessage[]): void {
    try {
        localStorage.setItem(localMessagesKey(conversationId), JSON.stringify(messages))
    } catch {
        // Storage may be disabled; the in-memory widget still works for this visit.
    }
}

function localState(conversationId: string, messages: ServerMessage[]): ConversationState {
    writeLocalMessages(conversationId, messages)
    return {
        conversation_id: conversationId,
        messages,
        assigned_admin_name: null,
    }
}

function createMessage(sender: ServerMessage["sender"], text: string): ServerMessage {
    return {
        id: crypto.randomUUID(),
        sender,
        text,
        sender_name: null,
        timestamp: new Date().toISOString(),
    }
}

function fallbackText(lang: "en" | "sin"): string {
    return lang === "sin" ? STATIC_FALLBACK_SIN : STATIC_FALLBACK
}

async function loadLocalModel(): Promise<{ model: unknown; respond: Respond }> {
    if (!localModelPromise) {
        localModelPromise = Promise.all([
            fetch(MODEL_URL).then((response) => {
                if (!response.ok) throw new Error(`Model load error: ${response.status}`)
                return response.json()
            }),
            import("../../chat-bot/core/ann.js"),
        ])
            .then(([model, ann]) => ({ model, respond: ann.respond as Respond }))
            .catch((error: unknown) => {
                localModelPromise = null
                throw error
            })
    }
    return localModelPromise
}

async function nodeReply(text: string, lang: "en" | "sin"): Promise<string> {
    if (!NODE_API_BASE) throw new Error("Node chat API is not configured")
    const response = await fetch(`${NODE_API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, lang }),
    })
    if (!response.ok) throw new Error(`Bot API error: ${response.status}`)
    const payload = (await response.json()) as { text?: string }
    return payload.text?.trim() || fallbackText(lang)
}

async function localReply(text: string, lang: "en" | "sin"): Promise<string> {
    const { model, respond } = await loadLocalModel()
    return respond(model, text, lang).text?.trim() || fallbackText(lang)
}

async function botReply(text: string, lang: "en" | "sin"): Promise<string> {
    if (NODE_API_BASE) {
        try {
            return await nodeReply(text, lang)
        } catch {
            // The deployed ANN is optional; fall back to the bundled model.
        }
    }
    try {
        return await localReply(text, lang)
    } catch {
        return fallbackText(lang)
    }
}

async function postJson(url: string, body: unknown): Promise<ConversationState> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Chat API error: ${res.status}`)
    return (await res.json()) as ConversationState
}

async function getJson(url: string): Promise<ConversationState> {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Chat API error: ${res.status}`)
    return (await res.json()) as ConversationState
}

export async function sendGuestMessage(
    conversationId: string,
    guestId: string,
    message: string,
    lang: "en" | "sin",
): Promise<ConversationState> {
    if (HOSTED_API_BASE) {
        const url = `${HOSTED_API_BASE}/chat/conversations/${conversationId}/messages`
        return postJson(url, { message, guest_id: guestId, lang })
    }

    void guestId
    const reply = await botReply(message, lang)
    const messages = [
        ...readLocalMessages(conversationId),
        createMessage("guest", message),
        createMessage("bot", reply),
    ]
    return localState(conversationId, messages)
}

export async function fetchConversation(
    conversationId: string,
    guestId: string,
): Promise<ConversationState> {
    if (HOSTED_API_BASE) {
        const url = `${HOSTED_API_BASE}/chat/conversations/${conversationId}?guest_id=${encodeURIComponent(guestId)}`
        return getJson(url)
    }

    void guestId
    return localState(conversationId, readLocalMessages(conversationId))
}
