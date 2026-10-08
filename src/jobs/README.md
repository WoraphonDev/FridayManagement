# In-process jobs

Reminder/retention/session cleanup will use the shared repository transaction ports.
No timers, background writes or sample-data jobs start in the T-005 scaffold.
Durable coordination/maintenance/retry policies are implemented in their owning tasks.

T-010 supplies a callable bounded idempotency cleanup job (100 expired keys per tick).
It uses DB transactions and the exact UTC expiry comparator; T-050 owns scheduler wiring.
Importing it starts no timers; source-stage application remains not ready.
