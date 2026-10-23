# Repository Guidelines

## Project Structure & Module Organization

The repository is a single frontend application in `frontend/`. React and TypeScript source lives in `frontend/src/`: reusable views and dialogs are in `components/`, shared data structures in `types/`, and signal utilities in `utils/`. Static files belong in `frontend/public/`; Vite and TypeScript configuration are in the frontend root. Keep new features near the component or utility they extend.

## Build, Test, and Development Commands

Run commands from `frontend/`:

- `npm install` installs the application dependencies.
- `npm run dev` starts the Vite development server on port 3000.
- `npm run lint` runs `tsc --noEmit` for TypeScript validation.
- `npm run build` creates the production bundle in `frontend/dist/`.
- `npm run preview` serves the production bundle locally after building.

The project currently has no test script. Run `npm run lint` and `npm run build` before submitting changes.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Follow the existing two-space indentation and keep imports grouped with external packages before local modules. Use PascalCase for component files and component names (for example, `DataUploadModal.tsx`), camelCase for functions and variables, and descriptive types in `src/types/`. Prefer the existing utility modules for shared signal processing and sound behavior rather than duplicating logic.

## Testing Guidelines

There is no configured unit-test framework or coverage threshold. For behavior changes, validate the affected flow in the running app and check TypeScript/build output with the commands above. If adding tests, colocate them with the relevant module or use a clearly named `tests/` directory and document the runner.

## Commit & Pull Request Guidelines

Use concise imperative commit subjects, such as `Add batch signal export`. Pull requests should summarize the user-visible change, note relevant validation commands, link any related issue, and include screenshots for UI changes. Keep each change focused and call out any new configuration requirements.

## Security & Configuration

Keep secrets out of source control. Use `frontend/.env.local` for local values based on `frontend/.env.example`; treat `GEMINI_API_KEY` as secret and never expose it in client-side logs or committed files.
