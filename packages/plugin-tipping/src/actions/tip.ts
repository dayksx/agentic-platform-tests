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

const tipTemplate = `Respond with a JSON markdown block containing only the extracted values. Use the \`null\` special value (without quotes) for any values that cannot be determined.

Example response:
\`\`\`json
{
    "evm_address": "0xRecipientEVMAddressHere",
    "recipient_name": @,
    "amount": "AmountHere",
    "currency": "$CurrencyHere",
    "reason": "ReasonForTippingHere"
}
\`\`\`

Given the last message of {{senderName}} use the relevent recent messages to gather the tipping information in the JSON data structure.
{{recentMessages}}

Given the recent messages from {{senderName}} who expresses the intention to tip a specific @recipient, extract the following information shared by {{senderName}} about the requested tip:
- Recipient EVM address
- Recipient name (optional)
- Amount to tip
- Currency
- Reason for tipping (optional)

Ensure that the JSON payload is specific to the tipping intent identified by the recipient's identifier, which could be the @name or the Ethereum address.

Respond with a JSON markdown block containing only the extracted values.`;


export const missingElementTemplate = `# Messages from which we are extracting the tipping information for a given @recipient
{{recentMessages}}

# Instructions: {{senderName}} is requesting to tip a specific @recipient. Your goal is to determine the missing information required to complete the tipping process.
Identify any missing information that is required to complete the tip. This includes the recipient's EVM address, recipient's name, amount, currency, and reason.

Based on the recent messages, extract the following information about the requested tip:
- Recipient's EVM address (mandatory)
- Recipient's name (optional)
- Amount to tip (mandatory)
- Currency (mandatory)
- Reason for tipping (optional)

If any mandatory information is missing, ask the user for the specific missing information to fulfill the request in the {{agentName}} style. If any optional information is missing, ask the user if they could provide it to offer more context, also in the {{agentName}} style. Do not acknowledge this request; just ask for the missing information directly. Only respond with the text asking for the missing information in the {{agentName}} personality.`;

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


        // placeholder: check if the given user is allowed to tip
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

        // Extract and store tipping information
        const tipContext = composeContext({
            state,
            template: tipTemplate,
        });
        const tipInformation = await generateObjectDeprecated({
            runtime,
            context: tipContext,
            modelClass: ModelClass.SMALL,
        });
        console.log('Tipping information: ', tipInformation);
        
        // Ask for missing tipping information
        const tipMissingInfoContext = composeContext({
            state,
            template: missingElementTemplate,
        });
        const tipMissingInfoAsking = await generateText({
            runtime,
            context: tipMissingInfoContext,
            modelClass: ModelClass.SMALL,
        });
        console.log('Message asking missing tipping information: ', tipMissingInfoAsking);
        

        if (callback) {
            if (tipInformation.evm_address != 'null' && tipInformation.amount != 'null' && tipInformation.currency != 'null' && tipInformation.reason != 'null') {
                callback({
                    text: `DONE!`,
                    tipInformation: {
                        tip: {
                            tipInformation
                        },
                    },
                });
            } else {
                callback({
                    text: tipMissingInfoAsking,
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
                content: { text: "Hey {{agentName}}, please tip $ETH to @vitalik for creating Ethereum and bringing it there!" },
            },
            {
                user: "{{user1}}",
                content: { text: "A total of 10000 $ETH!" },
            },
            {
                user: "{{user1}}",
                content: { text: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" },
            },
            {
                user: "{{user2}}",
                content: { text: "Copy that! Let's do that", action: "TIP" },
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Tipping 50 $DAI to @jane for her great presentation!" },
            },
            {
                user: "{{user1}}",
                content: { text: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef" },
            },
            {
                user: "{{user2}}",
                content: { text: "Tip sent!", action: "TIP" },
            }
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Please tip 200 to @bob for his help with the project!" },
            },
            {
                user: "{{user1}}",
                content: { text: "with $USDC!" },
            },
            {
                user: "{{user1}}",
                content: { text: "@bob address is 0x9876543210fedcba9876543210fedcba98765432" },
            },
            {
                user: "{{user2}}",
                content: { text: "Done @bob received your tip! ", action: "TIP" },
            }
        ]
    ] as ActionExample[][],
} as Action;
