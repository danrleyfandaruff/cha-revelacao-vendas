# Owner reservation management

1. Apply `20260927_owner_reservation_management.sql` in the Supabase SQL Editor after the event-history migration (`20260919_event_types_and_history.sql`). The script is transactional, repeatable and does not change existing records.
2. Publish the frontend only after the SQL succeeds. It calls the new `delete_event_entry` RPC using the owner's authenticated session, never a service key.
3. On a test event, cancel the confirmation modal and verify nothing changes. Confirm deletion of one reservation and verify one unit becomes available. Delete an item and verify only its linked reservations disappear. Attendance confirmations must remain.

Expired/archived events remain read-only. Item deletion verifies the reservation count shown in the modal; if the count changed, the owner must refresh and confirm again. Guests receive no automatic notification.

Validation: `npm test`, `npx playwright test`, `npm run build`. E2E requests use mocks and cannot delete production data.

Rollback: redeploy the previous frontend. The unused RPC can remain safely, or be removed with `drop function public.delete_event_entry(uuid, uuid, text, integer);`. Deleted records cannot be restored by rolling back code.
