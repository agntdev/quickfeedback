import { Composer, InputFile } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { listFeedback, isAdmin } from "../storage.js";

const composer = new Composer<Ctx>();

composer.command("export", async (ctx) => {
  if (!ctx.from?.id || !(await isAdmin(ctx.from.id))) {
    await ctx.reply("This command is for admins only.");
    return;
  }
  await doExport(ctx);
});

composer.callbackQuery("admin:export", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from?.id || !(await isAdmin(ctx.from.id))) return;
  await doExport(ctx);
});

async function doExport(ctx: Ctx): Promise<void> {
  const items = await listFeedback(500);
  if (items.length === 0) {
    await ctx.reply("No feedback to export.", {
      reply_markup: inlineKeyboard([[inlineButton("Back to menu", "menu:main")]]),
    });
    return;
  }

  const header = "ID,Timestamp,Anonymous,Submitter,Read,Tags,Text";
  const rows = items.map((fb) => {
    const ts = new Date(fb.timestamp).toISOString();
    const submitter = fb.anonymous ? "" : String(fb.submitter_id ?? "");
    const tags = fb.tags.join(";");
    const escapedText = `"${fb.text.replace(/"/g, '""')}"`;
    return `${fb.id},${ts},${fb.anonymous},${submitter},${fb.read_flag},"${tags}",${escapedText}`;
  });

  const csv = `${header}\n${rows.join("\n")}`;
  const buffer = Buffer.from(csv, "utf-8");

  await ctx.replyWithDocument(
    new InputFile(buffer, "feedback_export.csv"),
    { caption: `Exported ${items.length} feedback entries.` },
  );
}

export default composer;
