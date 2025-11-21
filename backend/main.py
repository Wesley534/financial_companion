# backend/main.py (Updated to include Budget Router)

from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware 

# Absolute Imports
from routers import auth, transaction, shopping, goal, monthend, ai
from routers import budget # <-- ADDED IMPORT
from database import engine 


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print(f"Connecting to database at {engine.url.render_as_string(hide_password=True)}")
    yield
    # Shutdown logic
    print("Application shutdown complete.")


app = FastAPI(title="SmartBudget API", lifespan=lifespan)

# --- CORS MIDDLEWARE CONFIGURATION (Must be at the top) ---
origins = [
    "http://localhost:5173", # Frontend Development URL
    "http://127.0.0.1:5173", 
    "https://financialcompanion.netlify.app",  # <-- Add this

]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],    
    allow_headers=["*"],    
)
# -------------------------------------

# --- Include Routers ---
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(budget.router, prefix="/budget", tags=["Budget"]) # <-- ADDED ROUTER
app.include_router(transaction.router, prefix="/transactions", tags=["Transactions"])
app.include_router(shopping.router, prefix="/shopping", tags=["Shopping"])
app.include_router(goal.router, prefix="/goals", tags=["Goals"])
app.include_router(monthend.router, prefix="/monthend", tags=["Month End"])
app.include_router(ai.router, prefix="/ai", tags=["AI Insights"])

# Temporary Root Endpoint
@app.get("/")
def read_root():
    return {"message": "SmartBudget API is running successfully!"}