# Khan Family Groceries

A shared family grocery list. Anyone with the link can add items, tick them off while shopping, and re-add regulars from "Buy again". Items are sorted into store sections automatically.

Runs on Render as a free Node web service with a free Render Postgres database (see `render.yaml`).

Note: Render's free Postgres database expires 30 days after it's created. Upgrade it to a paid plan in the Render dashboard before then to keep the list.

Run locally without a database: `node server.js` (changes are kept in memory only).
