import * as InboxSDK from "@inboxsdk/core";

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPEN_AI_KEY,
});
const openai = new OpenAIApi(configuration);

const getSummaryFromGPT = async (mailContent) => {
  try {
    const prompt = mailContent;
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a gmail extension bot, you are supposed to summarize a given email thread. I will provide with a prompt containing an email thread, you should return response as summary of the thread discussion.",
        },
        { role: "user", content: `${prompt}` },
        {
          role: "assistant",
          content: "Summarize the given email thread.",
        },
      ],
      max_tokens: 300,
      temperature: 0,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    throw error.response
      ? error.response.data
      : "There was an issue on the server";
  }
};

const writeEmailWithGPT = async (mailContext) => {
  try {
    const prompt = mailContext;
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You will be given a context as prompt, you are supposed to write professional emails based on the given prompts.",
        },
        { role: "user", content: `${prompt}` },
        {
          role: "assistant",
          content:
            "Give the response containing the email based on given context.",
        },
      ],
      max_tokens: 500,
      temperature: 0,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    // console.log("response from mail writer", response);
    return response.data.choices[0].message.content;
  } catch (error) {
    throw error.response
      ? error.response.data
      : "There was an issue on the server";
  }
};

InboxSDK.load(2, "sdk_gmailsummarizer_3dede7e5f7").then((sdk) => {
  // the SDK has been loaded, now do something with it!
  sdk.Compose.registerComposeViewHandler(async (composeView) => {
    // a compose view has come into existence, do something with it!
    composeView.addButton({
      title: "Auto write email",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg",
      async onClick(event) {
        let mailContext = event.composeView.getTextContent();
        let mailDraft = await writeEmailWithGPT(mailContext);
        // console.log(mailDraft);
        // debug why its always sending subject only.
        event.composeView.setBodyText(mailDraft);
      },
    });
  });

  sdk.Conversations.registerThreadViewHandler(async (threadView) => {
    let messages = threadView.getMessageViews();
    let thread = messages[messages.length - 1];
    let threadContent = thread.getBodyElement().textContent;
    let summary = await getSummaryFromGPT(threadContent);

    let ele = document.createElement("p");
    ele.innerHTML = summary;
    ele.style.padding = "20px";
    threadView.addSidebarContentPanel({
      el: ele,
      title: "Thread Summary",
      iconUrl:
        "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg",
    });
  });
});
