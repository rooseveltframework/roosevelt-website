# How to do content updates

- `npm i`
- `npm run build`: This will likely produce a large diff. That is normal.
- Open a pull request called "content update" or similar.
- Once merged, GitHub will automatically deploy the changes to the website.

# How to make code contributions to the static site generator codebase

## Before opening a pull request

- Add your changes to `CHANGELOG.md`.

## Release process

If you are a maintainer of this project, please follow the following release procedure:

- Merge all desired pull requests into main.
- Bump `package.json` to a new version and run `npm i` to generate a new `package-lock.json`.
- Alter CHANGELOG "Next version" section and stamp it with the new version.
- Paste contents of CHANGELOG into new version commit.
- Delete the public folder.
- Generate a new production build: `npm run p`.
- Open and merge a pull request with those changes.
- Tag the merge commit as the a new release version number.
