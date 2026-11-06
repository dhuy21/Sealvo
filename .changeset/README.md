# Changesets

This folder holds [Changesets](https://github.com/changesets/changesets) markdown files. Each file records which workspace package changed and whether the bump is a patch, minor, or major. The CLI config is `.changeset/config.json`.

Sealvo does not publish these packages. `@sealvo/api`, `@sealvo/web`, and `@sealvo/shared` are `"private": true`, and `access` is `restricted`. Production ships Docker images from `main` through GitHub Actions. CI does not run `changeset version` or `changeset publish`.

`baseBranch` is `main`. `commit` is `false`, so versioning edits `package.json` and changelogs in the working tree and leaves the git commit to you. `updateInternalDependencies` is `patch`: when a package is bumped, dependents inside the repo get a patch bump. `fixed`, `linked`, and `ignore` are empty.

## Commands

From the repo root:

- `npm run changeset` asks for the packages and the bump, then writes a new file here. Commit that file with the change.
- `npm run version-packages` consumes the files, bumps versions, and updates the GitHub changelogs. Review the diff and commit it.
- `npm run release` builds the repo, then runs `changeset publish`. There is nothing to publish while every package stays private.

Do not add a changeset for a change that does not ship in a package (workflow, Terraform, docs).
