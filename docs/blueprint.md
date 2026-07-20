# FeedbackBot — Bot specification

**Archetype:** support

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot that allows users to submit short text-only feedback anonymously or with their identity. Admins receive notifications and can manage, tag, and export feedback entries for review.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- service users
- admins

## Success criteria

- Users can submit feedback with a single click or message
- Admins receive real-time notifications of new feedback
- Admins can export feedback data as CSV

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main menu and prompt for feedback submission
- **Send feedback** (button, actor: user, callback: feedback:start) — Initiates the feedback submission flow
  - inputs: text message (300 char limit)
  - outputs: confirmation message
- **/list** (command, actor: admin, command: /list) — Displays a list of recent feedback entries
  - inputs: none
  - outputs: feedback list summary
- **/export** (command, actor: admin, command: /export) — Exports selected feedback entries as CSV
  - inputs: selection criteria
  - outputs: CSV file
- **/settings** (command, actor: admin, command: /settings) — Configures admin settings like notification recipients and daily summary
  - inputs: setting options
  - outputs: updated settings confirmation

## Flows

### Feedback submission
_Trigger:_ button click or /start

1. User opens bot
2. User sees 'Send feedback' button
3. User submits text feedback
4. Bot confirms receipt and anonymization status

_Data touched:_ Feedback

### Admin notification
_Trigger:_ New feedback submission

1. Bot detects new feedback
2. Bot sends notification to admin with inline buttons
3. Admin interacts with inline buttons to manage feedback

_Data touched:_ Feedback

### Admin export
_Trigger:_ /export command

1. Admin selects export command
2. Bot generates CSV file
3. Bot sends CSV to admin

_Data touched:_ Feedback

### Anonymity toggle
_Trigger:_ First-time user interaction

1. Bot detects new user
2. Bot asks about anonymity preference
3. User selects Yes/No
4. Bot stores preference

_Data touched:_ User

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **Feedback** _(retention: persistent)_ — A single feedback submission with metadata
  - fields: text, timestamp, submitter_id (optional), read_flag, tags
- **User** _(retention: persistent)_ — Telegram user who submits feedback (stored only if not anonymous)
  - fields: telegram_id, anonymity_preference
- **Admin** _(retention: persistent)_ — Telegram account with admin privileges
  - fields: telegram_id, notification_settings

## Integrations

- **Telegram** (required) — Bot API messaging and notifications
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Configure admin accounts
- Set daily summary on/off
- Adjust feedback retention period
- Export all feedback data

## Notifications

- Real-time feedback notifications to admin(s)
- Daily summary of feedback (optional)

## Permissions & privacy

- User anonymity toggle
- Feedback data retention policy (90 days default)
- Admin access controls

## Edge cases

- User changes anonymity preference after submitting feedback
- Admin tries to export feedback without selecting entries
- Feedback exceeds 300 character limit

## Required tests

- Verify feedback submission and confirmation flow
- Test admin notification with inline buttons
- Validate CSV export format and content

## Assumptions

- Default retention period is 90 days
- Anonymity preference is non-anonymous by default
- Daily summary is off by default
