import type { Lead } from "../shared/crm.js";
import { config } from "./config.js";

interface NotificationStatus {
    discordEnabled: boolean;
    publicAppUrl: string;
}

interface DiscordWebhookPayload {
    username: string;
    allowed_mentions: {
        parse: string[];
    };
    content?: string;
    embeds: Array<{
        title: string;
        color: number;
        description?: string;
        fields: Array<{
            name: string;
            value: string;
            inline?: boolean;
        }>;
        footer?: {
            text: string;
        };
    }>;
}

function truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, maxLength - 1)}…`;
}

function buildAdminUrl(): string {
    return `${config.publicAppUrl}/admin`;
}

function buildLeadEmbed(lead: Lead): DiscordWebhookPayload {
    const submittedAt = Math.floor(new Date(lead.createdAt).getTime() / 1000);
    const subject = truncate(lead.subject || "Photography Inquiry", 256);
    const clientName = truncate(lead.name, 256);
    const contactValue = truncate(`${lead.email}\n${lead.telephone}`, 1024);
    const crmValue = `[Open admin](${buildAdminUrl()})`;
    const messagePreview = truncate(lead.message.replace(/\s+/g, " "), 280);

    return {
        username: config.discordWebhookUsername,
        allowed_mentions: {
            parse: [],
        },
        content: "New website inquiry received.",
        embeds: [
            {
                title: "New website inquiry",
                color: 0xa89a78,
                description: messagePreview,
                fields: [
                    {
                        name: "Client",
                        value: clientName,
                        inline: true,
                    },
                    {
                        name: "Session",
                        value: subject,
                        inline: true,
                    },
                    {
                        name: "Submitted",
                        value: `<t:${submittedAt}:F>`,
                    },
                    {
                        name: "Contact",
                        value: contactValue,
                    },
                    {
                        name: "CRM",
                        value: crmValue,
                    },
                ],
                footer: {
                    text: "Nikki Dodge Photography",
                },
            },
        ],
    };
}

async function postDiscordWebhook(payload: DiscordWebhookPayload): Promise<void> {
    if (!config.discordWebhookUrl) {
        return;
    }

    const response = await fetch(config.discordWebhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Discord webhook request failed with status ${response.status}: ${responseText || "No response body"}`);
    }
}

export function getNotificationStatus(): NotificationStatus {
    return {
        discordEnabled: config.discordWebhookUrl.length > 0,
        publicAppUrl: config.publicAppUrl,
    };
}

export async function sendLeadCreatedNotification(lead: Lead): Promise<boolean> {
    if (!config.discordWebhookUrl) {
        return false;
    }

    await postDiscordWebhook(buildLeadEmbed(lead));
    return true;
}

export async function sendDiscordTestNotification(): Promise<boolean> {
    if (!config.discordWebhookUrl) {
        return false;
    }

    await postDiscordWebhook({
        username: config.discordWebhookUsername,
        allowed_mentions: {
            parse: [],
        },
        content: "Discord notifications are connected.",
        embeds: [
            {
                title: "Test notification",
                color: 0x2a261e,
                fields: [
                    {
                        name: "CRM",
                        value: `[Open admin](${buildAdminUrl()})`,
                    },
                    {
                        name: "Environment",
                        value: config.isProduction ? "Production" : "Local development",
                        inline: true,
                    },
                ],
                footer: {
                    text: "Nikki Dodge Photography",
                },
            },
        ],
    });

    return true;
}
