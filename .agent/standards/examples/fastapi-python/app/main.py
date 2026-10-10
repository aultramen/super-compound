from fastapi import FastAPI

from app.api.greeting import router

app = FastAPI()
app.include_router(router)
