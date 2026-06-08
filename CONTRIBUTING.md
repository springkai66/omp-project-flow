# Contributing

Thanks for helping improve `omp-project-flow`.

## Development

Install dependencies:

```powershell
bun install
```

Run checks:

```powershell
bun run check
bun test
```

Install the local plugin into Oh My Pi:

```powershell
powershell -ExecutionPolicy Bypass -File ".\scripts\install-local.ps1" -Force
```

Verify the local Oh My Pi plugin install:

```powershell
omp plugin doctor
omp plugin list
```

## Runtime State

Project workflow state is written under the target project's `.project-flow/` directory. Do not commit generated `.project-flow/` runtime data.

## Pull Requests

- Keep changes scoped.
- Add or update tests for behavior changes.
- Update `README.md` and `CHANGELOG.md` when user-facing behavior changes.
- Run `bun run check` and `bun test` before submitting.
