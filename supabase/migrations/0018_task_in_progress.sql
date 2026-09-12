alter type public.task_status add value 'in_progress' after 'pending';

alter table public.tasks add column started_at timestamptz;
alter table public.tasks add column started_by uuid references public.profiles (id);

comment on column public.tasks.started_at is
  'When Staff/Owner tapped "Start" — set by start_task(). Null if the '
  'task went straight from pending to done without an explicit start.';
comment on column public.tasks.started_by is
  'Who tapped "Start" — set by start_task().';

create function public.start_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
begin
  if public.current_user_role() not in ('owner', 'staff') then
    raise exception 'Only Owner or Staff can update tasks.';
  end if;

  select * into v_task from public.tasks where id = p_task_id;

  if v_task.id is null then
    raise exception 'Task not found.';
  end if;

  if v_task.status <> 'pending' then
    raise exception 'This task is already marked %.', v_task.status;
  end if;

  update public.tasks
  set status = 'in_progress', started_at = now(), started_by = auth.uid()
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;

comment on function public.start_task is
  'Marks a pending task in_progress — Staff taps this on arrival, before '
  'cleaning/driving actually begins.';

create or replace function public.complete_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
begin
  if public.current_user_role() not in ('owner', 'staff') then
    raise exception 'Only Owner or Staff can update tasks.';
  end if;

  select * into v_task from public.tasks where id = p_task_id;

  if v_task.id is null then
    raise exception 'Task not found.';
  end if;

  if v_task.status = 'done' then
    raise exception 'This task is already marked done.';
  end if;

  update public.tasks
  set status = 'done', completed_at = now(), completed_by = auth.uid()
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;

create or replace function public.reopen_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
begin
  if public.current_user_role() not in ('owner', 'staff') then
    raise exception 'Only Owner or Staff can update tasks.';
  end if;

  select * into v_task from public.tasks where id = p_task_id;

  if v_task.id is null then
    raise exception 'Task not found.';
  end if;

  if v_task.status <> 'done' then
    raise exception 'This task is not marked done.';
  end if;

  update public.tasks
  set status = 'pending',
      completed_at = null, completed_by = null,
      started_at = null, started_by = null
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;

comment on function public.complete_task is
  'Marks a pending OR in_progress task done. Both roles may call this — '
  'the Owner can pitch in on cleaning/driving too, and may need to '
  'correct a mistake.';
comment on function public.reopen_task is
  'Undoes an accidental "mark done" tap — full reset to pending, '
  'clearing both start and completion records. Same access as '
  'complete_task().';
