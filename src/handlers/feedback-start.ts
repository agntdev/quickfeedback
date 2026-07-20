import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import {
  saveFeedback,
  getAdminIds,
  getUserPrefs,
  saveUserPrefs,
  nextId,
  now,
} from "../storage.js";

const MAX_CHARS = 300;

registerMainMenuItem({ label: "Send feedback", data: "feedback:start", order: 10 });

const composer = new Composer<Ctx>();

composer.callbackQuery("feedback:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "awaiting_feedback_text";
  await ctx.reply("What feedback would you like to share? Send a message (up to 300 characters).", {
    reply_markup: { force_reply: true, input_field_placeholder: "Type your feedback…" },
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_feedback_text") return next();

  const text = ctx.message.text.trim();
  if (text.length === 0) {
    await ctx.reply("Please enter some feedback text.");
    return;
  }
  if (text.length > MAX_CHARS) {
    await ctx.reply(
      `Your feedback is ${text.length} characters — the limit is ${MAX_CHARS}. Please shorten it and try again.`,
    );
    return;
  }

  ctx.session.feedback_text = text;

  const prefs = ctx.from?.id ? await getUserPrefs(ctx.from.id) : undefined;
  if (prefs) {
    await submitFeedback(ctx, text, prefs.anonymity_preference);
    return;
  }

  ctx.session.step = "awaiting_anonymity_choice";
  await ctx.reply("Would you like to submit this feedback anonymously?", {
    reply_markup: inlineKeyboard([
      [
        inlineButton("Yes, anonymous", "feedback:anon:yes"),
        inlineButton("No, with my name", "feedback:anon:no"),
      ],
    ]),
  });
});

composer.callbackQuery("feedback:anon:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  const text = ctx.session.feedback_text;
  if (!text) {
    ctx.session.step = "idle";
    await ctx.reply("Something went wrong. Tap Send feedback to start again.");
    return;
  }
  if (ctx.from?.id) {
    await saveUserPrefs({ telegram_id: ctx.from.id, anonymity_preference: true });
  }
  await submitFeedback(ctx, text, true);
});

composer.callbackQuery("feedback:anon:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  const text = ctx.session.feedback_text;
  if (!text) {
    ctx.session.step = "idle";
    await ctx.reply("Something went wrong. Tap Send feedback to start again.");
    return;
  }
  if (ctx.from?.id) {
    await saveUserPrefs({ telegram_id: ctx.from.id, anonymity_preference: false });
  }
  await submitFeedback(ctx, text, false);
});

async function submitFeedback(
  ctx: Ctx,
  text: string,
  anonymous: boolean,
): Promise<void> {
  const fbId = nextId("fb");
  const fb = {
    id: fbId,
    text,
    timestamp: now(),
    submitter_id: anonymous ? undefined : ctx.from?.id,
    anonymous,
    read_flag: false,
    tags: [],
  };
  await saveFeedback(fb);

  ctx.session.step = "idle";
  ctx.session.feedback_text = undefined;

  const anonNote = anonymous ? " (submitted anonymously)" : "";
  await ctx.reply(`Thanks for your feedback!${anonNote} It has been recorded.`);

  await notifyAdmins(ctx, fb);
}

async function notifyAdmins(
  ctx: Ctx,
  fb: { id: string; text: string; anonymous: boolean },
): Promise<void> {
  const adminIds = await getAdminIds();
  if (adminIds.length === 0) return;

  const label = fb.anonymous ? "Anonymous" : "Identified";
  const msgText = `New feedback (${label}):\n\n${fb.text}`;

  for (const adminId of adminIds) {
    try {
      await ctx.api.sendMessage(adminId, msgText, {
        reply_markup: inlineKeyboard([
          [
            inlineButton("Mark read", `admin:read:${fb.id}`),
            inlineButton("Tag", `admin:tag:${fb.id}`),
          ],
        ]),
      });
    } catch {
      // Admin hasn't started the bot or blocked it — skip silently.
    }
  }
}

export default composer;
