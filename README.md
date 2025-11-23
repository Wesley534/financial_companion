
# Financial Companion

Financial Companion is a personal finance web application with a Python/FastAPI backend and a TypeScript + Vite frontend. It helps you track transactions, budgets, savings goals, shopping lists, and provides monthly reports and simple AI helpers.

## Features
- User authentication
- Create/edit transactions and budgets
- Savings and goal tracking
- Shopping lists with checkout flow
- Monthly reports and month-end closeout tools
- Basic AI-powered helpers (backend AI utilities)

## Tech stack
- Backend: Python (FastAPI), SQL database (Alembic migrations present), SQLAlchemy models
- Frontend: TypeScript, Vite, React
- Dev tooling: Alembic for migrations, npm/yarn for frontend

## Quickstart (development)
These steps assume you have Python 3.10+ and Node.js (16+) installed.

1) Backend

	 - Create and activate a virtual environment

		 python3 -m venv .venv
		 source .venv/bin/activate

	 - Install backend dependencies

		 pip install -r backend/requirements.txt

	 - Configure environment variables

		 Copy or create a configuration according to `backend/config.py` (for example DATABASE_URL). If you use a .env file, make sure the app loads it in your environment.

	 - Run database migrations

		 cd backend
		 alembic upgrade head

	 - Start the backend (development)

		 # from repo root
		 cd backend
		 # you can use the included start script or run uvicorn directly
		 ./start.sh
		 # or
		 uvicorn main:app --reload --host 0.0.0.0 --port 8000

2) Frontend

	 - Install dependencies and run the dev server

		 cd frontend
		 npm install
		 npm run dev

	 - The frontend dev server (Vite) typically runs on http://localhost:5173 and will proxy API requests to the backend in development if configured.

3) Accessing the app locally

	 - Backend API: http://localhost:8000 (or whichever host/port you started it on)
	 - Frontend (Vite): http://localhost:5173

## Running production / build
- Frontend: `cd frontend && npm run build` then serve the `dist` folder using your static host of choice.
- Backend: containerize or run with a production ASGI server (e.g., uvicorn/gunicorn + uvicorn workers) and ensure environment variables and database are configured.

## Deployments / Live URL
Replace the placeholder below with the actual URL once deployed.

Live instance: https://financialcompanion.netlify.app/

If you want me to insert the real link, paste the URL here and I'll update the README.

## Project layout (high-level)
- `/backend` — FastAPI app, models, routers, Alembic migrations, and start script.
- `/frontend` — Vite + React frontend app.

## Notes & troubleshooting
- If migrations fail, confirm `DATABASE_URL` is set and reachable.
- Use the `backend/start.sh` script for a simple dev start; it may include env loading or other convenience wrappers.

## Contributing
- Open issues or PRs against the `dev` branch. Add tests for backend logic where possible.

## License & contact
Add your license here (e.g., MIT) and contact info or repo owner link.

