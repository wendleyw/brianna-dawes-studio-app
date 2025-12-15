-- Restore feedback notification trigger (deliverable_feedback → notify_new_feedback).
--
-- The function `public.notify_new_feedback()` exists, but the trigger can be missing,
-- which results in no `feedback_received` notifications being generated.

drop trigger if exists notify_on_new_feedback on public.deliverable_feedback;

create trigger notify_on_new_feedback
  after insert on public.deliverable_feedback
  for each row
  execute function public.notify_new_feedback();

