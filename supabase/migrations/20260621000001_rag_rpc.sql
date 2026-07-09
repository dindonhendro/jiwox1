-- RPC function to query RAG chunks based on cosine similarity
create or replace function match_rag_chunks (
  query_embedding vector(1536),
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
