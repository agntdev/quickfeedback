import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import {
  isAdmin,
  getAdminSettings,
  saveAdminSettings,
  getAdminIds,
  addAdmin,
} from "../storage.js";

const composer = new Composer<Ctx>();

composer.command("settings", async (ctx) => {
  if (!ctx.from?.id || !(await isAdmin(ctx.from.id))) {
    await ctx.reply("This command is for admins only.");
    return;
  }
  await showSettings(ctx);
});

composer.callbackQuery("settings:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from?.id || !(await isAdmin(ctx.from.id))) return;
  await showSettings(ctx);
});

composer.callbackQuery("settings:toggle_notif", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from?.id) return;
  const settings = await getAdminSettings(ctx.from.id);
  if (!settings) return;
  settings.notifications_enabled = !settings.notifications_enabled;
  await saveAdminSettings(settings);
  await showSettings(ctx);
});

composer.callbackQuery("settings:toggle_summary", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from?.id) return;
  const settings = await getAdminSettings(ctx.from.id);
  if (!settings) return;
  settings.daily_summary_enabled = !settings.daily_summary_enabled;
  await saveAdminSettings(settings);
  await showSettings(ctx);
});

composer.callbackQuery("settings:set_retention:30", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from?.id) return;
  const settings = await getAdminSettings(ctx.from.id);
  if (!settings) return;
  settings.retention_days = 30;
  await saveAdminSettings(settings);
  await showSettings(ctx);
});

composer.callbackQuery("settings:set_retention:90", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from?.id) return;
  const settings = await getAdminSettings(ctx.from.id);
  if (!settings) return;
  settings.retention_days = 90;
  await saveAdminSettings(settings);
  await showSettings(ctx);
});

composer.callbackQuery("settings:set_retention:365", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.from?.id) return;
  const settings = await getAdminSettings(ctx.from.id);
  if (!settings) return;
  settings.retention_days = 365;
  await saveAdminSettings(settings);
  await showSettings(ctx);
});

async function showSettings(ctx: Ctx): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  let settings = await getAdminSettings(userId);
  if (!settings) {
    settings = {
      telegram_id: userId,
      notifications_enabled: true,
      daily_summary_enabled: false,
      retention_days: 90,
    };
    await saveAdminSettings(settings);
  }

  const adminIds = await getAdminIds();
  const notifLabel = settings.notifications_enabled ? "On" : "Off";
  const summaryLabel = settings.daily_summary_enabled ? "On" : "Off";

  const text =
    `Admin settings:\n\n` +
    `Notifications: ${notifLabel}\n` +
    `Daily summary: ${summaryLabel}\n` +
    `Retention: ${settings.retention_days} days\n` +
    `Admins: ${adminIds.length}`;

  const keyboard = inlineKeyboard([
    [inlineButton(`Notifications: ${notifLabel}`, "settings:toggle_notif")],
    [inlineButton(`Daily summary: ${summaryLabel}`, "settings:toggle_summary")],
    [
      inlineButton("30 days", "settings:set_retention:30"),
      inlineButton("90 days", "settings:set_retention:90"),
      inlineButton("1 year", "settings:set_retention:365"),
    ],
    [inlineButton("Back to menu", "menu:main")],
  ]);

  await ctx.reply(text, { reply_markup: keyboard });
}

export default composer;
