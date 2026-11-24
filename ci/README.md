# CI workflow

GitHub blocks pushes that create or update files under `.github/workflows/` unless the
token has the `workflow` scope.

The workflow is kept here so it is not lost. To enable CI:

1. Copy `github-actions-ci.yml` to `.github/workflows/ci.yml` in the repository.
2. Commit and push with a token that has the `workflow` scope, or add the file through the
   GitHub web UI.

Do not grant the `workflow` scope to a token that does not need it.
