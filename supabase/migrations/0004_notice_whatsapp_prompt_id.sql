-- Phase 2: "Bot detects approval/rejection replies in the committee group"
-- (ClickUp 86d44wjuc)
--
-- Not in 01-specification.md §4.5's original notices table — needed to correlate
-- an incoming WhatsApp reaction back to the notice it's voting on. The bot posts
-- one preview message per notice to the committee group (spec §5.2); this column
-- holds that message's Baileys key.id so messages.reaction events can look the
-- notice back up. Nullable: a notice approved purely via the Resend email link
-- never gets a WhatsApp prompt.

alter table public.notices
  add column if not exists whatsapp_prompt_message_id text;

create unique index if not exists notices_whatsapp_prompt_message_id_uidx
  on public.notices (whatsapp_prompt_message_id)
  where whatsapp_prompt_message_id is not null;
