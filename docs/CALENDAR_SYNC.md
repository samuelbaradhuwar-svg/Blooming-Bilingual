# Unified availability: Preply, Google Calendar and the website

This explains how The Blooming Bilingual and Preply share one set of available times, what has to be set up by hand, and what the limits are.

## The idea in one picture

```
 Preply lesson  ──(Preply writes it into)──▶  Google Calendar  ──(read every 2 minutes)──▶  Website: that time disappears
 Website lesson ──(website writes it into)──▶  Google Calendar  ──(Preply reads busy time)──▶  Preply: that time is blocked
 Anything Neeliën adds by hand ─────────────▶  Google Calendar  ──▶  blocks the website (and Preply)
```

Google Calendar is the meeting point. The two platforms never talk to each other directly (Preply offers no way to do that, see below).

## What Preply actually supports (researched, not assumed)

I could not open Preply's help pages directly from the build environment, so the facts below come from search excerpts of Preply's own help articles. **Neeliën should confirm the two settings in her own Preply account** (steps below), because Preply changes its menus.

| Question | Finding |
|---|---|
| Google Calendar connection? | **Yes.** Preply connects to Google Calendar and Outlook. It is set up in Preply's Settings → Calendar. |
| Do Preply lessons appear in Google Calendar? | **Yes.** Preply's help says booking a lesson adds an event, rescheduling updates it and cancelling removes it. |
| Do Google Calendar events block Preply availability? | **Reported yes**, for events marked as busy. An older Preply help article says syncing keeps availability up to date and reserves busy times automatically. Not confirmed on the current settings screen, so it must be checked and tested (step 3 below). |
| Public API or webhooks for tutors? | **None found.** Searches only turned up unofficial scrapers, which this project does not use. |
| Can third-party tools receive Preply bookings? | **Not directly.** A scheduling vendor's own forum reply says it cannot integrate with Preply. Only the Google Calendar route is supported. |
| Cancellations and reschedules? | Detectable **through the calendar**, because Preply updates or removes the event. There is no other feed. |
| Known caveat | Preply says calendar sync in its mobile app can fail and should be double-checked on desktop. |

One thing to watch: one Preply help article describes that adding an outside appointment to the connected calendar can cause a Preply lesson at the same time to be cancelled automatically. This is why the system tries so hard to catch clashes early (below). Worth asking Preply support how it behaves.

