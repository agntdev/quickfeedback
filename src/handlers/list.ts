import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, paginate } from "../toolkit/index.js";
import { listFeedback, isAdmin } from "../storage.js";

const PER_PAGE = 5;

const composer = new Composer<Ctx>();

composer.command("list", async (ctx) => {
  if (!ctx.from?.id || !(await isAdmin(ctx.from.id))) {
    await ctx.reply("This command is for admins only.");
    return;
  }
  await showList(ctx, 0);
});

composer.callbackQuery(/^list:page:/, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from?.id || !(await isAdmin(ctx.from.id))) {
    await ctx.reply("This command is for admins only.");
    return;
  }
  const page = parseInt(ctx.callbackQuery.data.split(":")[2] ?? "0", 10);
  await showList(ctx, page);
});

composer.callbackQuery(/^admin:read:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from?.id || !(await isAdmin(ctx.from.id))) return;
  const fbId = ctx.match?.[1];
  if (!fbId) return;
  const { markFeedbackRead } = await import("../storage.js");
  await markFeedbackRead(fbId);
  await ctx.editMessageText("Marked as read.", {
    reply_markup: inlineKeyboard([[inlineButton("Back to list", "list:page:0")]]),
  });
});

async function showList(ctx: Ctx, page: number): Promise<void> {
  const items = await listFeedback(50);
  if (items.length === 0) {
    await ctx.reply("No feedback yet.", {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }

  const { pageItems, totalPages, page: actualPage, controls } = paginate(items, {
    page,
    perPage: PER_PAGE,
    callbackPrefix: "list:page",
  });

  const lines = pageItems.map((fb, i) => {
    const num = actualPage * PER_PAGE + i + 1;
    const status = fb.read_flag ? "Read" : "New";
    const anon = fb.anonymous ? "Anonymous" : `User #${fb.submitter_id}`;
    return `${num}. [${status}] ${anon}\n   ${fb.text}`;
  });

  const header = `Feedback entries (${items.length} total, page ${actualPage + 1}/${totalPages}):`;
  const keyboard = inlineKeyboard([
    ...pageItems.map((fb, i) => [
      inlineButton(
        `${actualPage * PER_PAGE + i + 1}. ${fb.read_flag ? "Read" : "New"}`,
        `admin:read:${fb.id}`,
      ),
    ]),
    ...controls.inline_keyboard,
    [inlineButton("Back to menu", "menu:main")],
  ]);

  await ctx.reply(`${header}\n\n${lines.join("\n\n")}`, { reply_markup: keyboard });
}

export default composer;
