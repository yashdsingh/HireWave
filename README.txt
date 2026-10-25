HireWave - updated full app bundle

full-stack/          React frontend + Flask backend, including the new real public web
                     candidate search workflow. See full-stack/README.md for setup,
                     required BRAVE_SEARCH_API_KEY configuration, and known limitations.
web-app/             Original standalone mobile prototype; remains separate from the
                     real search workflow in full-stack/frontend.
data/                Demo jobs and candidate data for the original prototype.

The live sourcing flow is Job Intake -> Ranked Slate in full-stack/frontend. Search
requires a configured Brave Search API key on the backend. Other areas of the prototype
still contain demo data. No candidate search results are invented when search is not
configured or fails.

From the repository root, run `npm run dev`. The root script forwards the command to
`full-stack/frontend`, where the frontend dependencies are installed.
