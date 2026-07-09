-- Drop the existing match function since it depends on vector(1536)
drop function if exists public.match_rag_chunks(vector(1536), float, int);

-- Alter the column type to vector(384)
alter table public.rag_chunks drop column if exists embedding;
alter table public.rag_chunks add column embedding vector(384);

-- Recreate the match function with vector(384)
create or replace function public.match_rag_chunks (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    rag_chunks.id,
    rag_chunks.document_id,
    rag_chunks.content,
    1 - (rag_chunks.embedding <=> query_embedding) as similarity
  from rag_chunks
  where 1 - (rag_chunks.embedding <=> query_embedding) > match_threshold
  order by rag_chunks.embedding <=> query_embedding asc
  limit match_count;
$$;
