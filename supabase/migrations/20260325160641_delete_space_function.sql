CREATE OR REPLACE FUNCTION delete_space(p_space_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM spaces WHERE id = p_space_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not the owner of this space';
  END IF;

  DELETE FROM space_finance_snapshots WHERE space_id = p_space_id;
  DELETE FROM space_task_snapshots WHERE space_id = p_space_id;
  DELETE FROM space_members WHERE space_id = p_space_id;
  DELETE FROM spaces WHERE id = p_space_id;
END;
$$;
