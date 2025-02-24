import {
    composeContext,
    type Content,
    elizaLogger,
    generateObjectDeprecated,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    type Action,
    ActionExample,
    generateText,
} from "@elizaos/core";

const tipTemplate = `Respond with a JSON markdown block containing only the extracted values. Use the special null value for any values that cannot be determined.

Example response:
\`\`\`json
{
    "evm_address": "0xRecipientEVMAddressHere",
    "recipient_name": null,
    "amount": "AmountHere",
    "currency": "CurrencyHere",
    "reason": "ReasonForTippingHere"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested tip:
- Recipient EVM address
- Recipient name (if available)
- Amount to tip
- Currency
- Reason for tipping

Respond with a JSON markdown block containing only the extracted values.`;


export const missingElementTemplate = `# Messages we are summarizing
{{recentMessages}}

# Instructions: {{senderName}} is requesting to tip someone. Your goal is to determine the missing information required to complete the tipping process.
Identify any missing information that is required to complete the tip. This can include recipient EVM address, recipient name, amount, currency, and reason.


{{recentMessages}}

Given the recent messages, extract the following information about the requested tip:
- Recipient EVM address
- Recipient name (if available)
- Amount to tip
- Currency
- Reason for tipping

If any of those information is missing, ask the user for the specific missing information with the {{agentName}} style of answering. Do not acknowledge this request, just ask for the missing information directly. Only respond with the text asking for the missing information with the {{agentName}} personality.`;
export const tipAction: Action = {
    name: "TIP",
    similes: [
        "SEND_TIP",
        "GIVE_TIP",
        "TRANSFER_TIP",
    ],
    description:
        "Facilitate tipping between users based on their prompts.",

    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        elizaLogger.info(`Tipping validation`);
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.info(`Tipping handling`);

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        // Tipping Element retrieving
        const tipContext = composeContext({
            state,
            template: tipTemplate,
        });

        const tipElements = await generateObjectDeprecated({
            runtime,
            context: tipContext,
            modelClass: ModelClass.SMALL,
        });

        // Missing Elements answering
        const missingElementContext = composeContext({
            state,
            template: missingElementTemplate,
        });

        const missingElementAsking = await generateText({
            runtime,
            context: missingElementContext,
            modelClass: ModelClass.SMALL,
        });
        console.log('Tipping information: ', tipElements);

        if (callback) {
            if (tipElements.evm_address != 'null' && tipElements.amount != 'null' && tipElements.currency != 'null' && tipElements.reason != 'null') {
                callback({
                    text: `DONE!`,
                    tipElements: {
                        tip: {
                            tipElements
                        },
                    },
                });
            } else {
                callback({
                    text: missingElementAsking,
                    content: {
                        error: true
                    },
                });
            }
        }
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Hey Agent, please tip 100 $ETH to @agent2 for its awesome work!" },
            },
            {
                user: "{{user2}}",
                content: { text: "Tipping @agent2 100 ETH for: its awesome work!", action: "TIP" },
            },
            {
                user: "{{user3}}",
                content: { text: "0x1234567890abcdef1234567890abcdef12345678", action: "EVM_ADDRESS" },
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Hey Agent, please tip 50 $DAI to @jane for her great presentation!" },
            },
            {
                user: "{{user2}}",
                content: { text: "Tipping @jane 50 DAI for: her great presentation!", action: "TIP" },
            },
            {
                user: "{{user3}}",
                content: { text: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef", action: "EVM_ADDRESS" },
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Hey Agent, please tip 200 $USDC to @bob for his help with the project!" },
            },
            {
                user: "{{user2}}",
                content: { text: "Tipping @bob 200 USDC for: his help with the project!", action: "TIP" },
            },
            {
                user: "{{user3}}",
                content: { text: "0x9876543210fedcba9876543210fedcba98765432", action: "EVM_ADDRESS" },
            }
        ]
    ] as ActionExample[][],
} as Action;
