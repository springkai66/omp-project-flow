# Upstream Sync

Project Flow tracks ECC and OMO as design sources, not code dependencies.

The sync process is intentionally review-first:

1. Check upstream releases, changelogs, or commits.
2. Run `/upstream:status` or `/upstream:report`.
3. Mark reviewed sources with `/upstream:review <source-id> <reference> [note]`.
4. Run `/upstream:sync [note]` when upstream changes should become a tracked Project Flow task.
5. Implement useful ideas in Project Flow's local state model.
6. Run `bun run check`, `bun test`, and `omp plugin doctor`.

Runtime state is stored under `.project-flow/upstreams/`:

```text
.project-flow/upstreams/
  sources.json
  capabilities.json
  sync-report.json
  sync-report.md
```

The report tracks source review status, capability coverage, watch items, and next actions. It does not automatically fetch, execute, or merge upstream code.
