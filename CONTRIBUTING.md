# Contributing to TaskForge

Use one focused pull request per feature or fix. Explain behavior changes, include relevant regression coverage, and list validation results. If a PR depends on another branch, name its prerequisite and merge the stack in order.

## Automatic labels

After the classification workflow reaches the default branch, new or updated PRs receive labels based on their declared type and changed files. Check every applicable type in the PR template, or use a conventional title such as `fix(auth): redact password hashes`, `feat(tasks): add due dates`, `docs: explain local setup`, or `ci: improve checks`.

The classifier supports `bug`, `enhancement`, `documentation`, `testing`, `backend`, `frontend`, `database`, `ci`, `automation`, `configuration`, `authentication`, `authorization`, `multi-tenancy`, `security`, `accessibility`, `performance`, `dependencies`, and `ui/ux`. It adds relevant labels and preserves existing labels. Areas come from file paths; security, tenancy, accessibility, and performance labels can also come from explicit title keywords. Type declarations are read only from the template's Type section. Labels are a starting point for maintainer review, not a guarantee that a change is secure or correct.

Bug-report and feature-request issue forms apply their type labels automatically. Priority, difficulty, `good first issue`, duplicate, and invalid labels require maintainer judgment and are never guessed.

Run the classifier tests from the repository root:

```sh
node --test .github/scripts/contribution-labels.test.cjs
```

The labeling job checks out only the trusted default branch with credential persistence disabled. PR titles, bodies, and paths are processed as data; it does not execute contributor code.

## Add work to a GitHub Project automatically

Use the Project's built-in auto-add workflow so no personal access token needs to be stored in repository secrets:

1. Open the target GitHub Project, then choose **Workflows → Auto-add to project → Edit**.
2. Select `ManojLamani/Multi-Tenant-Project-Management-SaaS`.
3. Set the filter to `is:open` to include open issues and pull requests, or `is:pr is:open` for PRs only.
4. Choose **Save and turn on workflow**.

GitHub does not backfill existing items merely because auto-add is enabled; add existing PRs once. Show Labels as a board field or group/filter by labels to distinguish bugs, enhancements, security, and other areas. Enable the Project's built-in item-closed/PR-merged workflows if you want its Status field to move to Done automatically.

See GitHub's documentation: https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/adding-items-automatically

Project membership and labels organize work; they do not merge pull requests or publish application code.