Sources: [Preply: how to use Preply Calendar and connect Google Calendar](https://help.preply.com/en/articles/4175340-how-to-use-preply-calendar-and-connect-google-calendar), [Preply: how do I connect Google Calendar or Outlook](https://help.preply.com/en/articles/16760886-how-do-i-connect-google-calendar-or-outlook-to-preply), [Preply: setting up your availability](https://help.preply.com/en/articles/4175356-6-setting-up-your-availability), [Preply: managing your calendar in the app](https://help.preply.com/en/articles/6080094-how-to-manage-your-calendar-in-preply-app).

## What was built

**Database (`supabase/migrations/20261018000000_calendar_sync.sql`)**
- `external_busy`: every busy event from Neeliën's Google Calendar that did not come from the website (Preply lessons, personal appointments, anything manual).
- `get_available_slots` now hides a time if it overlaps a website lesson **or** an external event. `book_lesson`, `reschedule_booking` and the tutor's own booking all use this, so the check happens on the server, never only on the page.
- The existing database rule that makes two overlapping lessons impossible is unchanged. It is what guarantees that two students clicking the same slot at the same moment cannot both succeed.
- `booking_conflicts`: when a Preply event lands on a time already booked on the website, it is **flagged for Neeliën** instead of cancelling or moving either side.
- `booking_audit`: who booked, moved or cancelled each lesson, and when. Credits already have their own permanent ledger, and a credit is only ever returned by the existing cancellation rules, so nothing is refunded or charged twice.
- `calendar_sync_log`: the plain-language activity feed on the Calendar sync page.
- Safe by default: nothing changes for students until the first successful calendar check.

**Calendar sync function (`supabase/functions/calendar-sync`)**
- Runs every 2 minutes (a scheduled database job). It uses Google's incremental sync, so a normal check is one small request that returns only what changed. A full read happens once a day and after any problem.
- Retries temporary failures (rate limits, Google errors, network) with increasing waits, and never changes anything unless Google's answer arrived completely.
- Google credentials stay on the server. Nothing secret is in the website code.

**Website to Google Calendar (`supabase/functions/google-meet`, hardened)**
- Each lesson event is tagged as the website's own, so it is never mistaken for a Preply lesson, and it is marked **Busy**, which is what makes Preply avoid it.
- A lesson that is moved updates the **same** event (never a second one). A lesson deleted by hand in Google Calendar is put back. A cancelled lesson's event is removed, which frees the time for Preply.
- Any failed calendar update is recorded, shown to Neeliën, and retried every 5 minutes.

**Neeliën's page: Calendar sync** (new item in her menu, plus an alert on her dashboard)
- Plain status: working, having trouble, or booking paused.
- Last successful check, upcoming Preply and other events, upcoming website lessons and whether each reached Google Calendar, clashes, failed updates, recent activity, and a **Check now** button.

## If the calendar can't be checked

If there has been no successful check for 15 minutes, the website stops offering lesson times and tells students that booking is paused for a few minutes. It never shows times it can't vouch for. It recovers on its own as soon as a check succeeds, and Neeliën sees a red warning explaining why.

## Setup, in order

1. **Run the database update:** `supabase/migrations/20261018000000_calendar_sync.sql` in the Supabase SQL Editor.
2. **Deploy the two Edge Functions:** `calendar-sync` (new; *Verify JWT* off) and the updated `google-meet` (currently deployed under the name `clever-responder`). Run step 1 first.
3. **Neeliën, in Preply:** Settings → Calendar → connect the **same Google account** that is connected on the website. Then, in Preply's calendar settings, turn on the option that lets Google Calendar events **block your availability**.
4. **Test it together** (takes five minutes):
   - Add a 50-minute **Busy** event in Google Calendar at a time the booking page offers. Within about 2 minutes that time disappears from the booking page.
   - Book a test lesson on the website. Check that Preply no longer offers that time to students.
   - Delete the test event and cancel the test lesson, and check the times come back on both sides.

Step 4 is the only way to prove the Preply half works, because it depends on Preply's own settings and I can't operate Neeliën's Preply account.

## Limits worth knowing

- **Not instant.** A Preply booking reaches the website within about 2 minutes, not immediately. If a student books the same time on the website inside that window, both lessons exist and the clash is flagged for Neeliën to resolve, nothing is silently overwritten. Google can push changes faster, but only to an address on a domain verified with Google, which the free Supabase address is not. Polling every 2 minutes is the reliable choice.
- **Preply's side depends on Preply.** The website can only make its lessons visible as Busy time in Google Calendar. Whether and how quickly Preply blocks that time is Preply's behaviour.
- **One calendar.** Only Neeliën's main Google Calendar is read. Preply must be connected to that same calendar.
- **Free vs busy.** Events marked *Free*, declined invitations and "working location" markers never block a time. All-day events marked Busy block the whole day, in Johannesburg time.
- **Different Google account.** If Neeliën reconnects Google with a new account, the first check afterwards re-reads everything.
- **Not covered.** Preply's own trial-lesson rules, and any booking that Preply never writes to the calendar.

## Troubleshooting (for Neeliën)

| You see | What it means | What to do |
|---|---|---|
| Green: "Everything is working" | All good. | Nothing. |
| Orange: last check didn't go through | A temporary problem. | Nothing, it retries every 2 minutes. |
| Red: "Booking is paused" | Calendar unreachable for 15+ minutes. | Press **Check now**. If it says to reconnect, use *Hours & leave* to reconnect Google. |
| "A double booking" | A Preply lesson and a website lesson overlap. | Move or cancel one of them (a student is notified when you cancel), then it clears itself. Or press *I have sorted this*. |
| "Not in your Google Calendar yet" | A calendar update failed. | It retries every 5 minutes; **Try again now** forces it. |

## Verified results (18 October 2026)

Tested against the live database and the live Google Calendar of the connected account.

| Scenario | How it was tested | Result |
|---|---|---|
| 1. Preply booking blocks the website | A real busy event was added to Google Calendar | Website noticed it after about 45 seconds, labelled it a Preply lesson and stopped offering that slot |
| 2. Website booking reaches Google Calendar | A real lesson was booked on a student account | Event created within seconds with Meet link and "busy" status; the sync did not mistake it for an outside event and raised no false clash |
| 3. Simultaneous bookings | Two separate database connections took overlapping slots at the same moment | The second was held waiting for 10 seconds, then refused once the first committed. Only one booking exists |
| 4. Clash with an existing website lesson | Database scenario with a Preply-style event | Flagged for the tutor once, nothing cancelled, no duplicate flags |
| 5. Cancellation releases the slot | The real Google event was deleted | Slot offered again at the next check; release logged |
| 6. Rescheduling | Database scenarios (Preply move, website move, calendar-side move, calendar-side delete) | Old time released, new time blocked, no duplicates; moved or deleted website events flagged, never overwritten |
| 7. Google Calendar unavailable | Sync logic against a fake failing Google (retries, bad answers, expired bookmark) and database pause rules | Failures retried and recorded, nothing half-applied, booking pauses after 15 minutes without a good check and recovers by itself |

Also checked: cancelling a website lesson removed its Google event and cleared its record, the audit trail read "created, then cancelled", and no credit moved. Students and signed-out visitors cannot read or write any calendar data.

**Not testable from here:** that Preply itself blocks and releases times based on Google Calendar. That depends on Neeliën's Preply settings (setup step 3).
