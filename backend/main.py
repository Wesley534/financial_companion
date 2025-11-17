from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware # <-- ADDED FOR CORS

# Absolute Imports
from routers import auth
from database import engine 


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print(f"Connecting to database at {engine.url.render_as_string(hide_password=True)}")
    yield
    # Shutdown logic
    print("Application shutdown complete.")


app = FastAPI(title="SmartBudget API", lifespan=lifespan)

# --- CORS MIDDLEWARE CONFIGURATION ---
origins = [
    "http://localhost:5173", # Frontend Development URL
    "http://127.0.0.1:5173", # Frontend Development URL (alternative IP)
    # Future: Add your production PWA domain here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],    
    allow_headers=["*"],    
)
# -------------------------------------


app.include_router(auth.router, prefix="/auth", tags=["Auth"])

# Temporary Root Endpoint
@app.get("/")
def read_root():
    return {"message": "SmartBudget API is running successfully!"}