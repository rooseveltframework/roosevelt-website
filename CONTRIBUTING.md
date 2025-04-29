# How to contribute

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
