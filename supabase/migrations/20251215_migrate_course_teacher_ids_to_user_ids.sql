BEGIN;

UPDATE public.courses c
SET teacher_ids = s.new_teacher_ids
FROM (
  SELECT
    c2.id,
    COALESCE(
      array_agg(COALESCE(t.user_id, u.elem) ORDER BY u.ord),
      '{}'::uuid[]
    ) AS new_teacher_ids
  FROM public.courses c2
  LEFT JOIN LATERAL unnest(c2.teacher_ids) WITH ORDINALITY AS u(elem, ord) ON TRUE
  LEFT JOIN public.teachers t ON t.id = u.elem
  GROUP BY c2.id
) s
WHERE c.id = s.id
  AND c.teacher_ids IS NOT NULL
  AND c.teacher_ids <> s.new_teacher_ids;

UPDATE public.courses c
SET co_host_ids = s.new_co_host_ids
FROM (
  SELECT
    c2.id,
    COALESCE(
      array_agg(COALESCE(t.user_id, u.elem) ORDER BY u.ord),
      '{}'::uuid[]
    ) AS new_co_host_ids
  FROM public.courses c2
  LEFT JOIN LATERAL unnest(c2.co_host_ids) WITH ORDINALITY AS u(elem, ord) ON TRUE
  LEFT JOIN public.teachers t ON t.id = u.elem
  GROUP BY c2.id
) s
WHERE c.id = s.id
  AND c.co_host_ids IS NOT NULL
  AND c.co_host_ids <> s.new_co_host_ids;

COMMIT;
